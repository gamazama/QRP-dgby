import type { CardId, RemedyRef, StyleId } from './ids';
import type { RateBase } from './remedy';
import type { StyleConfig } from './style';

export type TransitionShape = 'sunflower' | 'celtic' | 'triskelion';
export type TransitionSpin = 'off' | 'cw' | 'ccw' | 'alternate';

/**
 * What a card actually shows. The rate ALWAYS lives on `content.sequence` for
 * remedy/data cards — there is no zero-fill-from-style path (the prototype bug).
 */
export type CardContent =
  | { kind: 'remedy'; ref: RemedyRef; sequence: number[]; base: RateBase }
  | { kind: 'data'; sequence: number[]; base: RateBase }
  | { kind: 'image'; light: string; dark?: string; invert?: boolean; frame?: boolean }
  | {
      kind: 'transition';
      shape: TransitionShape;
      spin: TransitionSpin;
      spinSeconds: number;
      durationMs: number;
    };

export interface CardCenterImage {
  src: string;
  circle?: boolean;
  invert?: boolean;
  /** When true, `src` is an isolated symbol drawn to fill the centre circle
   *  directly. When false/absent, the centre circle is cropped out of a full
   *  card image (the printed-photo-circle geometry). */
  whole?: boolean;
}

/** An instance in a sequence: a remedy/data/image/transition + an applied style. */
export interface Card {
  id: CardId;
  title: string;
  description?: string;
  /** Reference to a Style; editing the style propagates to all referencing cards. */
  styleId: StyleId;
  /** Sparse per-card deviations, merged over the referenced style's config. */
  overrides?: Partial<StyleConfig>;
  content: CardContent;
  centerImage?: CardCenterImage;
  /**
   * Per-card dwell time (ms). When unset, the card uses the sequence's default
   * `timing.perCardMs`. Transition cards carry their own `content.durationMs`
   * instead — see `cardDurationMs`.
   */
  durationMs?: number;
  /** Practitioner's free-text note on this card (not shown on the card itself). */
  notes?: string;
}
