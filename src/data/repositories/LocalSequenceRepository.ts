import { db } from '../db/db';
import { newCardId, newSequenceId } from '@/lib/id';
import type { Sequence } from '@/domain/sequence';
import type { SequenceId } from '@/domain/ids';
import type { SequenceRepository } from './types';

export class LocalSequenceRepository implements SequenceRepository {
  async list(): Promise<Sequence[]> {
    return db.sequences.orderBy('updatedAt').reverse().toArray();
  }

  async getById(id: SequenceId): Promise<Sequence | null> {
    return (await db.sequences.get(id)) ?? null;
  }

  async save(seq: Sequence): Promise<void> {
    await db.sequences.put(seq);
  }

  async remove(id: SequenceId): Promise<void> {
    await db.sequences.delete(id);
  }

  async duplicate(id: SequenceId): Promise<Sequence> {
    const src = await db.sequences.get(id);
    if (!src) throw new Error(`Sequence not found: ${id}`);
    const ts = Date.now();
    const copy: Sequence = {
      ...src,
      id: newSequenceId(),
      name: `${src.name} (Copy)`,
      cards: src.cards.map((c) => ({ ...c, id: newCardId() })),
      createdAt: ts,
      updatedAt: ts,
    };
    await db.sequences.put(copy);
    return copy;
  }
}
