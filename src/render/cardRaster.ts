import type { Card } from '@/domain/card';
import type { StyleConfig } from '@/domain/style';
import { resolveCardImage } from '@/lib/assets';
import { cardToSvg } from './exportSvg';

export interface CardRaster {
  img: HTMLImageElement;
  dw: number;
  dh: number;
}

function loadImage(src: string, crossOrigin?: 'anonymous'): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

// Rasterize a card to an <img> sized to fit a `size`×`size` box. Image cards load
// the bitmap DIRECTLY with crossOrigin='anonymous' (same-origin assets stay
// canvas-clean) instead of via an SVG-wrapped <image>, which would taint the
// canvas and break PNG/MP4 export. Geometry/transition cards use inline SVG with
// no external refs, which is clean.
export async function loadCardRaster(
  card: Card,
  style: StyleConfig,
  opts: { theme: 'light' | 'dark'; rotation?: number; size: number },
): Promise<CardRaster> {
  const { theme, size } = opts;

  if (card.content.kind === 'image') {
    const rel = theme === 'dark' && card.content.dark ? card.content.dark : card.content.light;
    const img = await loadImage(resolveCardImage(rel), 'anonymous');
    const nw = img.naturalWidth || 400;
    const nh = img.naturalHeight || 700;
    const scale = Math.min(size / nw, size / nh);
    return { img, dw: nw * scale, dh: nh * scale };
  }

  const svg = cardToSvg(card, style, { theme, rotation: opts.rotation });
  const vb = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 400 700';
  const [, , w, h] = vb.split(' ').map(Number) as [number, number, number, number];
  const scale = Math.min(size / w, size / h);
  const dw = w * scale;
  const dh = h * scale;
  const sized = svg.replace('<svg ', `<svg width="${dw}" height="${dh}" `);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    return { img, dw, dh };
  } finally {
    URL.revokeObjectURL(url);
  }
}
