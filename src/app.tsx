import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { RepositoryProvider } from './data/RepositoryProvider';
import { router } from './routes';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider>
        <RouterProvider router={router} />
      </RepositoryProvider>
    </QueryClientProvider>
  );
}
