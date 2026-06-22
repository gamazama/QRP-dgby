import Dexie, { type Table } from 'dexie';
import type { Sequence } from '@/domain/sequence';
import type { Style } from '@/domain/style';
import type { Remedy } from '@/domain/remedy';

// Content-addressed user image blob (avoids fat data URLs in the deck).
export interface UserImageRecord {
  hash: string;
  blob: Blob;
  createdAt: number;
}

// Cached pack manifest + prebuilt search index, for offline / instant revisit.
export interface PackCacheRecord {
  id: string;
  version: string;
  manifest: unknown;
  searchIndex?: unknown;
  cachedAt: number;
}

export class QrpDatabase extends Dexie {
  sequences!: Table<Sequence, string>;
  styles!: Table<Style, string>;
  userRemedies!: Table<Remedy, string>;
  userImages!: Table<UserImageRecord, string>;
  packCache!: Table<PackCacheRecord, string>;

  constructor() {
    super('qrp');
    this.version(1).stores({
      sequences: 'id, name, updatedAt',
      styles: 'id, name, builtin, updatedAt',
      userRemedies: 'ref, packId, category, name',
      userImages: 'hash, createdAt',
      packCache: 'id, version',
    });
  }
}

export const db = new QrpDatabase();
