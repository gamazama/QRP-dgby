// Pure, framework-agnostic geometry math — ported VERBATIM (behaviour-identical)
// from the prototype's utils/geometry.ts. The only changes are added types
// (replacing `any`) so it passes strict lint; outputs are byte-for-byte identical,
// proven by tests/golden/geometry.golden.json. This is the card visual identity.

export interface Point {
  x: number;
  y: number;
}

export interface SunflowerPoint {
  x: number;
  y: number;
  r: number;
  angle: number;
  index: number;
}

// Convert polar coordinates to cartesian
export const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): Point => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

// Generate points for a Fibonacci Sunflower pattern (Phyllotaxis)
export const generateSunflowerPoints = (
  cx: number,
  cy: number,
  maxRadius: number,
  count: number,
): SunflowerPoint[] => {
  const points: SunflowerPoint[] = [];
  const goldenAngle = 137.507764; // The Golden Angle in degrees

  // The scaling factor c is determined by the max radius and number of points
  // r = c * sqrt(n), so MaxR = c * sqrt(count) -> c = MaxR / sqrt(count)
  const c = maxRadius / Math.sqrt(count);

  for (let i = 0; i < count; i++) {
    // Distance from center
    const r = c * Math.sqrt(i);
    // Angle
    const theta = i * goldenAngle;

    // Convert to Cartesian
    const pos = polarToCartesian(cx, cy, r, theta);

    // We return angle (theta) so we can orient shapes (like ellipses) later
    points.push({ x: pos.x, y: pos.y, r, angle: theta, index: i });
  }

  return points;
};

// Generate the SVG Path data for a cluster of sunflower seeds within a lobe
export const generateSunflowerLobePath = (
  rInner: number,
  count: number,
  petalSize: number,
  roundness: number,
): string => {
  let seedPath = '';
  // Center is 0,0 relative to the group
  const seeds = generateSunflowerPoints(0, 0, Math.max(0, rInner), count);

  seeds.forEach((seed) => {
    const scale = 0.8 + (seed.r / rInner) * 0.4;
    const rx = petalSize * scale;

    if (roundness > 0.95) {
      // Circle approximation using Arcs
      seedPath += `M ${seed.x} ${seed.y} m -${rx}, 0 a ${rx},${rx} 0 1,0 ${rx * 2},0 a ${rx},${rx} 0 1,0 -${rx * 2},0 `;
    } else {
      // Rhombus / Diamond shape for lower roundness
      const ry = rx * roundness;
      const thetaRad = (seed.angle * Math.PI) / 180;
      const cos = Math.cos(thetaRad);
      const sin = Math.sin(thetaRad);

      // Vertices rotated by theta
      const wx = -sin * rx; // Width vector X
      const wy = cos * rx; // Width vector Y
      const hx = cos * ry; // Height vector X
      const hy = sin * ry; // Height vector Y

      seedPath += `M ${(seed.x + hx).toFixed(1)} ${(seed.y + hy).toFixed(1)} L ${(seed.x + wx).toFixed(1)} ${(seed.y + wy).toFixed(1)} L ${(seed.x - hx).toFixed(1)} ${(seed.y - hy).toFixed(1)} L ${(seed.x - wx).toFixed(1)} ${(seed.y - wy).toFixed(1)} Z `;
    }
  });

  return seedPath;
};

// Generate the outer scalloped hull for the lobes
export const createScallopedHull = (
  cx: number,
  cy: number,
  rCenter: number,
  rLobe: number,
  numLobes: number,
  valleyRadiusFactor = 0.75,
  coverageAngle = 210,
): string => {
  let d = '';
  const anglePerLobe = 360 / numLobes;
  const startOffset = -coverageAngle / 2;
  const endOffset = coverageAngle / 2;

  for (let i = 0; i < numLobes; i++) {
    const lobeAngle = i * anglePerLobe;

    // Calculate Lobe Center
    const lobeCenter = polarToCartesian(cx, cy, rCenter, lobeAngle);
    const arcStart = polarToCartesian(lobeCenter.x, lobeCenter.y, rLobe, lobeAngle + startOffset);
    const arcEnd = polarToCartesian(lobeCenter.x, lobeCenter.y, rLobe, lobeAngle + endOffset);

    if (i === 0) {
      d += `M ${arcStart.x} ${arcStart.y} `;
    }

    d += `A ${rLobe} ${rLobe} 0 1 1 ${arcEnd.x} ${arcEnd.y} `;

    const nextLobeIndex = (i + 1) % numLobes;
    const nextLobeAngle = nextLobeIndex * anglePerLobe;
    const nextLobeCenter = polarToCartesian(cx, cy, rCenter, nextLobeAngle);
    const nextArcStart = polarToCartesian(
      nextLobeCenter.x,
      nextLobeCenter.y,
      rLobe,
      nextLobeAngle + startOffset,
    );

    const valleyAngle = lobeAngle + anglePerLobe / 2;
    const valleyRadius = rCenter * valleyRadiusFactor;
    const valleyPoint = polarToCartesian(cx, cy, valleyRadius, valleyAngle);

    d += `Q ${valleyPoint.x} ${valleyPoint.y} ${nextArcStart.x} ${nextArcStart.y} `;
  }

  d += 'Z';
  return d;
};

