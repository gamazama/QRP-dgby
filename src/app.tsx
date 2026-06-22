import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { RepositoryProvider } from './data/RepositoryProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { router } from './routes';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RepositoryProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
