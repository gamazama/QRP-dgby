import type { StyleConfig } from '@/domain/style';
import {
  createLotusPetals,
  createMandalaHull,
  createScallopedHull,
  generateSunflowerLobePath,
  generateSunflowerPoints,
  polarToCartesian,
} from './geometry';
import {
  BASE_LOBE_DIST,
  cardFrame,
  CX,
  CY,
  FRAME_BASE_SIZE,
  R_RING_OUTER,
  RING_COUNT,
} from './frame';
import type { RenderTier } from './constants';

// Pure assembly of a card's geometry into a structured, serializable model. This
// extracts the prototype QRPGenerator's useMemo math into a React-free function,
// so the renderer (<CardSurface>) only assembles SVG from precomputed pieces.
// Rotation is intentionally NOT an input: it's a transform applied by the
// renderer, so the expensive geometry is rotation-independent and cacheable.

export interface CardStripe {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CardLobe {
  id: number;
  cx: number;
  cy: number;
  angle: number;
  /** Sunflower-seed cluster path (empty unless lobeType==='sunflower' && lobeDesign==='seeds'). */
  seedPath: string;
}

export interface CardFrameGeometry {
  show: boolean;
  size: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  tick: number;
  strokeWidth: number;
  doubleTop: boolean;
  squareHeader: boolean;
  headerY: number;
  titleY: number;
  descY: number;
}

export interface CardInfoLine {
  show: boolean;
  left: number;
  right: number;
  y: number;
  fontSize: number;
  baseLabel: string;
  seqStr: string;
  long: boolean;
}

export interface BuildCardGeometryInput {
  style: StyleConfig;
  sequence: number[];
  /** The rate system (9/10/44). Shown as "Base N" in the info line. */
  base?: number | undefined;
  title?: string;
  description?: string;
  tier?: RenderTier;
}

export interface CardGeometry {
  viewBox: string;
  aspect: number;

  overallScale: number;
  mainScale: number;

  lobeType: StyleConfig['lobeType'];
  lobeDesign: StyleConfig['lobeDesign'];
  centerDesign: StyleConfig['centerDesign'];

  lobeOpacity: number;
  centerOpacity: number;
  shellStroke: number;
  ringStroke: number;
  stripeStroke: number;

  designScale: number;
  designOffset: number;
  svgBaseScale: number;
  centerSvgScale: number;
  rLobeInnerCircle: number;

  hullOuter: string;
  hullInner: string;
  lotusPetals: string[];
  lobes: CardLobe[];
  centralSeedsPath: string;
  rings: number[];
  stripes: CardStripe[];
  frame: CardFrameGeometry;
  infoLine: CardInfoLine;

