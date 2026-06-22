import type { Card } from '@/domain/card';
import type { StyleConfig } from '@/domain/style';
import { buildCardGeometry } from '@/engine/buildCardGeometry';
import { CELTIC_PATHS, TRISKELION_PATH } from '@/engine/shapes';
import { CX, CY, FULL_BLEED_VIEWBOX } from '@/engine/frame';
import { transitionSeedDiscPath } from '@/engine/transition';
import { resolveCardImage } from '@/lib/assets';

// Pure, React-free SVG string builder for export (PNG/MP4). Inline colors (CSS
// classes don't survive serialization to canvas) and a numeric `rotation` so a
// frame at any angle exports identically — no live-DOM scraping or flushSync.

interface Theme {
  ink: string;
  paper: string;
  secondary: string;
}
const THEMES: Record<'light' | 'dark', Theme> = {
  light: { ink: '#0f172a', paper: '#ffffff', secondary: '#94a3b8' },
  dark: { ink: '#e2e8f0', paper: '#0f172a', secondary: '#94a3b8' },
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const motifPaths = (design: 'celtic' | 'triskelion', fill: string) =>
  design === 'celtic'
    ? CELTIC_PATHS.map((d) => `<path d="${d}" fill="${fill}"/>`).join('')
    : `<path d="${TRISKELION_PATH}" fill="${fill}"/>`;

export interface ExportSvgOptions {
  theme?: 'light' | 'dark';
  rotation?: number;
}

function geometryCardSvg(card: Card, style: StyleConfig, opts: ExportSvgOptions): string {
  const t = THEMES[opts.theme ?? 'light'];
  const rot = opts.rotation ?? 0;
  const c = card.content;
  const hasRate = c.kind === 'remedy' || c.kind === 'data';
  const sequence = hasRate ? c.sequence : [];
  const base = hasRate ? c.base : undefined;
  const geo = buildCardGeometry({ style, sequence, base, title: card.title, description: card.description ?? '' });
  const f = geo.frame;
  const [vx, vy, vw, vh] = geo.viewBox.split(' ').map(Number) as [number, number, number, number];
  const font = (size: number) => `font-family:${style.uiFont};font-size:${size}px`;

  const p: string[] = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${geo.viewBox}" preserveAspectRatio="xMidYMid meet">`);
  p.push(`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${t.paper}"/>`);
  p.push(`<g transform="translate(${CX},${CY}) scale(${geo.overallScale}) translate(${-CX},${-CY})">`);

  if (f.show) {
    const sw = f.strokeWidth;
    p.push(`<g stroke="${t.secondary}" stroke-width="${sw}" fill="none">`);
    p.push(`<rect x="${f.left}" y="${f.top}" width="${f.size}" height="${f.size}"/>`);
    p.push(`<line x1="${CX}" y1="${f.top}" x2="${CX}" y2="${f.top + f.tick}"/>`);
    p.push(`<line x1="${CX}" y1="${f.bottom}" x2="${CX}" y2="${f.bottom - f.tick}"/>`);
    p.push(`<line x1="${f.left}" y1="${CY}" x2="${f.left + f.tick}" y2="${CY}"/>`);
    p.push(`<line x1="${f.right}" y1="${CY}" x2="${f.right - f.tick}" y2="${CY}"/>`);
    if (f.doubleTop) {
      p.push(`<line x1="${f.left}" y1="${f.headerY}" x2="${f.right}" y2="${f.headerY}"/>`);
      if (f.squareHeader) {
        p.push(`<line x1="${f.left}" y1="${f.top}" x2="${f.left}" y2="${f.headerY}"/>`);
        p.push(`<line x1="${f.right}" y1="${f.top}" x2="${f.right}" y2="${f.headerY}"/>`);
      }
    }
    p.push(`</g>`);
    if (f.doubleTop) {
      p.push(`<text x="${CX}" y="${f.titleY}" text-anchor="middle" dominant-baseline="middle" fill="${t.ink}" style="${font(geo.uiFontSize)};font-weight:bold;letter-spacing:.1em">${esc(card.title || 'SEQUENCE')}</text>`);
      if (card.description) {
        p.push(`<text x="${CX}" y="${f.descY}" text-anchor="middle" dominant-baseline="middle" fill="${t.secondary}" style="${font(geo.uiFontSize * 0.7)}">${esc(card.description)}</text>`);
      }
    }
  }

  p.push(`<g transform="translate(${CX},${CY}) scale(${geo.mainScale}) translate(${-CX},${-CY})">`);
  if (geo.hullOuter) p.push(`<path d="${geo.hullOuter}" fill="none" stroke="${t.ink}" stroke-width="${geo.shellStroke}" opacity="0.5"/>`);
  for (const d of geo.lotusPetals) p.push(`<path d="${d}" fill="${t.ink}" opacity="${geo.lobeOpacity}"/>`);
  if (geo.hullInner) {
    const w = geo.lobeType === 'sunflower' ? geo.shellStroke * 1.5 : geo.shellStroke;
    const op = geo.lobeType === 'lotus' ? 0.3 : 1;
    p.push(`<path d="${geo.hullInner}" fill="none" stroke="${t.ink}" stroke-width="${w}" opacity="${op}"/>`);
  }
  for (const lobe of geo.lobes) {
    p.push(`<g transform="translate(${lobe.cx},${lobe.cy})">`);
    if (geo.lobeType === 'sunflower') p.push(`<circle r="${geo.rLobeInnerCircle}" fill="${t.paper}" stroke="${t.ink}" stroke-width="0.8"/>`);
    if (geo.lobeType === 'sunflower' && geo.lobeDesign === 'seeds') {
      p.push(`<g transform="rotate(${rot})"><path d="${lobe.seedPath}" fill="${t.ink}" opacity="${geo.lobeOpacity}"/></g>`);
    } else if (geo.lobeDesign === 'celtic' || geo.lobeDesign === 'triskelion') {
      p.push(`<g transform="rotate(${lobe.angle}) translate(0,${geo.designOffset}) scale(${geo.svgBaseScale * geo.designScale}) translate(-150,-150)" opacity="${geo.lobeOpacity}">${motifPaths(geo.lobeDesign, t.ink)}</g>`);
    }
    p.push(`</g>`);
  }
  p.push(`<g transform="translate(${CX},${CY})" opacity="${geo.centerOpacity}"><g transform="rotate(${rot * 0.5})">`);
  if (geo.centerDesign === 'seeds') p.push(`<path d="${geo.centralSeedsPath}" fill="${t.ink}"/>`);
  else if (geo.centerDesign === 'celtic' || geo.centerDesign === 'triskelion')
    p.push(`<g transform="scale(${geo.centerSvgScale}) translate(-150,-150)">${motifPaths(geo.centerDesign, t.ink)}</g>`);
  p.push(`</g></g>`);
  p.push(`<g stroke="${t.ink}" stroke-width="${geo.stripeStroke}" stroke-linecap="round">`);
  for (const s of geo.stripes) p.push(`<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}"/>`);
  p.push(`</g>`);
  p.push(`<g fill="none" stroke="${t.ink}" stroke-width="${geo.ringStroke}" opacity="0.8">`);
  for (const r of geo.rings) p.push(`<circle cx="${CX}" cy="${CY}" r="${r}"/>`);
  p.push(`</g></g>`);

  if (geo.infoLine.show) {
    p.push(`<g fill="${t.secondary}" style="${font(geo.infoLine.fontSize)}">`);
    p.push(`<text x="${geo.infoLine.left}" y="${geo.infoLine.y}" text-anchor="start" dominant-baseline="middle">${esc(geo.infoLine.baseLabel)}</text>`);
    p.push(`<text x="${geo.infoLine.right}" y="${geo.infoLine.y}" text-anchor="end" dominant-baseline="middle">${esc(geo.infoLine.seqStr)}</text>`);
    p.push(`</g>`);
  }
  p.push(`</g></svg>`);
  return p.join('');
}

function transitionCardSvg(card: Card, opts: ExportSvgOptions): string {
  const t = THEMES[opts.theme ?? 'light'];
  const rot = opts.rotation ?? 0;
  const c = card.content;
  const shape = c.kind === 'transition' ? c.shape : 'sunflower';
  const inner =
    shape === 'sunflower'
      ? `<path d="${transitionSeedDiscPath()}" fill="${t.ink}"/>`
      : `<g transform="translate(-150,-150)">${motifPaths(shape, t.ink)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${FULL_BLEED_VIEWBOX}" preserveAspectRatio="xMidYMid meet"><g transform="translate(${CX},${CY}) rotate(${rot})">${inner}</g></svg>`;
}

function imageCardSvg(card: Card, opts: ExportSvgOptions): string {
  const c = card.content;
  if (c.kind !== 'image') return '';
  const rel = opts.theme === 'dark' && c.dark ? c.dark : c.light;
  // Absolute URL so the nested <image> resolves when the SVG is rasterized.
  const href = new URL(resolveCardImage(rel), document.baseURI).href;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${FULL_BLEED_VIEWBOX}" preserveAspectRatio="xMidYMid meet"><image href="${href}" xlink:href="${href}" x="0" y="-150" width="400" height="700" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function cardToSvg(card: Card, style: StyleConfig, opts: ExportSvgOptions = {}): string {
  if (card.content.kind === 'transition') return transitionCardSvg(card, opts);
  if (card.content.kind === 'image') return imageCardSvg(card, opts);
  return geometryCardSvg(card, style, opts);
}
