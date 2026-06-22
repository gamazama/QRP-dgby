import { db } from '../db/db';
import { BUILTIN_STYLE_PRESETS } from '@/engine/presets';
import type { Style } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import type { StyleRepository } from './types';

export class LocalStyleRepository implements StyleRepository {
  private seeding: Promise<void> | null = null;

  private async ensureSeeded(): Promise<void> {
    if (!this.seeding) {
      this.seeding = (async () => {
        const count = await db.styles.count();
        if (count === 0) {
          const ts = Date.now();
          await db.styles.bulkPut(
            BUILTIN_STYLE_PRESETS.map((p) => ({
              id: p.id,
              name: p.name,
              config: p.config,
              builtin: true,
              createdAt: ts,
              updatedAt: ts,
            })),
          );
        }
      })();
    }
    return this.seeding;
  }

  async list(): Promise<Style[]> {
    await this.ensureSeeded();
    return db.styles.orderBy('updatedAt').toArray();
  }

  async getById(id: StyleId): Promise<Style | null> {
    await this.ensureSeeded();
    return (await db.styles.get(id)) ?? null;
  }

  async save(style: Style): Promise<void> {
    await db.styles.put(style);
  }

  async remove(id: StyleId): Promise<void> {
    await db.styles.delete(id);
  }

  async search(text: string): Promise<Style[]> {
    await this.ensureSeeded();
    const t = text.trim().toLowerCase();
    const all = await db.styles.toArray();
    if (!t) return all;
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(t) ||
        (s.tags ?? []).some((tag) => tag.toLowerCase().includes(t)),
    );
  }
}
