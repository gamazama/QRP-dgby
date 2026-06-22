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
  scale?: number;
  circle?: boolean;
  invert?: boolean;
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
}
