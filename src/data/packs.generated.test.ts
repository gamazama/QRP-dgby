import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PackIndexSchema, PackManifestSchema } from '@/domain/schemas';

// Validates the output of `npm run build:packs`. Skipped when packs aren't built
// (e.g. a fresh CI checkout without the offline pipeline run).
const packsDir = resolve(process.cwd(), 'public/packs');
const hasPacks = existsSync(resolve(packsDir, 'index.json'));

const readJson = (rel: string): unknown =>
  JSON.parse(readFileSync(resolve(packsDir, rel), 'utf8'));

describe.skipIf(!hasPacks)('generated card packs', () => {
  it('index.json conforms to PackIndexSchema', () => {
    const idx = PackIndexSchema.parse(readJson('index.json'));
    expect(idx.packs.length).toBeGreaterThan(0);
  });

  it('bach-flowers-v1 manifest conforms and Agrimony keeps its real rate', () => {
    const m = PackManifestSchema.parse(readJson('bach-flowers-v1/manifest.json'));
    const agrimony = m.remedies.find((r) => r.id === 'agrimony');
    expect(agrimony?.sequence).toEqual([2, 12, 17, 34, 40]);
    expect(agrimony?.base).toBe(44);
    expect(agrimony?.image?.light).toBe('img/agrimony.webp');
  });
});
