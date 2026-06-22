import { useEffect, useRef } from 'react';
import { useRepositories } from '@/data/repository-context';
import { createEmptySequence, useSequencerStore } from '@/store/sequencerStore';

// Loads the last-open prescription (or creates one) on mount, then debounce-saves
// the working sequence to IndexedDB on every change. localStorage holds only the
// tiny last-sequence-id pointer.
export function useSequencePersistence() {
  const { sequences, settings } = useRepositories();
  const ready = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const lastId = await settings.get<string | null>('lastSequenceId', null);
      const existing = lastId ? await sequences.getById(lastId) : null;
      if (cancelled) return;
      const current = useSequencerStore.getState().sequence;
      if (current.cards.length > 0) {
        // The user already started a deck before load resolved — keep it, don't clobber.
        await sequences.save(current);
        await settings.set('lastSequenceId', current.id);
      } else if (existing) {
        useSequencerStore.getState().loadSequence(existing);
      } else {
        const seq = createEmptySequence();
        await sequences.save(seq);
        await settings.set('lastSequenceId', seq.id);
        if (!cancelled) useSequencerStore.getState().loadSequence(seq);
      }
      ready.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [sequences, settings]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useSequencerStore.subscribe(
      (s) => s.sequence,
      (seq) => {
        if (!ready.current) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void sequences.save(seq);
          void settings.set('lastSequenceId', seq.id);
        }, 400);
      },
    );
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [sequences, settings]);
}
