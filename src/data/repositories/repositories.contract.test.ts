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
  await Promise.all([
    db.styles.clear(),
    db.sequences.clear(),
    db.userRemedies.clear(),
    db.remedyNotes.clear(),
    db.remedyEdits.clear(),
  ]);
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

  it('attaches a searchable note overlay and clears it when emptied', async () => {
    const repo = new LocalRemedyRepository('/');
    await repo.addUserRemedy({ id: 'arnica', name: 'Arnica', category: 'homeopathic', base: 44, sequence: [1, 2, 3] });

    await repo.setNotes('user:arnica', 'bruising — patient responds well');
    expect((await repo.getByRef('user:arnica'))?.notes).toContain('bruising');
    // Search matches on the note text (metadata search).
    expect((await repo.search({ text: 'bruising', limit: 10, offset: 0 })).total).toBe(1);

    await repo.setNotes('user:arnica', '   ');
    expect((await repo.getByRef('user:arnica'))?.notes).toBeUndefined();
  });

  it('edits a shipped pack card in place and reverts it', async () => {
    // A tiny fake pack so we have a "shipped" (non-user) remedy to edit.
    const repo = new LocalRemedyRepository('/');
    const loaded = repo as unknown as { loadedPacks: Map<string, unknown[]> };
    loaded.loadedPacks.set('bach', [
      { id: 'agrimony', packId: 'bach', ref: 'bach:agrimony', name: 'Agrimony', category: 'bach', base: 44, sequence: [1, 2, 3] },
    ]);

    await repo.editRemedy('bach:agrimony', { name: 'Agrimony (fixed)', sequence: [9, 9, 9] });
    const edited = await repo.getByRef('bach:agrimony');
    expect(edited?.name).toBe('Agrimony (fixed)');
    expect(edited?.sequence).toEqual([9, 9, 9]);
    expect(edited?.modified).toBe(true);
    // Search reflects the edit and marks it modified.
    const page = await repo.search({ text: 'fixed', limit: 10, offset: 0 });
    expect(page.items[0]?.modified).toBe(true);

    await repo.revertRemedy('bach:agrimony');
    const reverted = await repo.getByRef('bach:agrimony');
    expect(reverted?.name).toBe('Agrimony');
    expect(reverted?.sequence).toEqual([1, 2, 3]);
    expect(reverted?.modified).toBeUndefined();
  });

  it('filters to user-only cards and deletes them with their notes', async () => {
    const repo = new LocalRemedyRepository('/');
    await repo.addUserRemedy({ id: 'mine', name: 'My Card', category: 'custom', base: 9, sequence: [5] });
    await repo.setNotes('user:mine', 'keep me');

    expect((await repo.search({ userOnly: true, limit: 10, offset: 0 })).total).toBe(1);

    await repo.removeUserRemedy('user:mine');
    expect(await repo.getByRef('user:mine')).toBeNull();
    expect((await repo.search({ userOnly: true, limit: 10, offset: 0 })).total).toBe(0);
    // The note overlay is gone too (no orphan).
    expect(await db.remedyNotes.get('user:mine')).toBeUndefined();
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
