import type { Repositories } from './types';
import { LocalRemedyRepository } from './LocalRemedyRepository';
import { LocalSequenceRepository } from './LocalSequenceRepository';
import { LocalSettingsRepository } from './LocalSettingsRepository';
import { LocalStyleRepository } from './LocalStyleRepository';

/** The default (local-first) repository set: IndexedDB + static pack fetch. */
export function createLocalRepositories(): Repositories {
  return {
    remedies: new LocalRemedyRepository(),
    styles: new LocalStyleRepository(),
    sequences: new LocalSequenceRepository(),
    settings: new LocalSettingsRepository(),
  };
}
