import type { PackId, RemedyRef } from './ids';

export type RateBase = 9 | 10 | 44;

export interface RemedyImage {
  /** Pack-relative path to the light (black-ink) WebP layer. */
  light: string;
  /** Pack-relative path to the dark (white-ink) WebP layer, when present. */
  dark?: string;
  /** Pack-relative path to an isolated centre-symbol asset (e.g. a chakra glyph),
   *  drawn directly in the card centre instead of cropping it out of `light`. */
  center?: string;
  /** Centre artwork is monochrome line-art → invert it in dark mode so it reads
   *  as white-on-dark. Coloured symbols leave this false. */
  invert?: boolean;
}

export interface Remedy {
  /** Unique within its pack (e.g. "agrimony"). */
  id: string;
  packId: PackId;
  /** Stable global id: `${packId}:${id}`. */
  ref: RemedyRef;
  name: string;
  subheading?: string;
  category: string;
  base: RateBase;
  /** THE RATE — the number sequence the card renders (the prototype dropped this). */
  sequence: number[];
  rateType?: string;
  /** Where the rate came from — the rate-book/system, e.g. "Combe" or "Sulis".
   *  Shown in brackets on the card's rate label. */
  source?: string;
  image?: RemedyImage;
  /** Practitioner's free-text note. Editable on any card via a notes overlay. */
  notes?: string;
  /** Transient: true when a shipped pack card has practitioner edits applied. */
  modified?: boolean;
}
