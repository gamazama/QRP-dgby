import { useMemo, type ReactNode } from 'react';
import type { Repositories } from './repositories/types';
import { RepositoryContext } from './repository-context';
import { createLocalRepositories } from './repositories/local';

// Defaults to the local-first (IndexedDB + static pack fetch) repository set.
// Tests/stories can inject a fake set via the `repositories` prop. A future
// Remote* set implements the same interfaces and swaps in here only.
export function RepositoryProvider({
  children,
  repositories,
}: {
  children: ReactNode;
  repositories?: Repositories;
}) {
  const repos = useMemo(() => repositories ?? createLocalRepositories(), [repositories]);
  return <RepositoryContext.Provider value={repos}>{children}</RepositoryContext.Provider>;
}