// Generate Individual Lotus Petals with Tapered Stroke
export const createLotusPetals = (
  cx: number,
  cy: number,
  rBase: number,
  rTip: number,
  numLobes: number,
  angleSpan: number, // Total angular width of petal in degrees at max width
  rotationOffset: number,
  baseWidthRatio: number, // 0..1 controls width at base (relative to max width)
  tipBulge: number, // 0..1 controls CP1 spread (Belly Width)
  waistPosition: number, // 0.5..1.5 controls vertical position of CP1 (Waist Height)
  neckWidth: number, // 0..1 controls CP2 spread/Height (Neck Width/Concavity).
  strokeWidthBase: number,
  strokeWidthTip: number,
): string[] => {
  const petals: string[] = [];
  const anglePerLobe = 360 / numLobes;

  // Normalize waist position
  // Map hullValley (0.5 - 1.5) to relative position along petal (0.1 - 0.7)
  const waistHeight = 0.15 + Math.max(0, waistPosition - 0.5) * 0.6;

  for (let i = 0; i < numLobes; i++) {
    const angle = i * anglePerLobe + rotationOffset;

    // --- 1. Radii & Stroke Offsets ---
    const rBaseOut = rBase;
    const rBaseIn = rBase + strokeWidthBase;

    const rTipOut = rTip + strokeWidthTip * 0.5;
    const rTipIn = rTip - strokeWidthTip * 0.5;

    // --- 2. Angular Widths ---
    const halfSpan = angleSpan / 2;
    const baseHalfSpan = halfSpan * Math.max(0.01, baseWidthRatio);

    // Stroke angular deduction
    const degPerPixelBase = 180 / Math.PI / rBase;

    const angleStrokeBase = strokeWidthBase * degPerPixelBase * 0.8;

    // Inner widths
    const baseHalfSpanIn = Math.max(0.001, baseHalfSpan - angleStrokeBase);

    // --- 3. Control Points ---
    const dr = rTip - rBase;

    // CP1 (Belly) - Controlled by Waist Height (Valley)
    const rCp1 = rBase + dr * waistHeight;

    // CP2 (Neck) - Radius/Height now Dynamic!
    const neckHeightFactor = 0.55 + 0.3 * Math.min(1, neckWidth * 1.5);
    const rCp2 = rBase + dr * neckHeightFactor;

    // Spread (Horizontal/Angular positions)
    const bellyWidthFactor = 0.2 + tipBulge * 1.0;

    const neckWidthFactor = 0.1 + neckWidth * 0.8;

    // Apply interpolation
    const cp1SpreadOut = baseHalfSpan + (halfSpan - baseHalfSpan) * bellyWidthFactor;

    const cp2SpreadOut = halfSpan * neckWidthFactor;

    // Inner CPs - Scale down spread slightly to maintain wall thickness
    const rMid = (rBase + rTip) / 2;
    const angleStrokeMid = ((strokeWidthBase + strokeWidthTip) / 2) * (180 / Math.PI / rMid);

    const cp1SpreadIn = Math.max(0, cp1SpreadOut - angleStrokeMid);

    // Prevent Thinning:
    const minInnerNeck = cp2SpreadOut * 0.5;
    const cp2SpreadInRaw = cp2SpreadOut - angleStrokeMid;
    const cp2SpreadIn = Math.max(0, Math.max(cp2SpreadInRaw, minInnerNeck));

    // --- 4. Points Generation ---

    // Outer Loop
    const baseL = polarToCartesian(cx, cy, rBaseOut, angle - baseHalfSpan);
    const baseR = polarToCartesian(cx, cy, rBaseOut, angle + baseHalfSpan);
    const tipOut = polarToCartesian(cx, cy, rTipOut, angle);

    const cp1L = polarToCartesian(cx, cy, rCp1, angle - cp1SpreadOut);
    const cp1R = polarToCartesian(cx, cy, rCp1, angle + cp1SpreadOut);
    const cp2L = polarToCartesian(cx, cy, rCp2, angle - cp2SpreadOut);
    const cp2R = polarToCartesian(cx, cy, rCp2, angle + cp2SpreadOut);

    // Inner Loop
    const baseL_In = polarToCartesian(cx, cy, rBaseIn, angle - baseHalfSpanIn);
    const baseR_In = polarToCartesian(cx, cy, rBaseIn, angle + baseHalfSpanIn);
    const tipIn = polarToCartesian(cx, cy, rTipIn, angle);

    const cp1L_In = polarToCartesian(cx, cy, rCp1, angle - cp1SpreadIn);
    const cp1R_In = polarToCartesian(cx, cy, rCp1, angle + cp1SpreadIn);
    const cp2L_In = polarToCartesian(cx, cy, rCp2, angle - cp2SpreadIn);
    const cp2R_In = polarToCartesian(cx, cy, rCp2, angle + cp2SpreadIn);

    // Path Construction - Continuous Open-Base Loop
    const d = `
            M ${baseL.x} ${baseL.y}
            C ${cp1L.x} ${cp1L.y} ${cp2L.x} ${cp2L.y} ${tipOut.x} ${tipOut.y}
            C ${cp2R.x} ${cp2R.y} ${cp1R.x} ${cp1R.y} ${baseR.x} ${baseR.y}
            L ${baseR_In.x} ${baseR_In.y}
            C ${cp1R_In.x} ${cp1R_In.y} ${cp2R_In.x} ${cp2R_In.y} ${tipIn.x} ${tipIn.y}
            C ${cp2L_In.x} ${cp2L_In.y} ${cp1L_In.x} ${cp1L_In.y} ${baseL_In.x} ${baseL_In.y}
            L ${baseL.x} ${baseL.y}
            Z
        `;

    petals.push(d);
  }
  return petals;
};

