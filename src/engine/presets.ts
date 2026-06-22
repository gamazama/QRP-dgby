import type { StyleId } from '@/domain/ids';
import type { StyleConfig } from '@/domain/style';

// The three built-in styles, ported from the prototype's constants.ts presets
// (minus `sequenceLength`, which is now per-card content). These MUST stay
// value-identical so existing looks render pixel-faithful.

export const SUNFLOWER_STYLE: StyleConfig = {
  showFrame: true,
  showInfoLabels: true,
  frameDoubleTop: true,
  frameSquareHeader: true,
  frameScale: 1.121,
  frameHeaderOffset: 45,
  frameTickLength: 6,
  frameStrokeWidth: 1.5,
  uiFontSize: 22,
  uiFont: 'Inter',
  overallScale: 0.95,
  mainScale: 1.0,
  petals: 144,
  petalSize: 1.11,
  petalRoundness: 1,
  lobeCount: 10,
  lobeRadius: 31,
  lobeType: 'sunflower',
  lobeDesign: 'seeds',
  designScale: 1.0,
  designOffset: 0,
  centerDesign: 'seeds',
  lobeOpacity: 0.35,
  centerOpacity: 0.1,
  geometryRotation: 0,
  dharmaExtrusionOut: 0.296,
  dharmaExtrusionSide: 0.62,
  dharmaStemWidth: 0.39,
  dharmaCapHeight: 0.62,
  ringInnerRadius: 92,
  stripeSep: 6,
  stripeStart: 57,
  hullValley: 1.01,
  hullCoverage: 190,
  shellScale: 1,
  shellStroke: 0.8,
  ringStroke: 1.3,
  stripeStroke: 1.6,
};

export const LOTUS_STYLE: StyleConfig = {
  showFrame: true,
  showInfoLabels: true,
  frameDoubleTop: true,
  frameSquareHeader: true,
  frameScale: 1.15,
  frameHeaderOffset: 55,
  frameTickLength: 10,
  frameStrokeWidth: 1.5,
  uiFontSize: 22,
  uiFont: 'Inter',
  overallScale: 0.9,
  mainScale: 1,
  petals: 120,
  petalSize: 1.4,
  petalRoundness: 0.9,
  lobeCount: 9,
  lobeRadius: 46,
  lobeType: 'lotus',
  lobeDesign: 'triskelion',
  designScale: 0.79,
  designOffset: 20.7,
  centerDesign: 'seeds',
  lobeOpacity: 0.6,
  centerOpacity: 0.1,
  geometryRotation: 0,
  dharmaExtrusionOut: 0.7,
  dharmaExtrusionSide: 1,
  dharmaStemWidth: 0.152,
  dharmaCapHeight: 0,
  ringInnerRadius: 91,
  stripeSep: 4.14,
  stripeStart: 65,
  hullValley: 1.144,
  hullCoverage: 125,
  shellScale: 1.1,
  shellStroke: 1.2,
  ringStroke: 1,
  stripeStroke: 1.2,
};

export const DHARMA_STYLE: StyleConfig = {
  showFrame: true,
  showInfoLabels: true,
  frameDoubleTop: true,
  frameSquareHeader: true,
  frameScale: 1.045,
  frameHeaderOffset: 45,
  frameTickLength: 11,
  frameStrokeWidth: 1.4,
  uiFontSize: 22,
  uiFont: 'Inter',
  overallScale: 1.024,
  mainScale: 1.118,
  petals: 120,
  petalSize: 1.5,
  petalRoundness: 1,
  lobeCount: 4,
  lobeRadius: 26.7,
  lobeType: 'dharma',
  lobeDesign: 'seeds',
  designScale: 1,
  designOffset: 0,
  centerDesign: 'seeds',
  lobeOpacity: 0.65,
  centerOpacity: 0.15,
  geometryRotation: 0,
  dharmaExtrusionOut: 0.231,
  dharmaExtrusionSide: 0.45,
  dharmaStemWidth: 0.39,
  dharmaCapHeight: 0.62,
  ringInnerRadius: 94,
  stripeSep: 2.44,
  stripeStart: 72,
  hullValley: 1.17,
  hullCoverage: 195,
  shellScale: 0.897,
  shellStroke: 1,
  ringStroke: 0.9,
  stripeStroke: 1,
};

export interface StylePreset {
  id: StyleId;
  name: string;
  config: StyleConfig;
}

// Seed list for the Style Library. The repository wraps these into full Style
// records (adding builtin:true + timestamps) on first run.
export const BUILTIN_STYLE_PRESETS: StylePreset[] = [
  { id: 'preset:sunflower', name: 'Sunflower', config: SUNFLOWER_STYLE },
  { id: 'preset:lotus', name: 'Lotus', config: LOTUS_STYLE },
  { id: 'preset:dharma', name: 'Dharma', config: DHARMA_STYLE },
];

/** The default style for new cards / sequences. */
export const DEFAULT_STYLE_CONFIG: StyleConfig = SUNFLOWER_STYLE;
