import type { StyleId } from './ids';

/**
 * The visual/geometry configuration of a card — ported field-for-field from the
 * prototype's GeoConfig, MINUS the per-card content fields (`sequenceLength` and
 * the center-image/transition fields, which now live on the Card). This is the
 * unit the render engine consumes.
 */
export interface StyleConfig {
  // Frame
  showFrame: boolean;
  showInfoLabels: boolean;
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
  mainScale: number;
  petals: number;
  petalSize: number;
  petalRoundness: number;
  lobeCount: number;
  lobeRadius: number;
  lobeType: 'sunflower' | 'dharma' | 'lotus';
  lobeDesign: 'seeds' | 'celtic' | 'triskelion';
  designScale: number;
  designOffset: number;
  centerDesign: 'seeds' | 'celtic' | 'triskelion' | 'uranus' | 'image';
  lobeOpacity: number;
  centerOpacity: number;
  geometryRotation: number;
  /** Spin the seeds clockwise instead of the default anti-clockwise. */
  seedSpinClockwise?: boolean;
  /** Size of a card's circular photo centre, as a fraction of the inner ring. */
  centerImageScale?: number;

  // Dharma-specific
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

  // Strokes
  shellScale: number;
  shellStroke: number;
  ringStroke: number;
  stripeStroke: number;
}

export interface Style {
  id: StyleId;
  name: string;
  config: StyleConfig;
  /** Built-in presets are read-only; editing clones them. */
  builtin: boolean;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}
