import type { PackId, RemedyRef } from './ids';

export type RateBase = 9 | 10 | 44;

export interface RemedyImage {
  /** Pack-relative path to the light (black-ink) WebP layer. */
  light: string;
  /** Pack-relative path to the dark (white-ink) WebP layer, when present. */
  dark?: string;
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
  image?: RemedyImage;
  /** Practitioner's free-text note. Editable on any card via a notes overlay. */
  notes?: string;
}
