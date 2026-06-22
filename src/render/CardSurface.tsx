import { memo, useMemo, type CSSProperties } from 'react';
import type { StyleConfig } from '@/domain/style';
import { buildCardGeometryCached } from '@/engine/cache';
import { CX, CY } from '@/engine/frame';
import { CELTIC_PATHS, TRISKELION_PATH } from '@/engine/shapes';
import type { RenderTier } from '@/engine/constants';

export interface CardSurfaceProps {
  style: StyleConfig;
  sequence: number[];
  base?: number;
  title?: string;
  description?: string;
  tier?: RenderTier;
  size?: number | string;
  className?: string;
  /** Emphasized (active) card: brighter text + running spin. */
  active?: boolean;
  /** Live compositor-only CSS spin (seeds 24s, center 48s). */
  spin?: boolean;
  /** Static rotation in degrees (export/thumbnail), used when spin is off. */
  rotation?: number;
  /** 'width' fills the container width (default); 'height' fills its height (present/fullscreen). */
  fill?: 'width' | 'height';
}

function Motif({ design }: { design: 'celtic' | 'triskelion' }) {
  if (design === 'celtic') {
    return (
      <>
        {CELTIC_PATHS.map((d, i) => (
          <path key={i} d={d} fill="currentColor" />
        ))}
      </>
    );
  }
  return <path d={TRISKELION_PATH} fill="currentColor" stroke="none" />;
}

