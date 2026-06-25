import { useEffect, useMemo, useRef } from 'react';
import { useSequencerStore } from '@/store/sequencerStore';
import { buildTonePlan } from './toneMath';
import { isToneSupported, SequenceTonePlayer } from './SequenceTonePlayer';

/**
 * Sounds the active card during Present mode, gliding the tone onto each new
 * card as the presentation advances (or as you skip). `enabled` gates it on the
 * present-mode sound toggle. Only base-9 rate cards sound; other cards hold the
 * drone as an ambient pad. One continuous player is kept and re-tuned, so the
 * drone never restarts between cards. Cleans up when disabled or on unmount.
 */
export function usePresentationTone(enabled: boolean): void {
  const activeCard = useSequencerStore((s) => s.sequence.cards[s.activeIndex]);
  const playerRef = useRef<SequenceTonePlayer | null>(null);

  const content = activeCard?.content;
  const plan = useMemo(() => {
    if (content && (content.kind === 'remedy' || content.kind === 'data') && content.base === 9) {
      return buildTonePlan(content.sequence);
    }
    return null;
  }, [content]);

  const active = enabled && isToneSupported();

  useEffect(() => {
    if (!active) {
      playerRef.current?.stop();
      playerRef.current = null;
      return;
    }
    if (playerRef.current) {
      playerRef.current.update(plan);
    } else if (plan) {
      // Start only once we reach the first tonal card.
      const player = new SequenceTonePlayer(plan);
      playerRef.current = player;
      player.start();
    }
  }, [active, plan]);

  useEffect(
    () => () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    },
    [],
  );
}
