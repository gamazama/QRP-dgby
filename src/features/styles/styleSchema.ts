import type { StyleConfig } from '@/domain/style';

// Declarative control schema for StyleConfig — adding a field is one entry here.
// `visibleWhen` hides controls that have no effect for the current config (e.g.
// dharma sliders when the lobe type isn't dharma/lotus).
export type StyleField = (
  | { kind: 'slider'; min: number; max: number; step: number }
  | { kind: 'toggle' }
  | { kind: 'select'; options: readonly string[] }
) & {
  key: keyof StyleConfig;
  label: string;
  visibleWhen?: (c: StyleConfig) => boolean;
};

export interface StyleFieldGroup {
  title: string;
  fields: StyleField[];
  visibleWhen?: (c: StyleConfig) => boolean;
}

// Relevance predicates.
const seedsLobe = (c: StyleConfig) => c.lobeType === 'sunflower' && c.lobeDesign === 'seeds';
const motifLobe = (c: StyleConfig) => c.lobeDesign === 'celtic' || c.lobeDesign === 'triskelion';
const dharmaLotus = (c: StyleConfig) => c.lobeType === 'dharma' || c.lobeType === 'lotus';
const sunflowerOrLotus = (c: StyleConfig) => c.lobeType === 'sunflower' || c.lobeType === 'lotus';

const slider = (
  key: keyof StyleConfig,
  label: string,
  min: number,
  max: number,
  step: number,
  visibleWhen?: (c: StyleConfig) => boolean,
): StyleField => ({ kind: 'slider', key, label, min, max, step, ...(visibleWhen ? { visibleWhen } : {}) });

const toggle = (key: keyof StyleConfig, label: string): StyleField => ({ kind: 'toggle', key, label });

export const STYLE_SCHEMA: StyleFieldGroup[] = [
  {
    title: 'Frame',
    fields: [
      toggle('showFrame', 'Show frame'),
      toggle('showInfoLabels', 'Info labels'),
      toggle('frameDoubleTop', 'Header bar'),
      toggle('frameSquareHeader', 'Boxed header'),
      slider('frameScale', 'Frame scale', 0.5, 2, 0.001),
      slider('frameHeaderOffset', 'Header height', 0, 100, 1),
      slider('frameTickLength', 'Tick length', 0, 30, 1),
      slider('frameStrokeWidth', 'Frame stroke', 0.1, 5, 0.1),
      slider('uiFontSize', 'Font size', 6, 48, 1),
      { kind: 'select', key: 'uiFont', label: 'Font', options: ['Inter', 'JetBrains Mono', 'Georgia', 'system-ui'] },
    ],
  },
  {
    title: 'Geometry',
    fields: [
      slider('overallScale', 'Overall scale', 0.3, 1.5, 0.001),
      slider('mainScale', 'Content scale', 0.3, 2, 0.001),
      { kind: 'select', key: 'lobeType', label: 'Lobe type', options: ['sunflower', 'dharma', 'lotus'] },
      slider('lobeCount', 'Lobe count', 1, 20, 1),
      slider('lobeRadius', 'Lobe radius', 5, 80, 0.1),
      slider('geometryRotation', 'Rotation', 0, 360, 1),
      slider('petals', 'Seed count', 0, 300, 1, seedsLobe),
      slider('petalSize', 'Seed size', 0.1, 5, 0.01, seedsLobe),
      slider('petalRoundness', 'Seed roundness', 0, 1, 0.01, seedsLobe),
    ],
  },
  {
    title: 'Lobe design',
    fields: [
      { kind: 'select', key: 'lobeDesign', label: 'Design', options: ['seeds', 'celtic', 'triskelion'] },
      slider('designScale', 'Design scale', 0.1, 2, 0.01, motifLobe),
      slider('designOffset', 'Design offset', -100, 100, 0.1, motifLobe),
      slider('lobeOpacity', 'Lobe opacity', 0, 1, 0.01),
    ],
  },
  {
    title: 'Center',
    fields: [
      { kind: 'select', key: 'centerDesign', label: 'Center', options: ['seeds', 'celtic', 'triskelion'] },
      slider('centerOpacity', 'Center opacity', 0, 1, 0.01),
    ],
  },
  {
    title: 'Dharma / Lotus',
    visibleWhen: dharmaLotus,
    fields: [
      slider('dharmaExtrusionOut', 'Extrusion out', 0, 1, 0.001),
      slider('dharmaExtrusionSide', 'Extrusion side', 0, 1.5, 0.001),
      slider('dharmaStemWidth', 'Stem / neck width', 0, 1, 0.001),
      slider('dharmaCapHeight', 'Cap height / offset', 0, 1, 0.001),
    ],
  },
  {
    title: 'Field',
    fields: [
      slider('ringInnerRadius', 'Ring inner radius', 40, 160, 1),
      slider('stripeSep', 'Stripe separation', 0, 20, 0.01),
      slider('stripeStart', 'Stripe start', 20, 120, 1),
      slider('hullValley', 'Hull valley / waist', 0.5, 1.5, 0.001, sunflowerOrLotus),
      slider('hullCoverage', 'Hull coverage', 50, 300, 1, sunflowerOrLotus),
    ],
  },
  {
    title: 'Strokes',
    fields: [
      slider('shellScale', 'Shell scale', 0.5, 1.5, 0.001),
      slider('shellStroke', 'Shell stroke', 0, 5, 0.1),
      slider('ringStroke', 'Ring stroke', 0, 5, 0.1),
      slider('stripeStroke', 'Stripe stroke', 0, 5, 0.1),
    ],
  },
];
