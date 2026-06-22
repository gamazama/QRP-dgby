import { useMemo, type ReactNode } from 'react';
import type { Repositories } from './repositories/types';
import { RepositoryContext } from './repository-context';

const notImplemented =
  (what: string) =>
  (): never => {
    throw new Error(`${what} not implemented yet (lands in Phase 2).`);
  };

/**
 * Phase 0 stub repositories: reads return empty, writes throw. Proves the seam
 * and lets the app boot before the Dexie-backed Local* implementations exist.
 */
function createStubRepositories(): Repositories {
  return {
    remedies: {
      listPacks: async () => [],
      loadPack: async () => {},
      search: async () => ({ items: [], total: 0 }),
      getByRef: async () => null,
      addUserRemedy: notImplemented('remedies.addUserRemedy'),
    },
    styles: {
      list: async () => [],
      getById: async () => null,
      save: notImplemented('styles.save'),
      remove: notImplemented('styles.remove'),
      search: async () => [],
    },
    sequences: {
      list: async () => [],
      getById: async () => null,
      save: notImplemented('sequences.save'),
      remove: notImplemented('sequences.remove'),
      duplicate: notImplemented('sequences.duplicate'),
    },
    settings: {
      get: async (_key, fallback) => fallback,
      set: async () => {},
    },
  };
}

export function RepositoryProvider({
  children,
  repositories,
}: {
  children: ReactNode;
  repositories?: Repositories;
}) {
  const repos = useMemo(() => repositories ?? createStubRepositories(), [repositories]);
  return <RepositoryContext.Provider value={repos}>{children}</RepositoryContext.Provider>;
}
