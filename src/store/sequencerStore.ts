import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Sequence, SequenceTiming } from '@/domain/sequence';
import type { Card, TransitionShape, TransitionSpin } from '@/domain/card';
import type { CardId, StyleId } from '@/domain/ids';
import type { Remedy } from '@/domain/remedy';
import { newCardId, newSequenceId } from '@/lib/id';

// The working prescription's runtime state. Ported from the prototype's
// useSequencer (deck/selection/undo/playback), re-modelled onto a single
// Sequence whose `cards` reference styles by id. Pure state + actions: a
// persistence hook subscribes and saves via SequenceRepository; a playback hook
// drives `advance()`. Selectors keep React subscriptions slice-scoped.

export const DEFAULT_TIMING: SequenceTiming = { perCardMs: 1500, crossfadeMs: 500 };
const DEFAULT_TRANSITION = {
  shape: 'sunflower' as TransitionShape,
  spin: 'ccw' as TransitionSpin,
  spinSeconds: 24,
  durationMs: 2500,
};
const DATA_CARD_LENGTH = 9;

const ts = () => Date.now();

export function createEmptySequence(name = 'Untitled prescription'): Sequence {
  const t = ts();
  return { id: newSequenceId(), name, cards: [], timing: { ...DEFAULT_TIMING }, createdAt: t, updatedAt: t };
}

interface SequencerState {
  sequence: Sequence;
  activeIndex: number;
  selectedIds: CardId[];
  isPlaying: boolean;

  loadSequence: (seq: Sequence) => void;
  newSequence: (name?: string) => void;
  setName: (name: string) => void;
  setPatientRef: (ref: string) => void;
  setNotes: (notes: string) => void;
  setTiming: (t: Partial<SequenceTiming>) => void;

  addRemedyCards: (remedies: Remedy[], styleId: StyleId) => void;
  addImageCards: (remedies: Remedy[], styleId: StyleId) => void;
  addDataCard: (styleId: StyleId) => void;
  addTransitionCard: (styleId: StyleId) => void;
  duplicateCard: (id: CardId) => void;
  deleteCard: (id: CardId) => void;
  bulkDelete: (ids: CardId[]) => void;
  reorderCards: (from: number, to: number) => void;
  updateCard: (id: CardId, patch: Partial<Card>) => void;
  setCardRate: (id: CardId, sequence: number[]) => void;
  /** Per-card dwell. `undefined` clears the override (back to the default). */
  setCardDuration: (id: CardId, ms: number | undefined) => void;
  applyStyleToSelection: (styleId: StyleId) => void;
  setTransition: (id: CardId, on: boolean) => void;

  selectCard: (index: number) => void;
  toggleSelectAt: (index: number) => void;
  selectRangeTo: (index: number) => void;
  selectAll: () => void;

  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  advance: () => void;
  undo: () => void;
}

// Keep the active card always in the selection, and drop ids that no longer exist.
function reconcile(cards: Card[], activeIndex: number, selectedIds: CardId[]): CardId[] {
  const valid = new Set(cards.map((c) => c.id));
  let next = selectedIds.filter((id) => valid.has(id));
  const activeId = cards[activeIndex]?.id;
  if (activeId && !next.includes(activeId)) next = [activeId, ...next];
  if (next.length === 0 && activeId) next = [activeId];
  return next;
}

const clampIndex = (i: number, len: number) => (len === 0 ? 0 : Math.max(0, Math.min(i, len - 1)));

