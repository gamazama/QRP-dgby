import type { Card } from './card';

/**
 * A card's effective dwell time in milliseconds. Transition cards hold their
 * own `content.durationMs`; every other card uses its per-card `durationMs`
 * override, falling back to the sequence default `perCardMs`. This is the ONE
 * place duration is resolved — playback, export, the timeline and the patient
 * view all call it so they never drift.
 */
export function cardDurationMs(card: Card, perCardMs: number): number {
  if (card.content.kind === 'transition') return card.content.durationMs;
  return card.durationMs ?? perCardMs;
}
