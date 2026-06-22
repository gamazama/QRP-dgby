import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { LocalStyleRepository } from './LocalStyleRepository';
import { LocalSequenceRepository } from './LocalSequenceRepository';
import { LocalRemedyRepository } from './LocalRemedyRepository';
import { LocalSettingsRepository } from './LocalSettingsRepository';
import { SUNFLOWER_STYLE } from '@/engine/presets';
import { newSequenceId, newStyleId } from '@/lib/id';
import type { Sequence } from '@/domain/sequence';

beforeEach(async () => {
  await Promise.all([db.styles.clear(), db.sequences.clear(), db.userRemedies.clear()]);
  localStorage.clear();
});

describe('LocalStyleRepository', () => {
  it('seeds the three built-in styles on first use', async () => {
    const repo = new LocalStyleRepository();
    const styles = await repo.list();
    expect(styles.map((s) => s.id).sort()).toEqual([
      'preset:dharma',
      'preset:lotus',
      'preset:sunflower',
    ]);
    expect(styles.every((s) => s.builtin)).toBe(true);
  });

  it('saves, retrieves, searches, and removes a user style', async () => {
    const repo = new LocalStyleRepository();
    const id = newStyleId();
    const ts = Date.now();
    await repo.save({ id, name: 'Custom Look', config: SUNFLOWER_STYLE, builtin: false, createdAt: ts, updatedAt: ts });
    expect((await repo.getById(id))?.name).toBe('Custom Look');
    expect((await repo.search('custom')).some((s) => s.id === id)).toBe(true);
    await repo.remove(id);
    expect(await repo.getById(id)).toBeNull();
  });
});

describe('LocalSequenceRepository', () => {
  it('round-trips a sequence and duplicates it with fresh ids', async () => {
    const repo = new LocalSequenceRepository();
    const ts = Date.now();
    const seq: Sequence = {
      id: newSequenceId(),
      name: 'Patient A',
      cards: [
        { id: 'card_1', title: 'Agrimony', styleId: 'preset:sunflower', content: { kind: 'data', sequence: [1, 0, 2], base: 9 } },
      ],
      timing: { perCardMs: 1500, crossfadeMs: 500 },
      createdAt: ts,
      updatedAt: ts,
    };
    await repo.save(seq);
    expect((await repo.getById(seq.id))?.name).toBe('Patient A');

    const dup = await repo.duplicate(seq.id);
    expect(dup.id).not.toBe(seq.id);
    expect(dup.name).toBe('Patient A (Copy)');
    expect(dup.cards[0]!.id).not.toBe('card_1');
    expect((await repo.list()).length).toBe(2);
  });
});

describe('LocalRemedyRepository', () => {
  it('adds a user remedy and finds it by search and ref WITH ITS RATE', async () => {
    const repo = new LocalRemedyRepository('/');
    const remedy = await repo.addUserRemedy({
      id: 'agrimony',
      name: 'Agrimony',
      category: 'bach-flowers',
      base: 44,
      sequence: [2, 20, 30, 35, 42],
    });
    expect(remedy.ref).toBe('user:agrimony');

    const page = await repo.search({ text: 'agrim', limit: 10, offset: 0 });
    expect(page.total).toBe(1);
    // The rate survives — the structural fix for the prototype's zero-fill bug.
    expect(page.items[0]!.sequence).toEqual([2, 20, 30, 35, 42]);

    expect((await repo.getByRef('user:agrimony'))?.name).toBe('Agrimony');
  });

  it('reports no shipped packs when none are bundled', async () => {
    const repo = new LocalRemedyRepository('/');
    expect(await repo.listPacks()).toEqual([]);
  });
});

describe('LocalSettingsRepository', () => {
  it('persists and reads small prefs with a fallback', async () => {
    const repo = new LocalSettingsRepository();
    expect(await repo.get('theme', 'light')).toBe('light');
    await repo.set('theme', 'dark');
    expect(await repo.get('theme', 'light')).toBe('dark');
  });
});
