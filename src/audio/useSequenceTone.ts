import { useCallback, useEffect, useRef, useState } from 'react';
import { buildTonePlan } from './toneMath';
import { isToneSupported, SequenceTonePlayer } from './SequenceTonePlayer';

/**
 * Owns a SequenceTonePlayer for one card's rate. `toggle` plays/stops; the tone
 * stops itself when the voiced rate changes (no stale audio) or the card panel
 * unmounts. `supported` is false for non-base-9 rates and in non-audio
 * environments (jsdom/SSR), so callers can disable the control.
 */
export function useSequenceTone(sequence: number[], base: number) {
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<SequenceTonePlayer | null>(null);
  const supported = base === 9 && isToneSupported();

  const stop = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current = null;
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playerRef.current) {
      stop();
      return;
    }
    if (!supported) return;
    const player = new SequenceTonePlayer(buildTonePlan(sequence));
    playerRef.current = player;
    player.start();
    setPlaying(true);
  }, [supported, sequence, stop]);

  // Stop a running tone the moment its rate/base changes (the audio would no
  // longer match the card) and when the panel unmounts. `stop` is stable.
  const key = `${base}:${sequence.join(',')}`;
  useEffect(() => () => stop(), [key, stop]);

  return { playing, toggle, stop, supported };
}