// Generate an Angular "Mandala Gate" Hull with Rectangular features and straight polygon walls
export const createMandalaHull = (
  cx: number,
  cy: number,
  rBase: number, // Radius of the inner wall (apothem)
  rFeature: number, // Size reference for the gate
  numLobes: number,
  extrusionOut: number, // 0-1 (Controls Stem Length)
  extrusionSide: number, // 0-1.5 (Controls Top Width Extension)
  stemWidthFactor: number, // 0-1 (Fraction of available segment width)
  capHeightFactor: number, // 0-1 (Fraction of rFeature)
): string => {
  let d = '';
  const angleStep = 360 / numLobes;

  // -- Dimensions --
  const perimeter = 2 * Math.PI * rBase;
  const segmentWidth = perimeter / numLobes;

  // Height of the vertical shaft (Stem)
  const hStem = rFeature * 2.0 * extrusionOut;

  // Thickness of the horizontal top bar (Cap/Wing)
  const hWing = rFeature * capHeightFactor;

  // Width of the vertical shaft (Stem)
  const wStem = segmentWidth * Math.min(0.9, Math.max(0.01, stemWidthFactor));

  // Width of the top T-bar (Wing)
  const wWing = wStem + segmentWidth * extrusionSide;

  const rWall = rBase;
  const rStemTop = rWall + hStem;
  const rWingTop = rStemTop + hWing;

  for (let i = 0; i < numLobes; i++) {
    const thetaDeg = i * angleStep;

    // Basis Vectors for this lobe
    const Ur = polarToCartesian(0, 0, 1, thetaDeg);
    const Ut = polarToCartesian(0, 0, 1, thetaDeg + 90);

    // Helper to map local (r, offset) to global (cx, cy)
    const getP = (rad: number, offset: number) => ({
      x: cx + Ur.x * rad + Ut.x * offset,
      y: cy + Ur.y * rad + Ut.y * offset,
    });

    // Rectangular T-Shape Points
    const pStemBL = getP(rWall, -wStem / 2);
    const pStemTL = getP(rStemTop, -wStem / 2);
    const pWingBL = getP(rStemTop, -wWing / 2);
    const pWingTL = getP(rWingTop, -wWing / 2);
    const pWingTR = getP(rWingTop, wWing / 2);
    const pWingBR = getP(rStemTop, wWing / 2);
    const pStemTR = getP(rStemTop, wStem / 2);
    const pStemBR = getP(rWall, wStem / 2);

    if (i === 0) {
      d += `M ${pStemBL.x} ${pStemBL.y} `;
    } else {
      // Connect from previous Corner to this Stem Base
      d += `L ${pStemBL.x} ${pStemBL.y} `;
    }

    // Trace the gate
    d += `L ${pStemTL.x} ${pStemTL.y} `;
    d += `L ${pWingBL.x} ${pWingBL.y} `;
    d += `L ${pWingTL.x} ${pWingTL.y} `;
    d += `L ${pWingTR.x} ${pWingTR.y} `;
    d += `L ${pWingBR.x} ${pWingBR.y} `;
    d += `L ${pStemTR.x} ${pStemTR.y} `;
    d += `L ${pStemBR.x} ${pStemBR.y} `;

    // Calculate Polygon Corner (Midpoint between this lobe and next)
    const cornerAngle = thetaDeg + angleStep / 2;
    const cornerRad = rBase / Math.cos(((angleStep / 2) * Math.PI) / 180);
    const pCorner = polarToCartesian(cx, cy, cornerRad, cornerAngle);

    d += `L ${pCorner.x} ${pCorner.y} `;
  }

  d += 'Z';
  return d;
};
