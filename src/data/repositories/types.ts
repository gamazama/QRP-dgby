import type { PackId, RemedyRef, SequenceId, StyleId } from '@/domain/ids';
import type { RateBase, Remedy } from '@/domain/remedy';
import type { PackSummary } from '@/domain/pack';
import type { Style } from '@/domain/style';
import type { Sequence } from '@/domain/sequence';

export interface Page<T> {
  items: T[];
  total: number;
  cursor?: string;
}

export interface RemedyQuery {
  text?: string;
  packIds?: PackId[];
  category?: string;
  base?: RateBase;
  limit: number;
  offset: number;
}

/**
 * The backend-ready seam. The UI talks ONLY to these interfaces. Local
 * IndexedDB/static-fetch implementations now; a future Remote* set implements
 * the same interfaces and is swapped in one provider — zero changes in features/.
 */
export interface RemedyRepository {
  listPacks(): Promise<PackSummary[]>;
  loadPack(id: PackId): Promise<void>;
  search(q: RemedyQuery): Promise<Page<Remedy>>;
  getByRef(ref: RemedyRef): Promise<Remedy | null>;
  addUserRemedy(r: Omit<Remedy, 'ref' | 'packId'> & { packId?: PackId }): Promise<Remedy>;
}

export interface StyleRepository {
  list(): Promise<Style[]>;
  getById(id: StyleId): Promise<Style | null>;
  save(style: Style): Promise<void>;
  remove(id: StyleId): Promise<void>;
  search(text: string): Promise<Style[]>;
}

export interface SequenceRepository {
  list(): Promise<Sequence[]>;
  getById(id: SequenceId): Promise<Sequence | null>;
  save(seq: Sequence): Promise<void>;
  remove(id: SequenceId): Promise<void>;
  duplicate(id: SequenceId): Promise<Sequence>;
}

export interface SettingsRepository {
  get<T>(key: string, fallback: T): Promise<T>;
  set(key: string, value: unknown): Promise<void>;
}

export interface Repositories {
  remedies: RemedyRepository;
  styles: StyleRepository;
  sequences: SequenceRepository;
  settings: SettingsRepository;
}
