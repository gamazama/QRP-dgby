import { memo, type CSSProperties } from 'react';
import type { TransitionShape, TransitionSpin } from '@/domain/card';
import { generateSunflowerPoints } from '@/engine/geometry';
import { CELTIC_PATHS, TRISKELION_PATH } from '@/engine/shapes';
import { CX, CY, FULL_BLEED_ASPECT, FULL_BLEED_VIEWBOX } from '@/engine/frame';

function seedDiscPath(): string {
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
const SEED_DISC = seedDiscPath();

export interface TransitionSurfaceProps {
  shape: TransitionShape;
  mode: TransitionSpin;
  spinSeconds: number;
  active?: boolean;
  enabled?: boolean;
  size?: number | string;
  className?: string;
}

// A transition "breather" card: a bare centered motif that spins. Same viewBox
// as other cards so crossfades and export don't jump.
export const TransitionSurface = memo(function TransitionSurface({
  shape,
  mode,
  spinSeconds,
  active = false,
  enabled = true,
  size = '100%',
  className = '',
}: TransitionSurfaceProps) {
  const spins = mode !== 'off';
  const dir = mode === 'ccw' ? 'reverse' : mode === 'alternate' ? 'alternate' : 'normal';
  const easing = mode === 'alternate' ? 'ease-in-out' : 'linear';
  const style: CSSProperties =
    spins && enabled
      ? {
          animation: `qrp-spin ${spinSeconds}s ${easing} infinite ${dir}`,
          animationPlayState: active ? 'running' : 'paused',
          willChange: 'transform',
        }
      : {};

  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{
        aspectRatio: `${FULL_BLEED_ASPECT}`,
        width: typeof size === 'number' ? size : '100%',
        maxWidth: typeof size === 'number' ? size : '100%',
      }}
    >
      <svg
        viewBox={FULL_BLEED_VIEWBOX}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-700 transition-colors dark:text-slate-400"
      >
        <g transform={`translate(${CX}, ${CY})`} className="pointer-events-none">
          <g style={style}>
            {shape === 'sunflower' ? (
              <path d={SEED_DISC} fill="currentColor" />
            ) : (
              <g transform="translate(-150, -150)">
                {shape === 'celtic' ? (
                  CELTIC_PATHS.map((d, i) => <path key={i} d={d} fill="currentColor" />)
                ) : (
                  <path d={TRISKELION_PATH} fill="currentColor" stroke="none" />
                )}
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
});
