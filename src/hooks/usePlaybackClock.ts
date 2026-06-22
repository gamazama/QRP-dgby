import { useEffect } from 'react';
import { useSequencerStore } from '@/store/sequencerStore';

// Advances the active card while playing. Re-arms a one-shot timer per card so
// transitions can run on their own (shorter) duration. The master clock the
// future biofeedback Session will hang measurements off.
export function usePlaybackClock() {
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const activeIndex = useSequencerStore((s) => s.activeIndex);
  const cards = useSequencerStore((s) => s.sequence.cards);
  const perCardMs = useSequencerStore((s) => s.sequence.timing.perCardMs);

  useEffect(() => {
    if (!isPlaying || cards.length === 0) return;
    const card = cards[activeIndex];
    const duration = card?.content.kind === 'transition' ? card.content.durationMs : perCardMs;
    const t = setTimeout(() => useSequencerStore.getState().advance(), Math.max(200, duration));
    return () => clearTimeout(t);
  }, [isPlaying, activeIndex, cards, perCardMs]);
}