  uiFont: string;
  uiFontSize: number;
  title: string;
  description: string;
}

const lobePetalCount = (petals: number, tier: RenderTier): number =>
  tier === 'lite' ? Math.min(petals, 48) : tier === 'balanced' ? Math.min(petals, 96) : petals;

const centralSeedCount = (tier: RenderTier): number =>
  tier === 'lite' ? 60 : tier === 'balanced' ? 160 : 300;

export function buildCardGeometry(input: BuildCardGeometryInput): CardGeometry {
  const { style: s, sequence, base, title = '', description = '', tier = 'high' } = input;

  const { viewBox, aspect } = cardFrame(s);

  const rLobeCenterDist = BASE_LOBE_DIST * s.shellScale;
  const rLobeRadius = s.lobeRadius * s.shellScale;
  const rLobeInnerCircle = Math.max(1, rLobeRadius - 4 * s.shellScale);
  const rRingInner = s.ringInnerRadius;

  const svgBaseScale = (rLobeInnerCircle * 2 * 0.8) / 300;
  const centerSvgScale = (rRingInner * 2 * 0.9) / 300;

  // --- Hull (inner) ---
  let hullInner = '';
  if (s.lobeType === 'sunflower') {
    hullInner = createScallopedHull(
      CX,
      CY,
      rLobeCenterDist,
      rLobeRadius,
      s.lobeCount,
      s.hullValley,
      s.hullCoverage,
    );
  }

  // --- Hull (outer) / lotus petals ---
  let hullOuter = '';
  let lotusPetals: string[] = [];
  if (s.lobeType === 'dharma') {
    hullOuter = createMandalaHull(
      CX,
      CY,
      rLobeCenterDist - 20 * s.shellScale,
      rLobeRadius + 4 * s.shellScale,
      s.lobeCount,
      s.dharmaExtrusionOut,
      s.dharmaExtrusionSide,
      s.dharmaStemWidth,
      s.dharmaCapHeight,
    );
  } else if (s.lobeType === 'lotus') {
    const offset = (s.dharmaCapHeight - 0.5) * 60;
    const baseRadius = rLobeCenterDist - rLobeRadius * 0.5 + offset;
    const tipRadius = baseRadius + rLobeRadius + rLobeRadius * 0.4;
    const baseAngle = 360 / s.lobeCount;
    const angleSpan = baseAngle * (s.hullCoverage / 100);
    const tipThickness = s.shellStroke * 5.0;
    const baseThickness = s.shellStroke * 0.5;
    lotusPetals = createLotusPetals(
      CX,
      CY,
      baseRadius,
      tipRadius,
      s.lobeCount,
      angleSpan,
      s.geometryRotation,
      s.dharmaExtrusionSide,
      s.dharmaExtrusionOut,
      s.hullValley,
      s.dharmaStemWidth,
      baseThickness,
      tipThickness,
    );
  } else {
    hullOuter = createScallopedHull(
      CX,
      CY,
      rLobeCenterDist,
      rLobeRadius + 5 * s.shellScale,
      s.lobeCount,
      s.hullValley,
      s.hullCoverage,
    );
  }

  // --- Lobes ---
  const petals = lobePetalCount(s.petals, tier);
  const lobes: CardLobe[] = Array.from({ length: s.lobeCount }).map((_, i) => {
    const angle = i * (360 / s.lobeCount);
    let centerDist = rLobeCenterDist;
    if (s.lobeType === 'dharma') centerDist -= 25 * s.shellScale;
    if (s.lobeType === 'lotus') centerDist -= 10 * s.shellScale;

    const center = polarToCartesian(CX, CY, centerDist, angle);

    let seedPath = '';
    if (s.lobeType === 'sunflower' && s.lobeDesign === 'seeds') {
      seedPath = generateSunflowerLobePath(
        Math.max(0, rLobeInnerCircle - 4 * s.shellScale),
        petals,
        s.petalSize,
        s.petalRoundness,
      );
    }

    return { id: i, cx: center.x, cy: center.y, angle, seedPath };
  });

  // --- Central ghost sunflower (one concatenated arc path) ---
  let centralSeedsPath = '';
  if (s.centerDesign === 'seeds') {
    const seeds = generateSunflowerPoints(0, 0, rRingInner - 5, centralSeedCount(tier));
    let d = '';
    for (const seed of seeds) {
      const r = 0.8 + (seed.r / rRingInner) * 1.5;
      const rr = r.toFixed(2);
      const d2 = (r * 2).toFixed(2);
      d += `M ${seed.x.toFixed(2)} ${seed.y.toFixed(2)} m -${rr},0 a ${rr},${rr} 0 1,0 ${d2},0 a ${rr},${rr} 0 1,0 -${d2},0 `;
    }
    centralSeedsPath = d;
  }

  // --- Concentric rings ---
  const rings = Array.from({ length: RING_COUNT }).map(
    (_, i) => rRingInner + i * ((R_RING_OUTER - rRingInner) / (RING_COUNT - 1)),
  );

  // --- Data stripes ---
  const stripes: CardStripe[] = [];
  const segments = sequence.length > 0 ? sequence.length : 10;
  const anglePerSegment = 360 / segments;
  for (let i = 0; i < segments; i++) {
    const value = sequence[i] || 0;
    if (value === 0) continue;
    const sectorMidAngle = i * anglePerSegment;
    const startOffset = -((value - 1) * s.stripeSep) / 2;
    for (let j = 0; j < value; j++) {
      const lineAngle = sectorMidAngle + startOffset + j * s.stripeSep;
      const start = polarToCartesian(CX, CY, s.stripeStart, lineAngle);
      const end = polarToCartesian(CX, CY, rRingInner, lineAngle);
      stripes.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    }
  }

  // --- Frame ---
  const currentFrameSize = FRAME_BASE_SIZE * s.frameScale;
  const fHalf = currentFrameSize / 2;
  const fLeft = CX - fHalf;
  const fRight = CX + fHalf;
  const fTop = CY - fHalf;
  const fBottom = CY + fHalf;
  const headerHeight = s.frameHeaderOffset * s.frameScale;
  const headerY = fTop - headerHeight;
  const headerCenterY = fTop - headerHeight / 2;
  const titleY = description ? headerCenterY - s.uiFontSize * 0.4 : headerCenterY;
  const descY = headerCenterY + s.uiFontSize * 0.65;

  // --- Info line: the rate system (left) + the actual rate numbers (right). ---
  const inset = 14;
  const seqStr = sequence.join(' ');

  return {
    viewBox,
    aspect,
    overallScale: s.overallScale,
    mainScale: s.mainScale,
    lobeType: s.lobeType,
    lobeDesign: s.lobeDesign,
    centerDesign: s.centerDesign,
    lobeOpacity: s.lobeOpacity,
    centerOpacity: s.centerOpacity,
    shellStroke: s.shellStroke,
    ringStroke: s.ringStroke,
    stripeStroke: s.stripeStroke,
    designScale: s.designScale,
    designOffset: s.designOffset,
    svgBaseScale,
    centerSvgScale,
    rLobeInnerCircle,
    hullOuter,
    hullInner,
    lotusPetals,
    lobes,
    centralSeedsPath,
    rings,
    stripes,
    frame: {
      show: s.showFrame,
      size: currentFrameSize,
      left: fLeft,
      right: fRight,
      top: fTop,
      bottom: fBottom,
      centerX: CX,
      centerY: CY,
      tick: s.frameTickLength * s.frameScale,
      strokeWidth: s.frameStrokeWidth,
      doubleTop: s.frameDoubleTop,
      squareHeader: s.frameSquareHeader,
      headerY,
      titleY,
      descY,
    },
    infoLine: {
      show: s.showInfoLabels,
      left: fLeft + inset,
      right: fRight - inset,
      y: fBottom - inset,
      fontSize: s.uiFontSize * 0.7,
      baseLabel: `Base ${base ?? sequence.length}`,
      seqStr,
      long: seqStr.length > 26,
    },
    uiFont: s.uiFont,
    uiFontSize: s.uiFontSize,
    title,
    description,
  };
}
