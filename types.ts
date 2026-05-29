
export interface GeoConfig {
    // Frame
    showFrame: boolean;
    frameDoubleTop: boolean;
    frameSquareHeader: boolean;
    frameScale: number;
    frameHeaderOffset: number;
    frameTickLength: number;
    frameStrokeWidth: number;
    uiFontSize: number;
    uiFont: string;
    
    // Geometry
    overallScale: number;
    mainScale: number; // Scale of the content inside the frame
    petals: number;
    petalSize: number;
    petalRoundness: number;
    lobeCount: number;
    lobeRadius: number;
    lobeType: 'sunflower' | 'dharma' | 'lotus';
    lobeDesign: 'seeds' | 'celtic' | 'triskelion';
    designScale: number; // Scale for non-seed designs
    designOffset: number; // Radial offset for non-seed designs
    centerDesign: 'seeds' | 'celtic' | 'triskelion' | 'uranus' | 'image';
    centerImageSrc?: string;     // URL of the center image (e.g. a library chakra mandala) when centerDesign === 'image'
    centerImageScale?: number;   // size of the center image; 1.0 = fit the ring-inner radius
    centerImageCircle?: boolean; // circular-crop the center image (default true — mandalas are round)
    centerImageInvert?: boolean; // luminosity-invert the center image in dark mode (default false)
    lobeOpacity: number;
    centerOpacity: number;
    geometryRotation: number; // Rotation in degrees
    
    // Dharma Specific
    dharmaExtrusionOut: number;
    dharmaExtrusionSide: number;
    dharmaStemWidth: number;
    dharmaCapHeight: number;
    
    // Fields
    ringInnerRadius: number;
    stripeSep: number;
    stripeStart: number;
    hullValley: number;
    hullCoverage: number;
    sequenceLength: number;
    
    // Styles
    shellScale: number;
    shellStroke: number;
    ringStroke: number;
    stripeStroke: number;
}

export interface Sequence {
    id: number;
    name: string;
    description?: string;
    data: number[];
    geoConfig: GeoConfig;
    // Optional uploaded image (data URL). When set, the card renders this image
    // instead of the generated geometry. Not included in share URLs (too large);
    // persisted only via JSON save and exported PNG/MP4 frames.
    imageSrc?: string;
    // Library line-art cards ship a theme pair: imageSrc is the light layer
    // (black ink) and imageSrcDark the dark layer (white ink). When imageSrcDark
    // is set, the renderer swaps layers by theme instead of applying a filter —
    // the white paper is already baked transparent and the photo stays in colour.
    imageSrcDark?: string;
    // Invert the image in dark mode (black-line art → white lines). Default on.
    // Ignored when imageSrcDark is present (the dark layer handles it).
    imageInvert?: boolean;
    // Draw a frame around the image card. Default off.
    imageFrame?: boolean;
}