import { memo, useId, useMemo, type CSSProperties } from 'react';
import type { StyleConfig } from '@/domain/style';
import type { CardCenterImage } from '@/domain/card';
import { buildCardGeometryCached } from '@/engine/cache';
import { CX, CY } from '@/engine/frame';
import { CENTER_IMAGE_SCALE_DEFAULT } from '@/engine/presets';
import { CELTIC_PATHS, TRISKELION_PATH } from '@/engine/shapes';
import { resolveCardImage } from '@/lib/assets';
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
  /** Optional circular photo in the card's centre (e.g. a remedy's printed picture). */
  centerImage?: CardCenterImage;
  /** Rate provenance (e.g. "Combe"/"Sulis") shown in brackets on the rate label. */
  source?: string;
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
  centerImage,
  source = '',
}: CardSurfaceProps) {
  const geo = useMemo(
    () => buildCardGeometryCached({ style, sequence, base, title, description, tier, source }),
    [style, sequence, base, title, description, tier, source],
  );
  const clipId = useId();

  const f = geo.frame;
  const cw = style.seedSpinClockwise ?? false;
  const seedsClass = spin ? (cw ? 'animate-spin-cw' : 'animate-spin-reverse') : undefined;
  const centerClass = spin ? (cw ? 'animate-spin-cw-slow' : 'animate-spin-reverse-slow') : undefined;
  const spinStyle: CSSProperties | undefined = spin
    ? { animationPlayState: active ? 'running' : 'paused', willChange: 'transform' }
    : undefined;
  const dir = cw ? -1 : 1;
  const seedsTransform = !spin && rotation ? `rotate(${rotation * dir})` : undefined;
  const centerTransform = !spin && rotation ? `rotate(${rotation * 0.5 * dir})` : undefined;

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
                  {(f.titleLines.length ? f.titleLines : [{ text: title || 'SEQUENCE', y: f.titleY }]).map(
                    (ln, i) => (
                      <text
                        key={i}
                        x={CX}
                        y={ln.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-current tracking-widest"
                        style={{ fontSize: f.titleFontSize, fontWeight: 'bold', fontFamily: geo.uiFont }}
                      >
                        {ln.text}
                      </text>
                    ),
                  )}
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

            {/* A circular photo centre, at full opacity (it's a photo, not the
                faint motif). The bundled card art places the remedy photo in a
                circle at a fixed fraction of the source; map that source circle
                directly onto the display circle so the photo is centred + sized
                exactly — no zoom-and-recentre that would magnify the offset. */}
            {centerImage
              ? (() => {
                  const r = geo.rRingInner * (style.centerImageScale ?? CENTER_IMAGE_SCALE_DEFAULT);
                  const circle = centerImage.circle !== false;
                  // `whole`: src is an isolated symbol — draw it to fill the circle
                  // (a touch oversized so a square symbol covers the disc). Otherwise
                  // crop the centre photo-circle out of a full card image.
                  const PCX = centerImage.whole ? 0.5 : 0.505;
                  const PCY = centerImage.whole ? 0.5 : 0.582;
                  const PR = centerImage.whole ? 0.5 : 0.15;
                  const PWH = centerImage.whole ? 1 : 0.853;
                  const wd = r / PR; // scale source so its photo radius == display radius r
                  const hd = wd / PWH;
                  return (
                    <g transform={`translate(${CX}, ${CY})`} className="pointer-events-none">
                      {circle && (
                        <clipPath id={clipId}>
                          <circle cx={0} cy={0} r={r} />
                        </clipPath>
                      )}
                      <image
                        href={resolveCardImage(centerImage.src)}
                        x={-PCX * wd}
                        y={-PCY * hd}
                        width={wd}
                        height={hd}
                        preserveAspectRatio="none"
                        clipPath={circle ? `url(#${clipId})` : undefined}
                        className={centerImage.invert ? 'qrp-img-invert' : undefined}
                      />
                    </g>
                  );
                })()
              : /* ...otherwise the geometric centre motif, dimmed by centerOpacity. */
                (geo.centerDesign === 'seeds' ||
                  geo.centerDesign === 'celtic' ||
                  geo.centerDesign === 'triskelion') && (
                  <g
                    transform={`translate(${CX}, ${CY})`}
                    className="pointer-events-none"
                    style={{ opacity: geo.centerOpacity }}
                  >
                    <g className={centerClass} style={spinStyle} transform={centerTransform}>
                      {geo.centerDesign === 'seeds' ? (
                        <path d={geo.centralSeedsPath} fill="currentColor" />
                      ) : (
                        <g transform={`scale(${geo.centerSvgScale}) translate(-150, -150)`}>
                          <Motif design={geo.centerDesign} />
                        </g>
                      )}
                    </g>
                  </g>
                )}

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