function CardSurfaceImpl({
  style,
  sequence,
  base,
  title = '',
  description = '',
  tier = 'high',
  size = '100%',
  className = '',
  active = false,
  spin = false,
  rotation = 0,
  fill = 'width',
}: CardSurfaceProps) {
  const geo = useMemo(
    () => buildCardGeometryCached({ style, sequence, base, title, description, tier }),
    [style, sequence, base, title, description, tier],
  );

  const f = geo.frame;
  const seedsClass = spin ? 'animate-spin-reverse' : undefined;
  const centerClass = spin ? 'animate-spin-reverse-slow' : undefined;
  const spinStyle: CSSProperties | undefined = spin
    ? { animationPlayState: active ? 'running' : 'paused', willChange: 'transform' }
    : undefined;
  const seedsTransform = !spin && rotation ? `rotate(${rotation})` : undefined;
  const centerTransform = !spin && rotation ? `rotate(${rotation * 0.5})` : undefined;

  const wrapperStyle: CSSProperties =
    fill === 'height'
      ? { width: '100%', height: '100%' } // fill the stage; the SVG's preserveAspectRatio fits the card
      : {
          aspectRatio: `${geo.aspect}`,
          maxWidth: typeof size === 'number' ? size : '100%',
          width: typeof size === 'number' ? size : '100%',
        };

  return (
    <div className={`relative mx-auto ${className}`} style={wrapperStyle}>
      <svg
        viewBox={geo.viewBox}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-colors duration-500 ${active ? 'text-slate-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-300'}`}
      >
        <g transform={`translate(${CX}, ${CY}) scale(${geo.overallScale}) translate(${-CX}, ${-CY})`}>
          {/* Frame */}
          {f.show && (
            <g className="text-slate-400 transition-colors dark:text-slate-600">
              <rect
                x={f.left}
                y={f.top}
                width={f.size}
                height={f.size}
                fill="none"
                stroke="currentColor"
                strokeWidth={f.strokeWidth}
              />
              <line x1={CX} y1={f.top} x2={CX} y2={f.top + f.tick} stroke="currentColor" strokeWidth={f.strokeWidth} />
              <line x1={CX} y1={f.bottom} x2={CX} y2={f.bottom - f.tick} stroke="currentColor" strokeWidth={f.strokeWidth} />
              <line x1={f.left} y1={CY} x2={f.left + f.tick} y2={CY} stroke="currentColor" strokeWidth={f.strokeWidth} />
              <line x1={f.right} y1={CY} x2={f.right - f.tick} y2={CY} stroke="currentColor" strokeWidth={f.strokeWidth} />
              {f.doubleTop && (
                <>
                  <line x1={f.left} y1={f.headerY} x2={f.right} y2={f.headerY} stroke="currentColor" strokeWidth={f.strokeWidth} />
                  {f.squareHeader && (
                    <>
                      <line x1={f.left} y1={f.top} x2={f.left} y2={f.headerY} stroke="currentColor" strokeWidth={f.strokeWidth} />
                      <line x1={f.right} y1={f.top} x2={f.right} y2={f.headerY} stroke="currentColor" strokeWidth={f.strokeWidth} />
                    </>
                  )}
                  <text
                    x={CX}
                    y={f.titleY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-current tracking-widest"
                    style={{ fontSize: geo.uiFontSize, fontWeight: 'bold', fontFamily: geo.uiFont }}
                  >
                    {title || 'SEQUENCE'}
                  </text>
                  {description && (
                    <text
                      x={CX}
                      y={f.descY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-current tracking-wide opacity-70"
                      style={{ fontSize: geo.uiFontSize * 0.7, fontFamily: geo.uiFont }}
                    >
                      {description}
                    </text>
                  )}
                </>
              )}
            </g>
          )}

          {/* Main content */}
          <g transform={`translate(${CX}, ${CY}) scale(${geo.mainScale}) translate(${-CX}, ${-CY})`}>
            {geo.hullOuter && (
              <path d={geo.hullOuter} fill="none" stroke="currentColor" strokeWidth={geo.shellStroke} className="opacity-50" />
            )}

            {geo.lotusPetals.map((d, i) => (
              <path key={`petal-${i}`} d={d} fill="currentColor" stroke="none" fillRule="evenodd" opacity={geo.lobeOpacity} />
            ))}

            {geo.hullInner && geo.lobeType === 'lotus' && (
              <path d={geo.hullInner} fill="none" stroke="currentColor" strokeWidth={geo.shellStroke} className="opacity-30" />
            )}
            {geo.hullInner && geo.lobeType === 'sunflower' && (
              <path d={geo.hullInner} fill="none" stroke="currentColor" strokeWidth={geo.shellStroke * 1.5} />
            )}

            {/* Lobes */}
            {geo.lobes.map((lobe) => (
              <g key={lobe.id} transform={`translate(${lobe.cx}, ${lobe.cy})`}>
                {geo.lobeType === 'sunflower' && (
                  <circle
                    r={geo.rLobeInnerCircle}
                    className="fill-white transition-colors duration-500 dark:fill-slate-900"
                    stroke="currentColor"
                    strokeWidth={0.8}
                  />
                )}
                {geo.lobeType === 'sunflower' && geo.lobeDesign === 'seeds' && (
                  <g className={seedsClass} style={spinStyle} transform={seedsTransform}>
                    <path d={lobe.seedPath} fill="currentColor" opacity={geo.lobeOpacity} />
                  </g>
                )}
                {(geo.lobeDesign === 'celtic' || geo.lobeDesign === 'triskelion') && (
                  <g
                    transform={`rotate(${lobe.angle}) translate(0, ${geo.designOffset}) scale(${geo.svgBaseScale * geo.designScale}) translate(-150, -150)`}
                    opacity={geo.lobeOpacity}
                  >
                    <Motif design={geo.lobeDesign} />
                  </g>
                )}
              </g>
            ))}

            {/* Center motif */}
            <g transform={`translate(${CX}, ${CY})`} className="pointer-events-none" style={{ opacity: geo.centerOpacity }}>
              <g className={centerClass} style={spinStyle} transform={centerTransform}>
                {geo.centerDesign === 'seeds' ? (
                  <path d={geo.centralSeedsPath} fill="currentColor" />
                ) : geo.centerDesign === 'celtic' || geo.centerDesign === 'triskelion' ? (
                  <g transform={`scale(${geo.centerSvgScale}) translate(-150, -150)`}>
                    <Motif design={geo.centerDesign} />
                  </g>
                ) : null}
              </g>
            </g>

            {/* Data stripes */}
            <g className="text-slate-900 transition-colors dark:text-white">
              {geo.stripes.map((s, i) => (
                <line
                  key={`stripe-${i}`}
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke="currentColor"
                  strokeWidth={geo.stripeStroke}
                  strokeLinecap="round"
                />
              ))}
            </g>

            {/* Concentric rings */}
            <g className="opacity-80 dark:opacity-60">
              {geo.rings.map((r, i) => (
                <circle key={`ring-${i}`} cx={CX} cy={CY} r={r} fill="none" stroke="currentColor" strokeWidth={geo.ringStroke} />
              ))}
            </g>
          </g>

          {/* Bottom info line */}
          {geo.infoLine.show && (
            <g className="fill-slate-500 dark:fill-slate-400" style={{ fontFamily: geo.uiFont }}>
              <text
                x={geo.infoLine.left}
                y={geo.infoLine.y}
                textAnchor="start"
                dominantBaseline="middle"
                style={{ fontSize: geo.infoLine.fontSize }}
              >
                {geo.infoLine.baseLabel}
              </text>
              <text
                x={geo.infoLine.right}
                y={geo.infoLine.y}
                textAnchor="end"
                dominantBaseline="middle"
                textLength={geo.infoLine.long ? (f.right - f.left) * 0.55 : undefined}
                lengthAdjust="spacingAndGlyphs"
                style={{ fontSize: geo.infoLine.fontSize }}
              >
                {geo.infoLine.seqStr}
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

export const CardSurface = memo(CardSurfaceImpl);
