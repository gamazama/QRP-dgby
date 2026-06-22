import type { PackId } from './ids';
import type { Remedy } from './remedy';

/** Entry in the tiny top-level index.json, loaded at startup. */
export interface PackSummary {
  id: PackId;
  name: string;
  version: string;
  count: number;
  categories: string[];
  /** Pack-relative; resolved against BASE_URL at runtime. */
  manifestUrl: string;
  searchIndexUrl?: string;
}

export interface PackIndex {
  generatedAt: string;
  packs: PackSummary[];
}

export interface PackTaxonomyEntry {
  id: string;
  label: string;
}

/** Per-pack manifest, fetched lazily on first use. */
export interface PackManifest {
  id: PackId;
  name: string;
  version: string;
  taxonomy: PackTaxonomyEntry[];
  /** `packId` and `ref` are derived on load. */
  remedies: Array<Omit<Remedy, 'packId' | 'ref'>>;
}
