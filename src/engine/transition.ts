import { generateSunflowerPoints } from './geometry';

// The transition "breather" sunflower disc — shared by the live TransitionSurface
// and the export SVG builder so they render identically.
export function transitionSeedDiscPath(): string {
  const seeds = generateSunflowerPoints(0, 0, 135, 260);
  let d = '';
  for (const s of seeds) {
    const rr = 1.2 + (s.r / 135) * 2.6;
    const r = rr.toFixed(2);
    const d2 = (rr * 2).toFixed(2);
    d += `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} m -${r},0 a ${r},${r} 0 1,0 ${d2},0 a ${r},${r} 0 1,0 -${d2},0 `;
  }
  return d;
}
