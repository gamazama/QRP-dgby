
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
    centerDesign: 'seeds' | 'celtic' | 'triskelion' | 'uranus';
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
    // Invert the image in dark mode (black-line art → white lines). Default on.
    imageInvert?: boolean;
    // Draw a frame around the image card. Default off.
    imageFrame?: boolean;
}