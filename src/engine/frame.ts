import type { StyleConfig } from '@/domain/style';

// Single source of truth for the card coordinate space + frame math. The
// prototype duplicated these across QRPGenerator, cardFrame, and the exporter;
// here they live in one place consumed by both the engine and the renderer.

export const CX = 200;
export const CY = 200;
export const FRAME_BASE_SIZE = 370;
// Breathing room between the frame and the card edge, in viewBox units.
export const MARGIN = 12;
export const BASE_LOBE_DIST = 158;
export const R_RING_OUTER = 118; // outer boundary of the data annulus
export const RING_COUNT = 7; // concentric rings (dense field)

// Full-bleed portrait canvas used by frameless / image / transition cards.
export const FULL_BLEED_VIEWBOX = '0 -150 400 700';
export const FULL_BLEED_ASPECT = 400 / 700;

export interface CardFrame {
  viewBox: string;
  aspect: number; // width / height
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The viewBox + aspect that tightly hugs a framed card. Identical math to the
 * prototype's cardFrame: every card type with the same style shares one box, so
 * crossfades between geometry / image / transition cards don't jump.
 */
export function cardFrame(style: Partial<StyleConfig>): CardFrame {
  if (!style.showFrame) return { viewBox: FULL_BLEED_VIEWBOX, aspect: FULL_BLEED_ASPECT };

  const frameScale = style.frameScale ?? 1;
  const overallScale = style.overallScale ?? 1;
  const headerOffset = style.frameHeaderOffset ?? 45;
  const hasHeader = !!style.frameDoubleTop;

  const fHalf = (FRAME_BASE_SIZE * frameScale) / 2;
  const headerHeight = headerOffset * frameScale;

  const effHalf = fHalf * overallScale;
  const effHeader = (hasHeader ? headerHeight : 0) * overallScale;

  const left = CX - effHalf - MARGIN;
  const top = CY - effHalf - effHeader - MARGIN;
  const width = 2 * effHalf + 2 * MARGIN;
  const height = 2 * effHalf + effHeader + 2 * MARGIN;

  return {
    viewBox: `${round(left)} ${round(top)} ${round(width)} ${round(height)}`,
    aspect: width / height,
  };
}
