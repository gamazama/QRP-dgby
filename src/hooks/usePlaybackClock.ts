import { useEffect } from 'react';
import { useSequencerStore } from '@/store/sequencerStore';
import { cardDurationMs } from '@/domain/timing';

// Advances the active card while playing. Keyed on the active card's id + its
// duration (NOT the whole cards array) so editing an off-screen card or an
// unrelated rate while playing doesn't restart the current card's dwell. The
// master clock the future biofeedback Session will hang measurements off.
export function usePlaybackClock() {
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const activeIndex = useSequencerStore((s) => s.activeIndex);
  const activeCard = useSequencerStore((s) => s.sequence.cards[s.activeIndex]);
  const perCardMs = useSequencerStore((s) => s.sequence.timing.perCardMs);

  const duration = activeCard ? cardDurationMs(activeCard, perCardMs) : perCardMs;
  const activeId = activeCard?.id;

  useEffect(() => {
    if (!isPlaying || activeId === undefined) return;
    const t = setTimeout(() => useSequencerStore.getState().advance(), Math.max(200, duration));
    return () => clearTimeout(t);
  }, [isPlaying, activeIndex, activeId, duration]);
}
