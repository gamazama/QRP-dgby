import { z } from 'zod';

// Runtime validation at trust boundaries (fetched packs, imported files, and
// defensively on persisted reads). Kept aligned with the hand-written interfaces
// in this folder; `.parse()` results are cast to those interfaces by callers.

export const RateBaseSchema = z.union([z.literal(9), z.literal(10), z.literal(44)]);

export const StyleConfigSchema = z.object({
  showFrame: z.boolean(),
  showInfoLabels: z.boolean(),
  frameDoubleTop: z.boolean(),
  frameSquareHeader: z.boolean(),
  frameScale: z.number(),
  frameHeaderOffset: z.number(),
  frameTickLength: z.number(),
  frameStrokeWidth: z.number(),
  uiFontSize: z.number(),
  uiFont: z.string(),
  overallScale: z.number(),
  mainScale: z.number(),
  petals: z.number(),
  petalSize: z.number(),
  petalRoundness: z.number(),
  lobeCount: z.number(),
  lobeRadius: z.number(),
  lobeType: z.enum(['sunflower', 'dharma', 'lotus']),
  lobeDesign: z.enum(['seeds', 'celtic', 'triskelion']),
  designScale: z.number(),
  designOffset: z.number(),
  centerDesign: z.enum(['seeds', 'celtic', 'triskelion', 'uranus', 'image']),
  lobeOpacity: z.number(),
  centerOpacity: z.number(),
  geometryRotation: z.number(),
  dharmaExtrusionOut: z.number(),
  dharmaExtrusionSide: z.number(),
  dharmaStemWidth: z.number(),
  dharmaCapHeight: z.number(),
  ringInnerRadius: z.number(),
  stripeSep: z.number(),
  stripeStart: z.number(),
  hullValley: z.number(),
  hullCoverage: z.number(),
  shellScale: z.number(),
  shellStroke: z.number(),
  ringStroke: z.number(),
  stripeStroke: z.number(),
});

export const StyleSchema = z.object({
  id: z.string(),
  name: z.string(),
  config: StyleConfigSchema,
  builtin: z.boolean(),
  tags: z.array(z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const RemedyImageSchema = z.object({
  light: z.string(),
  dark: z.string().optional(),
});

export const RemedySchema = z.object({
  id: z.string(),
  packId: z.string(),
  ref: z.string(),
  name: z.string(),
  subheading: z.string().optional(),
  category: z.string(),
  base: RateBaseSchema,
  sequence: z.array(z.number()),
  rateType: z.string().optional(),
  image: RemedyImageSchema.optional(),
  notes: z.string().optional(),
});

export const CardContentSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('remedy'),
    ref: z.string(),
    sequence: z.array(z.number()),
    base: RateBaseSchema,
  }),
  z.object({ kind: z.literal('data'), sequence: z.array(z.number()), base: RateBaseSchema }),
  z.object({
    kind: z.literal('image'),
    light: z.string(),
    dark: z.string().optional(),
    invert: z.boolean().optional(),
    frame: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('transition'),
    shape: z.enum(['sunflower', 'celtic', 'triskelion']),
    spin: z.enum(['off', 'cw', 'ccw', 'alternate']),
    spinSeconds: z.number(),
    durationMs: z.number(),
  }),
]);

export const CardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  styleId: z.string(),
  overrides: StyleConfigSchema.partial().optional(),
  content: CardContentSchema,
  centerImage: z
    .object({
      src: z.string(),
      scale: z.number().optional(),
      circle: z.boolean().optional(),
      invert: z.boolean().optional(),
    })
    .optional(),
});

export const SequenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  patientRef: z.string().optional(),
  notes: z.string().optional(),
  cards: z.array(CardSchema),
  timing: z.object({ perCardMs: z.number(), crossfadeMs: z.number() }),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const PackTaxonomyEntrySchema = z.object({ id: z.string(), label: z.string() });

export const PackManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  taxonomy: z.array(PackTaxonomyEntrySchema),
  remedies: z.array(RemedySchema.omit({ packId: true, ref: true })),
});

export const PackSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  count: z.number(),
  categories: z.array(z.string()),
  manifestUrl: z.string(),
  searchIndexUrl: z.string().optional(),
});

export const PackIndexSchema = z.object({
  generatedAt: z.string(),
  packs: z.array(PackSummarySchema),
});
