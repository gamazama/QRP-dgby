import { beforeEach, describe, expect, it } from 'vitest';
import type { Remedy } from '@/domain/remedy';
import { db } from './db/db';
import { LocalRemedyRepository } from './repositories/LocalRemedyRepository';

// Proves the data layer scales to thousands of remedies with paged search
// (the user's stated growth axis). Runtime MiniSearch is a later perf upgrade;
// this asserts correctness + pagination at scale.
beforeEach(async () => {
  await db.userRemedies.clear();
});

describe('remedy data layer at scale', () => {
  it('searches 5000 remedies and paginates', async () => {
    const N = 5000;
    const remedies = Array.from({ length: N }, (_, i) => ({
      id: `r${i}`,
      packId: 'user',
      ref: `user:r${i}`,
      name: `Remedy ${i}`,
      category: 'test',
      base: 9,
      sequence: [i % 9],
    })) as Remedy[];
    await db.userRemedies.bulkPut(remedies);

    const repo = new LocalRemedyRepository('/');

    const all = await repo.search({ limit: 50, offset: 0 });
    expect(all.total).toBe(N);
    expect(all.items.length).toBe(50); // paginated, not all 5000

    const hit = await repo.search({ text: 'Remedy 123', limit: 50, offset: 0 });
    expect(hit.total).toBeGreaterThan(0);
    expect(hit.items.some((r) => r.id === 'r123')).toBe(true);
  }, 20000);
});