export const useSequencerStore = create<SequencerState>()(
  subscribeWithSelector((set, get) => {
    // Undo history (kept out of reactive state).
    const history: { cards: Card[]; activeIndex: number }[] = [];
    const snapshot = () => {
      const { sequence, activeIndex } = get();
      history.push({ cards: sequence.cards, activeIndex });
      if (history.length > 25) history.shift();
    };

    // Append cards and select the first newly-added one.
    const append = (newCards: Card[]) => {
      if (newCards.length === 0) return;
      snapshot();
      set((s) => {
        const firstNew = s.sequence.cards.length;
        const cards = [...s.sequence.cards, ...newCards];
        return {
          sequence: { ...s.sequence, cards, updatedAt: ts() },
          activeIndex: firstNew,
          selectedIds: [newCards[0]!.id],
          isPlaying: false,
        };
      });
    };

    return {
      sequence: createEmptySequence(),
      activeIndex: 0,
      selectedIds: [],
      isPlaying: false,

      loadSequence: (seq) =>
        set({
          sequence: seq,
          activeIndex: 0,
          selectedIds: seq.cards[0] ? [seq.cards[0].id] : [],
          isPlaying: false,
        }),

      newSequence: (name) => {
        const seq = createEmptySequence(name);
        set({ sequence: seq, activeIndex: 0, selectedIds: [], isPlaying: false });
      },

      setName: (name) => set((s) => ({ sequence: { ...s.sequence, name, updatedAt: ts() } })),
      setPatientRef: (patientRef) =>
        set((s) => ({ sequence: { ...s.sequence, patientRef, updatedAt: ts() } })),
      setNotes: (notes) => set((s) => ({ sequence: { ...s.sequence, notes, updatedAt: ts() } })),
      setTiming: (t) =>
        set((s) => ({ sequence: { ...s.sequence, timing: { ...s.sequence.timing, ...t }, updatedAt: ts() } })),

      addRemedyCards: (remedies, styleId) =>
        append(
          remedies.map((r) => ({
            id: newCardId(),
            title: r.name,
            ...(r.subheading ? { description: r.subheading } : {}),
            styleId,
            content: { kind: 'remedy' as const, ref: r.ref, sequence: r.sequence, base: r.base },
          })),
        ),

      addImageCards: (remedies, styleId) =>
        append(
          remedies.flatMap((r) => {
            if (!r.image) return [];
            const light = `packs/${r.packId}/${r.image.light}`;
            const content = r.image.dark
              ? { kind: 'image' as const, light, dark: `packs/${r.packId}/${r.image.dark}` }
              : { kind: 'image' as const, light };
            return [{ id: newCardId(), title: r.name, styleId, content }];
          }),
        ),

      addDataCard: (styleId) =>
        append([
          {
            id: newCardId(),
            title: 'Custom rate',
            styleId,
            content: {
              kind: 'data' as const,
              sequence: new Array<number>(DATA_CARD_LENGTH).fill(0),
              base: 9,
            },
          },
        ]),

      addTransitionCard: (styleId) =>
        append([
          { id: newCardId(), title: 'Transition', styleId, content: { kind: 'transition', ...DEFAULT_TRANSITION } },
        ]),

      duplicateCard: (id) => {
        snapshot();
        set((s) => {
          const idx = s.sequence.cards.findIndex((c) => c.id === id);
          if (idx === -1) return s;
          const src = s.sequence.cards[idx]!;
          const copy: Card = { ...src, id: newCardId(), title: `${src.title} (Copy)` };
          const cards = [...s.sequence.cards];
          cards.splice(idx + 1, 0, copy);
          return {
            sequence: { ...s.sequence, cards, updatedAt: ts() },
            activeIndex: idx + 1,
            selectedIds: [copy.id],
            isPlaying: false,
          };
        });
      },

      deleteCard: (id) => {
        snapshot();
        set((s) => {
          const cards = s.sequence.cards.filter((c) => c.id !== id);
          const activeIndex = clampIndex(s.activeIndex, cards.length);
          return {
            sequence: { ...s.sequence, cards, updatedAt: ts() },
            activeIndex,
            selectedIds: reconcile(cards, activeIndex, s.selectedIds),
          };
        });
      },

      bulkDelete: (ids) => {
        if (ids.length === 0) return;
        snapshot();
        set((s) => {
          const idSet = new Set(ids);
          const cards = s.sequence.cards.filter((c) => !idSet.has(c.id));
          const activeIndex = clampIndex(s.activeIndex, cards.length);
          return {
            sequence: { ...s.sequence, cards, updatedAt: ts() },
            activeIndex,
            selectedIds: reconcile(cards, activeIndex, s.selectedIds),
            isPlaying: false,
          };
        });
      },

      reorderCards: (from, to) => {
        if (from === to) return;
        snapshot();
        set((s) => {
          const cards = [...s.sequence.cards];
          const moved = cards[from];
          if (!moved) return s;
          cards.splice(from, 1);
          cards.splice(to, 0, moved);
          const activeId = s.sequence.cards[s.activeIndex]?.id;
          const activeIndex = activeId ? cards.findIndex((c) => c.id === activeId) : s.activeIndex;
          return { sequence: { ...s.sequence, cards, updatedAt: ts() }, activeIndex: clampIndex(activeIndex, cards.length) };
        });
      },

      updateCard: (id, patch) =>
        set((s) => ({
          sequence: {
            ...s.sequence,
            cards: s.sequence.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            updatedAt: ts(),
          },
        })),

      setCardRate: (id, sequence) =>
        set((s) => ({
          sequence: {
            ...s.sequence,
            cards: s.sequence.cards.map((c) => {
              if (c.id !== id) return c;
              if (c.content.kind !== 'remedy' && c.content.kind !== 'data') return c;
              return { ...c, content: { ...c.content, sequence } };
            }),
            updatedAt: ts(),
          },
        })),

      setCardDuration: (id, ms) =>
        set((s) => ({
          sequence: {
            ...s.sequence,
            cards: s.sequence.cards.map((c) => {
              if (c.id !== id) return c;
              // Transitions hold their dwell in content; everyone else on the card.
              if (c.content.kind === 'transition') {
                return ms === undefined ? c : { ...c, content: { ...c.content, durationMs: ms } };
              }
              if (ms === undefined) {
                const next = { ...c };
                delete next.durationMs;
                return next;
              }
              return { ...c, durationMs: ms };
            }),
            updatedAt: ts(),
          },
        })),

      applyStyleToSelection: (styleId) => {
        snapshot();
        set((s) => {
          const idSet = new Set(s.selectedIds);
          return {
            sequence: {
              ...s.sequence,
              cards: s.sequence.cards.map((c) => (idSet.has(c.id) ? { ...c, styleId } : c)),
              updatedAt: ts(),
            },
          };
        });
      },

      setTransition: (id, on) => {
        snapshot();
        set((s) => ({
          sequence: {
            ...s.sequence,
            cards: s.sequence.cards.map((c) => {
              if (c.id !== id) return c;
              if (on) {
                if (c.content.kind === 'transition') return c;
                return { ...c, content: { kind: 'transition', ...DEFAULT_TRANSITION } };
              }
              if (c.content.kind !== 'transition') return c;
              return {
                ...c,
                content: { kind: 'data', sequence: new Array<number>(DATA_CARD_LENGTH).fill(0), base: 9 },
              };
            }),
            updatedAt: ts(),
          },
        }));
      },

      selectCard: (index) =>
        set((s) => {
          const id = s.sequence.cards[index]?.id;
          return { activeIndex: clampIndex(index, s.sequence.cards.length), selectedIds: id ? [id] : [], isPlaying: false };
        }),

      toggleSelectAt: (index) =>
        set((s) => {
          const id = s.sequence.cards[index]?.id;
          if (!id) return s;
          if (s.selectedIds.includes(id)) {
            if (s.selectedIds.length === 1) return s;
            const next = s.selectedIds.filter((x) => x !== id);
            const pIdx = s.sequence.cards.findIndex((c) => c.id === next[0]);
            return { selectedIds: next, activeIndex: pIdx === -1 ? s.activeIndex : pIdx, isPlaying: false };
          }
          return { selectedIds: [...s.selectedIds, id], activeIndex: index, isPlaying: false };
        }),

      selectRangeTo: (index) =>
        set((s) => {
          const from = s.activeIndex;
          const [a, b] = from <= index ? [from, index] : [index, from];
          return {
            selectedIds: s.sequence.cards.slice(a, b + 1).map((c) => c.id),
            activeIndex: clampIndex(index, s.sequence.cards.length),
            isPlaying: false,
          };
        }),

      selectAll: () => set((s) => ({ selectedIds: s.sequence.cards.map((c) => c.id), isPlaying: false })),

      togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
      setPlaying: (isPlaying) => set({ isPlaying }),
      advance: () =>
        set((s) => {
          const len = s.sequence.cards.length;
          if (len === 0) return s;
          return { activeIndex: (s.activeIndex + 1) % len };
        }),

      undo: () => {
        const snap = history.pop();
        if (!snap) return;
        set((s) => ({
          sequence: { ...s.sequence, cards: snap.cards, updatedAt: ts() },
          activeIndex: clampIndex(snap.activeIndex, snap.cards.length),
          selectedIds: reconcile(snap.cards, clampIndex(snap.activeIndex, snap.cards.length), []),
          isPlaying: false,
        }));
      },
    };
  }),
);
