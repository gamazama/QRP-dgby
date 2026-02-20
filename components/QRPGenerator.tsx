
import React, { useMemo } from 'react';
import { 
    polarToCartesian, 
    createScallopedHull, 
    createMandalaHull, 
    createLotusHull,
    createLotusPetals,
    generateSunflowerPoints,
    generateSunflowerLobePath 
} from '../utils/geometry';
import { GeoConfig } from '../types';
import { CELTIC_PATHS, TRISKELION_PATH } from '../assets/shapes';
import { UranusGeometry } from './planets/UranusGeometry';

// We extend GeoConfig partial so we can just spread it in.
// We omit specific non-visual or logic-only keys if necessary, but Partial<GeoConfig> is safe.
interface QRPGeneratorProps extends Partial<GeoConfig> {
  sequence: number[]; 
  size?: number | string;
  className?: string;
  active?: boolean;
  showLabels?: boolean;
  title?: string;
  description?: string;
  exportMode?: boolean;
  exportTheme?: 'light' | 'dark';
  animationRotation?: number; // Manual rotation for video export (in degrees)
}

const QRPGenerator: React.FC<QRPGeneratorProps> = ({ 
  sequence, 
  size = "100%", 
  className = "", 
  active = false,
  showLabels = false,
  title = "",
  description = "",
  // Frame Defaults
  showFrame = false,
  frameDoubleTop = false,
  frameSquareHeader = false,
  frameScale = 1.0,
  frameHeaderOffset = 45, 
  frameTickLength = 15,
  frameStrokeWidth = 1.0,
  uiFontSize = 10,
  uiFont = 'Inter',
  // Geometry Defaults
  overallScale = 1.0,
  mainScale = 1.0,
  lobeCount = 10,
  lobeRadius = 36,
  lobeType = 'sunflower',
  lobeDesign = 'seeds', // New prop with default
  designScale = 1.0,
  designOffset = 0,
  centerDesign = 'seeds', // New prop
  lobeOpacity = 0.7,
  centerOpacity = 0.1,
  geometryRotation = 0,
  dharmaExtrusionOut = 0.6,
  dharmaExtrusionSide = 0.4,
  dharmaStemWidth = 0.2,
  dharmaCapHeight = 0.3,
  petals = 150,
  petalSize = 1.5,
  petalRoundness = 1.0,
  ringInnerRadius = 95,
  stripeSep = 7,
  stripeStart = 55,
  hullValley = 1.04,
  hullCoverage = 185,
  // Appearance Defaults
  shellScale = 1.0,
  shellStroke = 0.8,
  ringStroke = 0.8,
  stripeStroke = 2.0,
  exportMode = false,
  exportTheme = 'light',
  animationRotation = 0 // Manual rotation for video export
}) => {
  // Center coordinates in SVG space
  const cx = 200;
  const cy = 200;
  
  // -- Geometry Configuration --
  // Base distances scaled by shellScale
  const BASE_LOBE_DIST = 158;
  const R_LOBE_CENTER_DIST = BASE_LOBE_DIST * shellScale; 
  
  // Scale the lobe radius as well to maintain proportions
  const R_LOBE_RADIUS = lobeRadius * shellScale; 
  const R_LOBE_INNER_CIRCLE = Math.max(1, R_LOBE_RADIUS - (4 * shellScale)); 
  
  const R_RING_OUTER = 118;       // Outer boundary of the data annulus
  const R_RING_INNER = ringInnerRadius; // Dynamic inner boundary
  const RING_COUNT = 7;           // Number of concentric rings (dense field)

  // -- Color Configuration for Export --
  const getColors = () => {
      if (!exportMode) return {}; 
      
      if (exportTheme === 'dark') {
          return {
              svgText: '#e2e8f0', 
              fill: '#0f172a',    
              stroke: '#e2e8f0',  
              secondary: '#94a3b8' 
          };
      } else {
          return {
              svgText: '#0f172a', 
              fill: '#ffffff',    
              stroke: '#0f172a',  
              secondary: '#94a3b8' 
          };
      }
  };

  const colors = getColors();

  // -- Generated Paths --
  const hullPathInner = useMemo(() => {
    if (lobeType === 'dharma') return "";
    
    // For Lotus, we also want a pointed inner hull but smaller
    if (lobeType === 'lotus') {
         // Inner hull removed as per update
         return "";
    }

    // Default Scalloped (Sunflower)
    return createScallopedHull(cx, cy, R_LOBE_CENTER_DIST, R_LOBE_RADIUS, lobeCount, hullValley, hullCoverage);
  }, [lobeType, lobeCount, R_LOBE_RADIUS, hullValley, hullCoverage, R_LOBE_CENTER_DIST, shellScale, cx, cy, geometryRotation]);

  // For Lotus, we use a list of paths for the outer shell to support overlapping petals
  const lotusPetalsOuter = useMemo(() => {
    if (lobeType !== 'lotus') return [];
    
    // We use dharmaCapHeight (0-1) to control radial offset
    // Default/Base is R_LOBE_CENTER_DIST - (R_LOBE_RADIUS * 0.5)
    // We want to allow shifting this in/out.
    // Map 0.5 to neutral, 0 to inward, 1 to outward. Range approx +/- 30px
    const offset = (dharmaCapHeight - 0.5) * 60;
    
    const baseRadius = (R_LOBE_CENTER_DIST - (R_LOBE_RADIUS * 0.5)) + offset;
    const tipRadius = baseRadius + R_LOBE_RADIUS + (R_LOBE_RADIUS * 0.4); 

    // Convert hullCoverage (100-270) to an angular span multiplier relative to 360/N
    // If hullCoverage is 100, we want approx touching.
    const baseAngle = 360 / lobeCount;
    const angleSpan = baseAngle * (hullCoverage / 100);

    // Thickness Tapering
    // shellStroke acts as the multiplier
    const tipThickness = shellStroke * 5.0; 
    const baseThickness = shellStroke * 0.5;

    return createLotusPetals(
        cx, cy, 
        baseRadius, 
        tipRadius, 
        lobeCount, 
        angleSpan, 
        geometryRotation,
        dharmaExtrusionSide, // Base Width
        dharmaExtrusionOut, // Tip Bulge (Belly Width)
        hullValley, // Waist Height
        dharmaStemWidth, // Neck Width (Concavity)
        baseThickness,
        tipThickness
    );
  }, [lobeType, cx, cy, R_LOBE_CENTER_DIST, R_LOBE_RADIUS, lobeCount, hullCoverage, geometryRotation, dharmaExtrusionSide, dharmaExtrusionOut, hullValley, dharmaStemWidth, dharmaCapHeight, shellStroke]);

  const hullPathOuter = useMemo(() => {
    if (lobeType === 'dharma') {
        return createMandalaHull(
            cx, cy, 
            R_LOBE_CENTER_DIST - (20 * shellScale), 
            R_LOBE_RADIUS + (4 * shellScale), 
            lobeCount, 
            dharmaExtrusionOut, dharmaExtrusionSide, dharmaStemWidth, dharmaCapHeight
        );
    }
    
    if (lobeType === 'lotus') return ""; 

    // Default Scalloped (Sunflower Base)
    return createScallopedHull(cx, cy, R_LOBE_CENTER_DIST, R_LOBE_RADIUS + (5 * shellScale), lobeCount, hullValley, hullCoverage);
  }, [lobeType, lobeCount, R_LOBE_RADIUS, hullValley, hullCoverage, dharmaExtrusionOut, dharmaExtrusionSide, dharmaStemWidth, dharmaCapHeight, R_LOBE_CENTER_DIST, shellScale, cx, cy]);

  // The Lobes (Positions + Content)
  const lobes = useMemo(() => {
    return Array.from({ length: lobeCount }).map((_, i) => {
      const angle = i * (360 / lobeCount); 
      let centerDist = R_LOBE_CENTER_DIST;
      if (lobeType === 'dharma') centerDist -= (25 * shellScale);
      if (lobeType === 'lotus') centerDist -= (10 * shellScale);

      const center = polarToCartesian(cx, cy, centerDist, angle);
      
      let seedPath = "";

      if (lobeType === 'sunflower' && lobeDesign === 'seeds') {
         seedPath = generateSunflowerLobePath(
             Math.max(0, R_LOBE_INNER_CIRCLE - (4 * shellScale)), 
             petals, 
             petalSize, 
             petalRoundness
         );
      } 
      
      return { id: i, cx: center.x, cy: center.y, angle, seedPath };
    });
  }, [lobeCount, R_LOBE_INNER_CIRCLE, petals, petalSize, petalRoundness, lobeType, lobeDesign, R_LOBE_RADIUS, R_LOBE_CENTER_DIST, shellScale, cx, cy]);

  // Central Ghost Sunflower
  const centralSeeds = useMemo(() => {
    // Only generate seeds if we are using seeds design
    if (centerDesign !== 'seeds') return [];
    return generateSunflowerPoints(0, 0, R_RING_INNER - 5, 300);
  }, [R_RING_INNER, centerDesign]);

  // Concentric Rings
  const concentricRings = useMemo(() => {
    return Array.from({ length: RING_COUNT }).map((_, i) => {
      return R_RING_INNER + (i * ((R_RING_OUTER - R_RING_INNER) / (RING_COUNT - 1)));
    });
  }, [R_RING_INNER]);

  // Data Stripes
  const dataStripes = useMemo(() => {
    const stripes = [];
    const segments = sequence.length > 0 ? sequence.length : 10;
    const anglePerSegment = 360 / segments;

    const STRIPE_START_R = stripeStart; 
    const STRIPE_END_R = R_RING_INNER; 

    for (let i = 0; i < segments; i++) {
      const value = sequence[i] || 0;
      if (value === 0) continue;

      const sectorMidAngle = i * anglePerSegment; 
      const separation = stripeSep; 
      const startOffset = -((value - 1) * separation) / 2;

      for (let j = 0; j < value; j++) {
        const lineAngle = sectorMidAngle + startOffset + (j * separation);
        
        const start = polarToCartesian(cx, cy, STRIPE_START_R, lineAngle);
        const end = polarToCartesian(cx, cy, STRIPE_END_R, lineAngle);
        
        stripes.push(
          <line
            key={`stripe-${i}-${j}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={exportMode ? colors.stroke : "currentColor"}
            strokeWidth={stripeStroke}
            strokeLinecap="round"
          />
        );
      }

      if (showLabels && value > 0) {
        const labelPosExternal = polarToCartesian(cx, cy, R_RING_OUTER + 12, sectorMidAngle);

        stripes.push(
           <text
            key={`label-${i}`}
            x={labelPosExternal.x}
            y={labelPosExternal.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className={exportMode ? "" : "fill-slate-400 dark:fill-slate-500 opacity-60"}
            style={{ 
                fontSize: uiFontSize, 
                fontFamily: uiFont,
                fill: exportMode ? colors.secondary : undefined,
                opacity: 0.6
            }}
            transform={`rotate(${sectorMidAngle}, ${labelPosExternal.x}, ${labelPosExternal.y})`}
           >
             {value}
           </text>
        );
      }
    }
    return stripes;
  }, [sequence, showLabels, stripeSep, stripeStart, R_RING_INNER, stripeStroke, uiFontSize, uiFont, exportMode, colors]);

  // Frame Dimensions
  const frameBaseSize = 370;
  const currentFrameSize = frameBaseSize * frameScale;
  const fHalf = currentFrameSize / 2;
  const fLeft = cx - fHalf;
  const fRight = cx + fHalf;
  const fTop = cy - fHalf;
  const fBottom = cy + fHalf;

  // Header Box Dimensions
  const headerHeight = frameHeaderOffset * frameScale;
  const headerY = fTop - headerHeight; 
  const headerCenterY = fTop - (headerHeight / 2);

  const titleY = description ? headerCenterY - (uiFontSize * 0.4) : headerCenterY;
  const descY = headerCenterY + (uiFontSize * 0.65);

  // SVG Scaling for Lobe Designs
  // Base scale logic + custom scale parameter
  const svgBaseScale = (R_LOBE_INNER_CIRCLE * 2 * 0.8) / 300; 

  // Center SVG Scale logic: Fit inside Ring Inner
  const centerSvgScale = (R_RING_INNER * 2 * 0.9) / 300;

  return (
    <div 
        className={`relative mx-auto aspect-[4/7] ${className}`} 
        style={{ 
            maxWidth: typeof size === 'number' ? size : '100%',
            width: typeof size === 'number' ? size : '100%' 
        }}
    >
      <svg 
        viewBox="0 -150 400 700" 
        width="100%" 
        height="100%" 
        preserveAspectRatio="xMidYMid meet"
        style={exportMode ? { color: colors.svgText } : undefined} 
        className={exportMode ? '' : `transition-colors duration-500 ${active ? 'text-slate-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-300'}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={`translate(${cx}, ${cy}) scale(${overallScale}) translate(${-cx}, ${-cy})`}>

            {/* --- 0. Optional Frame --- */}
            {showFrame && (
                <g className={exportMode ? "" : "text-slate-400 dark:text-slate-600 transition-colors"} style={exportMode ? { color: colors.secondary } : undefined}>
                    <rect x={fLeft} y={fTop} width={currentFrameSize} height={currentFrameSize} fill="none" stroke="currentColor" strokeWidth={frameStrokeWidth} />
                    <line x1={cx} y1={fTop} x2={cx} y2={fTop + (frameTickLength * frameScale)} stroke="currentColor" strokeWidth={frameStrokeWidth} />
                    <line x1={cx} y1={fBottom} x2={cx} y2={fBottom - (frameTickLength * frameScale)} stroke="currentColor" strokeWidth={frameStrokeWidth} />
                    <line x1={fLeft} y1={cy} x2={fLeft + (frameTickLength * frameScale)} y2={cy} stroke="currentColor" strokeWidth={frameStrokeWidth} />
                    <line x1={fRight} y1={cy} x2={fRight - (frameTickLength * frameScale)} y2={cy} stroke="currentColor" strokeWidth={frameStrokeWidth} />

                    {frameDoubleTop && (
                        <>
                            <line x1={fLeft} y1={headerY} x2={fRight} y2={headerY} stroke="currentColor" strokeWidth={frameStrokeWidth} />
                            
                            {frameSquareHeader && (
                                <>
                                    <line x1={fLeft} y1={fTop} x2={fLeft} y2={headerY} stroke="currentColor" strokeWidth={frameStrokeWidth} />
                                    <line x1={fRight} y1={fTop} x2={fRight} y2={headerY} stroke="currentColor" strokeWidth={frameStrokeWidth} />
                                </>
                            )}

                            <text 
                                x={cx} 
                                y={titleY} 
                                textAnchor="middle" 
                                dominantBaseline="middle"
                                className="tracking-widest fill-current"
                                style={{ 
                                  fontSize: uiFontSize, 
                                  fontWeight: 'bold', 
                                  fontFamily: uiFont,
                                  fill: exportMode ? colors.svgText : undefined 
                                }}
                            >
                                {title || "SEQUENCE"}
                            </text>
                            {description && (
                                <text 
                                    x={cx} 
                                    y={descY} 
                                    textAnchor="middle" 
                                    dominantBaseline="middle"
                                    className="tracking-wide opacity-70 fill-current"
                                    style={{ 
                                      fontSize: uiFontSize * 0.7, 
                                      fontFamily: uiFont,
                                      fill: exportMode ? colors.secondary : undefined 
                                    }}
                                >
                                    {description}
                                </text>
                            )}
                        </>
                    )}
                </g>
            )}

            {/* --- Main Content Group --- */}
            <g transform={`translate(${cx}, ${cy}) scale(${mainScale}) translate(${-cx}, ${-cy})`}>

                {/* --- 1. Outer Continuous Hull (Standard & Dharma) --- */}
                {hullPathOuter && (
                    <path d={hullPathOuter} fill="none" stroke="currentColor" strokeWidth={shellStroke} className="opacity-50" />
                )}

                {/* --- 1b. Overlaid Lotus Petals (Lotus Only) --- */}
                {lotusPetalsOuter.map((d, i) => (
                    <path 
                        key={`petal-${i}`} 
                        d={d} 
                        fill="currentColor" 
                        stroke="none"
                        fillRule="evenodd"
                        className="opacity-70" 
                    />
                ))}

                {/* For Lotus, we also render the inner hull */}
                {(hullPathInner && lobeType === 'lotus') && (
                    <path d={hullPathInner} fill="none" stroke="currentColor" strokeWidth={shellStroke} className="opacity-30" />
                )}
                {/* Scalloped Inner for Sunflower */}
                {(hullPathInner && lobeType === 'sunflower') && (
                    <path d={hullPathInner} fill="none" stroke="currentColor" strokeWidth={shellStroke * 1.5} className="transition-all duration-1000" />
                )}

                {/* --- 2. The Lobes Contents --- */}
                {lobes.map((lobe) => (
                <g key={lobe.id} transform={`translate(${lobe.cx}, ${lobe.cy})`}>
                    
                    {/* Background Circle only for Sunflower */}
                    {lobeType === 'sunflower' && (
                        <circle 
                            r={R_LOBE_INNER_CIRCLE} 
                            fill={exportMode ? colors.fill : undefined}
                            className={exportMode ? '' : "fill-white dark:fill-slate-900 transition-colors duration-500"}
                            stroke="currentColor" 
                            strokeWidth={0.8}
                        />
                    )}

                    {/* Content: Seeds (Only show if Sunflower AND Seed design selected) */}
                    {lobeType === 'sunflower' && lobeDesign === 'seeds' && (
                        <g 
                            className={exportMode ? undefined : "animate-spin-reverse"}
                            style={exportMode ? undefined : { 
                                animationPlayState: active ? 'running' : 'paused'
                            }}
                            transform={exportMode ? `rotate(${animationRotation})` : undefined}
                            data-rotate={exportMode ? "seeds" : undefined}
                        >
                            <path 
                                d={lobe.seedPath}
                                fill="currentColor"
                                opacity={lobeOpacity}
                            />
                        </g>
                    )}

                    {/* Content: Celtic or Triskelion (Available for ALL types) */}
                    {(lobeDesign === 'celtic' || lobeDesign === 'triskelion') && (
                        <g 
                            /* 
                                Transform Breakdown:
                                1. translate(-150, -150): Center SVG (300x300) to origin
                                2. scale(...): Scale it
                                3. translate(0, designOffset): Move along radial axis (Y is radial after rotation)
                                4. rotate(lobe.angle + 90): Rotate so Bottom (+Y) points to Center of Diagram.
                                Note: SVG transform application order is effectively Right-to-Left mathematically.
                            */
                            transform={`rotate(${lobe.angle}) translate(0, ${designOffset}) scale(${svgBaseScale * designScale}) translate(-150, -150)`}
                            opacity={lobeOpacity}
                        >
                            {lobeDesign === 'celtic' ? (
                                CELTIC_PATHS.map((d, i) => (
                                    <path key={i} d={d} fill="currentColor" />
                                ))
                            ) : (
                                <path d={TRISKELION_PATH} fill="currentColor" stroke="none" />
                            )}
                        </g>
                    )}
                </g>
                ))}

                {/* --- 2b. Central Ghost Sunflower OR SVG --- */}
                <g transform={`translate(${cx}, ${cy})`} className="pointer-events-none" style={{ opacity: centerOpacity }}>
                    <g
                        className={exportMode ? undefined : "animate-spin-reverse-slow"}
                        style={exportMode ? undefined : { 
                            animationPlayState: active ? 'running' : 'paused'
                        }}
                        transform={exportMode ? `rotate(${animationRotation * 0.5})` : undefined}
                        data-rotate={exportMode ? "central" : undefined}
                    >
                        {centerDesign === 'seeds' ? (
                            centralSeeds.map((seed, idx) => (
                                <circle 
                                    key={`c-seed-${idx}`}
                                    cx={seed.x} 
                                    cy={seed.y}
                                    r={0.8 + (seed.r / R_RING_INNER) * 1.5} 
                                    fill="currentColor"
                                />
                            ))
                        ) : centerDesign === 'uranus' ? (
                             <g transform={`scale(${centerSvgScale * 0.36}) translate(-940, -540)`}>
                                <UranusGeometry />
                             </g>
                        ) : (
                            <g transform={`scale(${centerSvgScale}) translate(-150, -150)`}>
                                {centerDesign === 'celtic' ? (
                                    CELTIC_PATHS.map((d, i) => (
                                        <path key={i} d={d} fill="currentColor" />
                                    ))
                                ) : (
                                    <path d={TRISKELION_PATH} fill="currentColor" stroke="none" />
                                )}
                            </g>
                        )}
                    </g>
                </g>

                {/* --- 3. Data Stripes --- */}
                <g className={exportMode ? "" : "text-slate-900 dark:text-white transition-colors"} style={exportMode ? { color: colors.svgText } : undefined}>
                    {dataStripes}
                </g>

                {/* --- 4. Center Concentric Field --- */}
                <g className={exportMode ? "" : "opacity-80 dark:opacity-60"} style={exportMode ? { opacity: 0.8 } : undefined}>
                    {concentricRings.map((r, i) => (
                    <circle 
                        key={`ring-${i}`} 
                        cx={cx} 
                        cy={cy} 
                        r={r} 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth={ringStroke}
                    />
                    ))}
                </g>
            
            </g>

        </g>
      </svg>
    </div>
  );
};

export default QRPGenerator;