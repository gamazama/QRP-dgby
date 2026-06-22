import type { StyleConfig } from '@/domain/style';

// Declarative control schema for StyleConfig — adding a field is one entry here
// (no bespoke JSX), the lesson from the prototype's 512-line hand-wired tuner.
export type StyleField =
  | { kind: 'slider'; key: keyof StyleConfig; label: string; min: number; max: number; step: number }
  | { kind: 'toggle'; key: keyof StyleConfig; label: string }
  | { kind: 'select'; key: keyof StyleConfig; label: string; options: readonly string[] };

export interface StyleFieldGroup {
  title: string;
  fields: StyleField[];
}

const slider = (key: keyof StyleConfig, label: string, min: number, max: number, step: number): StyleField => ({ kind: 'slider', key, label, min, max, step });
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
      slider('petals', 'Seed count', 0, 300, 1),
      slider('petalSize', 'Seed size', 0.1, 5, 0.01),
      slider('petalRoundness', 'Seed roundness', 0, 1, 0.01),
    ],
  },
  {
    title: 'Lobe design',
    fields: [
      { kind: 'select', key: 'lobeDesign', label: 'Design', options: ['seeds', 'celtic', 'triskelion'] },
      slider('designScale', 'Design scale', 0.1, 2, 0.01),
      slider('designOffset', 'Design offset', -100, 100, 0.1),
      slider('lobeOpacity', 'Lobe opacity', 0, 1, 0.01),
    ],
  },
  {
    title: 'Center',
    fields: [
      { kind: 'select', key: 'centerDesign', label: 'Center', options: ['seeds', 'celtic', 'triskelion', 'uranus', 'image'] },
      slider('centerOpacity', 'Center opacity', 0, 1, 0.01),
    ],
  },
  {
    title: 'Dharma',
    fields: [
      slider('dharmaExtrusionOut', 'Extrusion out', 0, 1, 0.001),
      slider('dharmaExtrusionSide', 'Extrusion side', 0, 1.5, 0.001),
      slider('dharmaStemWidth', 'Stem width', 0, 1, 0.001),
      slider('dharmaCapHeight', 'Cap height', 0, 1, 0.001),
    ],
  },
  {
    title: 'Field',
    fields: [
      slider('ringInnerRadius', 'Ring inner radius', 40, 160, 1),
      slider('stripeSep', 'Stripe separation', 0, 20, 0.01),
      slider('stripeStart', 'Stripe start', 20, 120, 1),
      slider('hullValley', 'Hull valley', 0.5, 1.5, 0.001),
      slider('hullCoverage', 'Hull coverage', 50, 300, 1),
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
