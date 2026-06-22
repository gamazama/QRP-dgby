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

// Practitioner note overlaid on any remedy (shipped-pack OR user), keyed by ref.
// Kept separate from the remedy record so notes attach to read-only pack cards.
export interface RemedyNoteRecord {
  ref: string;
  notes: string;
  updatedAt: number;
}

// Practitioner edits to a SHIPPED pack card (fix a wrong OCR rate, rename, etc.)
// without duplicating it. The patch overrides the pack's fields on read; can be
// reverted. (User cards are edited in place, so they don't need this.)
export type RemedyEditPatch = Partial<{
  name: string;
  subheading: string;
  category: string;
  base: import('@/domain/remedy').RateBase;
  sequence: number[];
  rateType: string;
  image: import('@/domain/remedy').RemedyImage;
}>;

export interface RemedyEditRecord {
  ref: string;
  patch: RemedyEditPatch;
  updatedAt: number;
}

export class QrpDatabase extends Dexie {
  sequences!: Table<Sequence, string>;
  styles!: Table<Style, string>;
  userRemedies!: Table<Remedy, string>;
  userImages!: Table<UserImageRecord, string>;
  packCache!: Table<PackCacheRecord, string>;
  remedyNotes!: Table<RemedyNoteRecord, string>;
  remedyEdits!: Table<RemedyEditRecord, string>;

  constructor() {
    super('qrp');
    this.version(1).stores({
      sequences: 'id, name, updatedAt',
      styles: 'id, name, builtin, updatedAt',
      userRemedies: 'ref, packId, category, name',
      userImages: 'hash, createdAt',
      packCache: 'id, version',
    });
    // v2: notes overlay (unlisted tables are inherited from v1).
    this.version(2).stores({
      remedyNotes: 'ref, updatedAt',
    });
    // v3: in-place edits to shipped pack cards.
    this.version(3).stores({
      remedyEdits: 'ref, updatedAt',
    });
  }
}

export const db = new QrpDatabase();
