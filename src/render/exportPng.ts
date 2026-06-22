import type { Card } from '@/domain/card';
import type { StyleConfig } from '@/domain/style';
import { embedJson } from '@/lib/png';
import { cardToSvg } from './exportSvg';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'card';

// Rasterize the pure export SVG to a PNG and download it, embedding the card
// descriptor as a tEXt chunk for re-import. Browser-only (Image + canvas).
export async function exportCardPng(
  card: Card,
  style: StyleConfig,
  opts: { theme?: 'light' | 'dark'; size?: number } = {},
): Promise<void> {
  const theme = opts.theme ?? 'light';
  const longest = opts.size ?? 1000;
  const svg = cardToSvg(card, style, { theme });

  const vb = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 400 700';
  const [, , w, h] = vb.split(' ').map(Number) as [number, number, number, number];
  const aspect = w / h;
  const cw = aspect >= 1 ? longest : Math.round(longest * aspect);
  const ch = aspect >= 1 ? Math.round(longest / aspect) : longest;

  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG rasterize failed'));
      img.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D canvas context');
    ctx.drawImage(img, 0, 0, cw, ch);

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
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
