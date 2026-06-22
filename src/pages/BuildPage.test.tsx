import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { BuildPage } from './BuildPage';

describe('BuildPage', () => {
  it('renders the remedy search input within the provider tree', async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <RepositoryProvider>
          <ToastProvider>
            <BuildPage />
          </ToastProvider>
        </RepositoryProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByPlaceholderText('Search remedies…')).toBeInTheDocument();
  });
});
