import type { VideoCodec, VideoEncodingConfig } from 'mediabunny';
import type { Card } from '@/domain/card';
import type { Sequence } from '@/domain/sequence';
import type { Style, StyleConfig } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { DEFAULT_STYLE_CONFIG } from '@/engine/presets';
import { loadCardRaster, type CardRaster } from './cardRaster';

export interface VideoExportOptions {
  theme?: 'light' | 'dark';
  size?: number;
  /** How many times to repeat the whole sequence (>=1). */
  loops?: number;
  onProgress?: (fraction: number, message: string) => void;
  signal?: AbortSignal;
}

const resolve = (card: Card, stylesById: Map<StyleId, Style>): StyleConfig => {
  const base = stylesById.get(card.styleId)?.config ?? DEFAULT_STYLE_CONFIG;
  return card.overrides ? { ...base, ...card.overrides } : base;
};

// Render a prescription to an MP4. mediabunny/WebCodecs is dynamically imported so
// it's only fetched when a user actually exports. Spin uses a numeric rotation per
// frame (24s/turn CCW) — the same export SVG path as PNG. Card boundaries dissolve
// over the sequence's crossfade duration, matching live playback.
export async function exportSequenceVideo(
  sequence: Sequence,
  stylesById: Map<StyleId, Style>,
  opts: VideoExportOptions = {},
): Promise<Blob> {
  if (sequence.cards.length === 0) throw new Error('No cards to export');

  // Repeat the deck `loops` times into a flat slot list; consecutive slots
  // (including across loop boundaries) crossfade via the same dissolve path.
  const loops = Math.max(1, Math.floor(opts.loops ?? 1));
  const cards: Card[] = [];
  for (let l = 0; l < loops; l++) cards.push(...sequence.cards);

  const size = opts.size ?? 1000;
  const theme = opts.theme ?? 'light';
  const paper = theme === 'dark' ? '#0f172a' : '#ffffff';
  const fps = 30;
  const frameDur = 1 / fps;
  const crossfadeFrames = Math.round((sequence.timing.crossfadeMs / 1000) * fps);

  const framesPer = cards.map((c) => {
    const ms = c.content.kind === 'transition' ? c.content.durationMs : sequence.timing.perCardMs;
    return Math.max(1, Math.round((ms / 1000) * fps));
  });
  const total = framesPer.reduce((a, b) => a + b, 0);

  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, getFirstEncodableVideoCodec, QUALITY_HIGH } =
    await import('mediabunny');

  const codecOrder = ['avc', 'hevc', 'vp9', 'av1', 'vp8'] as VideoCodec[];
  const codec = await getFirstEncodableVideoCodec(codecOrder, { width: size, height: size, bitrate: QUALITY_HIGH });
  if (!codec) throw new Error('No supported video codec — needs a browser with WebCodecs.');

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas context');

  const config: VideoEncodingConfig = {
    codec,
    bitrate: 8_000_000,
    keyFrameInterval: 2,
    latencyMode: 'quality',
    bitrateMode: 'variable',
  };
  const source = new CanvasSource(canvas, config);
  output.addVideoTrack(source, { frameRate: fps, name: 'QRP Sequence' });
  await output.start();

  const drawFit = (r: CardRaster, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.drawImage(r.img, (size - r.dw) / 2, (size - r.dh) / 2, r.dw, r.dh);
    ctx.globalAlpha = 1;
  };

  let ts = 0;
  let elapsed = 0;
  let frameIdx = 0;
  let prev: CardRaster | null = null;
  try {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]!;
      const style = resolve(card, stylesById);
      const cf = Math.min(framesPer[i]!, crossfadeFrames);
      for (let f = 0; f < framesPer[i]!; f++) {
        if (opts.signal?.aborted) {
          await output.cancel();
          throw new Error('Export cancelled');
        }
        const rotation = -(elapsed / 24) * 360; // 24s per full turn, anti-clockwise
        const cur = await loadCardRaster(card, style, { theme, rotation, size });

        ctx.fillStyle = paper;
        ctx.fillRect(0, 0, size, size);
        if (i > 0 && f < cf && prev) {
          drawFit(prev, 1); // outgoing card holds underneath
          drawFit(cur, (f + 1) / cf); // incoming fades in
        } else {
          drawFit(cur, 1);
        }

        await source.add(ts, frameDur);
        ts += frameDur;
        elapsed += frameDur;
        frameIdx++;
        opts.onProgress?.(frameIdx / total, `Rendering frame ${frameIdx}/${total}`);

        if (f === framesPer[i]! - 1) prev = cur; // freeze final frame for the next dissolve
      }
    }
    source.close();
    await output.finalize();
  } catch (err) {
    throw err instanceof Error ? err : new Error('Video export failed');
  }

  const buffer = target.buffer;
  if (!buffer) throw new Error('Video buffer was empty');
  return new Blob([buffer], { type: 'video/mp4' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
