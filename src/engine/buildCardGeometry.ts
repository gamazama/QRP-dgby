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
  /** Title, wrapped to 1–2 balanced lines, each with its own vertical centre. */
  titleLines: { text: string; y: number }[];
  titleFontSize: number;
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
  /** Rate provenance (e.g. "Combe", "Sulis"). Shown in brackets on the rate label. */
  source?: string;
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
  /** Inner radius of the data annulus — the central disc a centre image fills. */
  rRingInner: number;

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

// Bottom-left rate label. Base 9 uses the "· 336" scale; the source (rate book,
// e.g. Combe/Sulis) goes in brackets when known: "Base 9 · 336 (Combe)".
function buildBaseLabel(base: number, source?: string): string {
  const core = base === 9 ? 'Base 9 · 336' : `Base ${base}`;
  return source ? `${core} (${source})` : core;
}

export function buildCardGeometry(input: BuildCardGeometryInput): CardGeometry {
  const { style: s, sequence, base, title = '', description = '', tier = 'high', source } = input;

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

  // --- Data stripes (dial-position model) ---
  // The rate is a set of positions on a `base`-division dial: each rate number
  // draws one radial stripe at that position's angle; a number repeated N times
  // draws N stripes clustered at that position. (0 = no stripe.)
  const stripes: CardStripe[] = [];
  const dialBase = base && base > 0 ? base : sequence.length || 10;
  const counts = new Map<number, number>();
  for (const raw of sequence) {
    const n = Math.round(raw);
    if (!Number.isFinite(n) || n === 0) continue;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  for (const [pos, count] of counts) {
    const positionAngle = (pos / dialBase) * 360;
    const startOffset = -((count - 1) * s.stripeSep) / 2;
    for (let j = 0; j < count; j++) {
      const lineAngle = positionAngle + startOffset + j * s.stripeSep;
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
  // Wrap a long title onto two balanced lines (by word), and stack title lines +
  // optional subheading centred in the (taller) header band.
  const words = title.split(/\s+/).filter(Boolean);
  let lines = title ? [title] : [];
  if (title.length > 18 && words.length > 1) {
    let best = 1, bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  const titleFontSize = s.uiFontSize;
  const titleLH = titleFontSize * 1.02;
  const descLH = s.uiFontSize * 0.7;
  const blockTop = headerCenterY - (lines.length * titleLH + (description ? descLH : 0)) / 2;
  const titleLines = lines.map((text, i) => ({ text, y: blockTop + titleLH * i + titleLH / 2 }));
  const titleY = titleLines[0]?.y ?? headerCenterY;
  const descY = blockTop + lines.length * titleLH + descLH / 2;

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
    rRingInner,
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
      titleLines,
      titleFontSize,
      descY,
    },
    infoLine: {
      show: s.showInfoLabels,
      left: fLeft + inset,
      right: fRight - inset,
      y: fBottom - inset,
      fontSize: s.uiFontSize * 0.7,
      baseLabel: buildBaseLabel(base ?? sequence.length, source),
      seqStr,
      long: seqStr.length > 26,
    },
    uiFont: s.uiFont,
    uiFontSize: s.uiFontSize,
    title,
    description,
  };
}
