import { beforeEach, describe, expect, it } from 'vitest';
import type { Remedy } from '@/domain/remedy';
import { useSequencerStore } from './sequencerStore';

const get = () => useSequencerStore.getState();

const agrimony: Remedy = {
  id: 'agrimony',
  packId: 'bach-flowers-v1',
  ref: 'bach-flowers-v1:agrimony',
  name: 'Agrimony',
  category: 'bach-flowers',
  base: 44,
  sequence: [2, 12, 17, 34, 40],
};
const aspen: Remedy = { ...agrimony, id: 'aspen', ref: 'bach-flowers-v1:aspen', name: 'Aspen', sequence: [4, 11, 23, 34, 39] };

beforeEach(() => get().newSequence('Test'));

describe('sequencerStore', () => {
  it('adds remedy cards preserving their rate and selecting the first', () => {
    get().addRemedyCards([agrimony], 'preset:sunflower');
    const card = get().sequence.cards[0]!;
    expect(card.title).toBe('Agrimony');
    expect(card.styleId).toBe('preset:sunflower');
    expect(card.content.kind).toBe('remedy');
    if (card.content.kind === 'remedy') expect(card.content.sequence).toEqual([2, 12, 17, 34, 40]);
    expect(get().selectedIds).toEqual([card.id]);
  });

  it('deletes a card and restores it with undo', () => {
    get().addRemedyCards([agrimony, aspen], 'preset:sunflower');
    const firstId = get().sequence.cards[0]!.id;
    get().deleteCard(firstId);
    expect(get().sequence.cards.length).toBe(1);
    get().undo();
    expect(get().sequence.cards.length).toBe(2);
  });

  it('keeps the active card selected after reorder', () => {
    get().addDataCard('preset:sunflower');
    get().addDataCard('preset:lotus');
    get().addDataCard('preset:dharma');
    get().selectCard(2);
    const activeId = get().sequence.cards[2]!.id;
    get().reorderCards(2, 0);
    expect(get().sequence.cards[0]!.id).toBe(activeId);
    expect(get().activeIndex).toBe(0);
  });

  it('applies a style to the whole selection in one op', () => {
    get().addDataCard('preset:sunflower');
    get().addDataCard('preset:sunflower');
    get().selectAll();
    get().applyStyleToSelection('preset:dharma');
    expect(get().sequence.cards.every((c) => c.styleId === 'preset:dharma')).toBe(true);
  });

  it('toggles a card to/from a transition', () => {
    get().addDataCard('preset:sunflower');
    const id = get().sequence.cards[0]!.id;
    get().setTransition(id, true);
    expect(get().sequence.cards[0]!.content.kind).toBe('transition');
    get().setTransition(id, false);
    expect(get().sequence.cards[0]!.content.kind).toBe('data');
  });

  it('multi-select via toggle never empties', () => {
    get().addDataCard('preset:sunflower');
    get().addDataCard('preset:sunflower');
    get().selectCard(0);
    get().toggleSelectAt(1);
    expect(get().selectedIds.length).toBe(2);
    get().toggleSelectAt(1);
    expect(get().selectedIds.length).toBe(1);
  });
});
