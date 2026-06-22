import type { Card } from '@/domain/card';
import type { StyleConfig } from '@/domain/style';
import { embedJson } from '@/lib/png';
import { loadCardRaster } from './cardRaster';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'card';

// Rasterize a card to PNG and download it, embedding the card descriptor as a
// tEXt chunk for re-import. Uses loadCardRaster so image cards draw a clean
// bitmap (no canvas taint). Browser-only (Image + canvas).
export async function exportCardPng(
  card: Card,
  style: StyleConfig,
  opts: { theme?: 'light' | 'dark'; size?: number } = {},
): Promise<void> {
  const theme = opts.theme ?? 'light';
  const size = opts.size ?? 1000;
  const paper = theme === 'dark' ? '#0f172a' : '#ffffff';

  const r = await loadCardRaster(card, style, { theme, size });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(r.dw));
  canvas.height = Math.max(1, Math.round(r.dh));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas context');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(r.img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('PNG encode failed');

  const c = card.content;
  const meta = {
    v: 1 as const,
    title: card.title,
    style,
    ...(c.kind === 'remedy' || c.kind === 'data' ? { base: c.base, sequence: c.sequence } : {}),
  };
  const bytes = embedJson(new Uint8Array(await blob.arrayBuffer()), 'QRPCard', meta);

  const dlUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  const a = document.createElement('a');
  a.href = dlUrl;
  a.download = `${slugify(card.title)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(dlUrl);
}
