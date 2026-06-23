import type { StyleConfig } from '@/domain/style';

// Declarative control schema for StyleConfig — adding a field is one entry here.
// `visibleWhen` hides controls that have no effect for the current config, AND
// keeps every conditional control in the SAME group as the toggle/select that
// reveals it (enable a feature → its extra controls appear right there).
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
const framed = (c: StyleConfig) => c.showFrame;
const framedHeader = (c: StyleConfig) => c.showFrame && c.frameDoubleTop;
const framedOrLabels = (c: StyleConfig) => c.showFrame || c.showInfoLabels;
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

const toggle = (key: keyof StyleConfig, label: string, visibleWhen?: (c: StyleConfig) => boolean): StyleField => ({
  kind: 'toggle',
  key,
  label,
  ...(visibleWhen ? { visibleWhen } : {}),
});

export const STYLE_SCHEMA: StyleFieldGroup[] = [
  {
    // The frame's controls only appear once "Show frame" is on; the header-bar
    // sub-controls only once "Header bar" is on.
    title: 'Frame',
    fields: [
      toggle('showFrame', 'Show frame'),
      toggle('showInfoLabels', 'Info labels'),
      toggle('frameDoubleTop', 'Header bar', framed),
      toggle('frameSquareHeader', 'Boxed header', framedHeader),
      slider('frameScale', 'Frame scale', 0.5, 2, 0.001, framed),
      slider('frameHeaderOffset', 'Header height', 0, 100, 1, framedHeader),
      slider('frameTickLength', 'Tick length', 0, 30, 1, framed),
      slider('frameStrokeWidth', 'Frame stroke', 0.1, 5, 0.1, framed),
      slider('uiFontSize', 'Font size', 6, 48, 1, framedOrLabels),
      { kind: 'select', key: 'uiFont', label: 'Font', options: ['Inter', 'JetBrains Mono', 'Georgia', 'system-ui'], visibleWhen: framedOrLabels },
    ],
  },
  {
    // Lobe type lives here, so the controls it reveals (dharma/lotus shaping,
    // sunflower/lotus hull) appear in this same group.
    title: 'Geometry',
    fields: [
      slider('overallScale', 'Overall scale', 0.3, 1.5, 0.001),
      slider('mainScale', 'Content scale', 0.3, 2, 0.001),
      { kind: 'select', key: 'lobeType', label: 'Lobe type', options: ['sunflower', 'dharma', 'lotus'] },
      slider('lobeCount', 'Lobe count', 1, 20, 1),
      slider('lobeRadius', 'Lobe radius', 5, 80, 0.1),
      slider('geometryRotation', 'Rotation', 0, 360, 1),
      slider('dharmaExtrusionOut', 'Extrusion out', 0, 1, 0.001, dharmaLotus),
      slider('dharmaExtrusionSide', 'Extrusion side', 0, 1.5, 0.001, dharmaLotus),
      slider('dharmaStemWidth', 'Stem / neck width', 0, 1, 0.001, dharmaLotus),
      slider('dharmaCapHeight', 'Cap height / offset', 0, 1, 0.001, dharmaLotus),
      slider('hullValley', 'Hull valley / waist', 0.5, 1.5, 0.001, sunflowerOrLotus),
      slider('hullCoverage', 'Hull coverage', 50, 300, 1, sunflowerOrLotus),
    ],
  },
  {
    // The design select reveals either the seed controls or the motif controls.
    title: 'Lobe design',
    fields: [
      { kind: 'select', key: 'lobeDesign', label: 'Design', options: ['seeds', 'celtic', 'triskelion'] },
      slider('petals', 'Seed count', 0, 300, 1, seedsLobe),
      slider('petalSize', 'Seed size', 0.1, 5, 0.01, seedsLobe),
      slider('petalRoundness', 'Seed roundness', 0, 1, 0.01, seedsLobe),
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
      slider('centerImageScale', 'Photo size', 0.2, 1, 0.01),
    ],
  },
  {
    title: 'Field',
    fields: [
      slider('ringInnerRadius', 'Ring inner radius', 40, 160, 1),
      slider('stripeSep', 'Stripe separation', 0, 20, 0.01),
      slider('stripeStart', 'Stripe start', 20, 120, 1),
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
