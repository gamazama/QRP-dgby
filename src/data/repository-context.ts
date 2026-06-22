import { createContext, useContext } from 'react';
import type { Repositories } from './repositories/types';

export const RepositoryContext = createContext<Repositories | null>(null);

export function useRepositories(): Repositories {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error('useRepositories must be used within a RepositoryProvider');
  return ctx;
}
