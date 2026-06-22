import { db } from '../db/db';
import { PackIndexSchema, PackManifestSchema } from '@/domain/schemas';
import type { Remedy } from '@/domain/remedy';
import type { PackId, RemedyRef } from '@/domain/ids';
import type { PackSummary } from '@/domain/pack';
import type { Page, RemedyQuery, RemedyRepository } from './types';

// Local remedy repository: shipped packs are fetched on demand from
// public/packs (lazy, cached in memory), user-added remedies live in IndexedDB.
// Search is a simple in-memory filter for now; Phase 3 swaps in prebuilt
// MiniSearch indexes per pack without changing this interface.
export class LocalRemedyRepository implements RemedyRepository {
  private packIndex: PackSummary[] | null = null;
  private readonly loadedPacks = new Map<PackId, Remedy[]>();
  private readonly baseUrl: string;

  constructor(baseUrl: string = import.meta.env.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async listPacks(): Promise<PackSummary[]> {
    if (this.packIndex) return this.packIndex;
    try {
      const res = await fetch(`${this.baseUrl}packs/index.json`);
      if (!res.ok) {
        this.packIndex = [];
        return [];
      }
      // Validated at runtime by Zod; cast to the exact-optional domain type.
      const packs = PackIndexSchema.parse(await res.json()).packs as PackSummary[];
      this.packIndex = packs;
      return packs;
    } catch {
      // No index bundled (yet) or fetch unavailable (e.g. tests) — no shipped packs.
      this.packIndex = [];
      return [];
    }
  }

  async loadPack(id: PackId): Promise<void> {
    if (this.loadedPacks.has(id)) return;
    const packs = await this.listPacks();
    const summary = packs.find((p) => p.id === id);
    if (!summary) throw new Error(`Unknown pack: ${id}`);
    const res = await fetch(`${this.baseUrl}${summary.manifestUrl}`);
    if (!res.ok) throw new Error(`Failed to load pack ${id} (${res.status})`);
    const manifest = PackManifestSchema.parse(await res.json());
    const remedies = manifest.remedies.map((r) => ({
      ...r,
      packId: id,
      ref: `${id}:${r.id}` as RemedyRef,
    })) as Remedy[];
    this.loadedPacks.set(id, remedies);
  }

  private async allRemedies(): Promise<Remedy[]> {
    const fromPacks = [...this.loadedPacks.values()].flat();
    const fromUser = await db.userRemedies.toArray();
    return [...fromPacks, ...fromUser];
  }

  async search(q: RemedyQuery): Promise<Page<Remedy>> {
    const all = await this.allRemedies();
    const text = q.text?.trim().toLowerCase();
    const filtered = all.filter((r) => {
      if (q.packIds && !q.packIds.includes(r.packId)) return false;
      if (q.category && r.category !== q.category) return false;
      if (q.base && r.base !== q.base) return false;
      if (text) {
        const hay = `${r.name} ${r.subheading ?? ''} ${r.category} ${r.rateType ?? ''}`.toLowerCase();
        if (!hay.includes(text)) return false;
      }
      return true;
    });
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    const items = filtered.slice(q.offset, q.offset + q.limit);
    return { items, total: filtered.length };
  }

  async getByRef(ref: RemedyRef): Promise<Remedy | null> {
    for (const remedies of this.loadedPacks.values()) {
      const hit = remedies.find((r) => r.ref === ref);
      if (hit) return hit;
    }
    return (await db.userRemedies.get(ref)) ?? null;
  }

  async addUserRemedy(
    r: Omit<Remedy, 'ref' | 'packId'> & { packId?: PackId },
  ): Promise<Remedy> {
    const packId = r.packId ?? 'user';
    const remedy: Remedy = { ...r, packId, ref: `${packId}:${r.id}` as RemedyRef };
    await db.userRemedies.put(remedy);
    return remedy;
  }
}
