import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImageIcon, Search, Sparkles } from 'lucide-react';
import type { Remedy } from '@/domain/remedy';
import type { PackId } from '@/domain/ids';
import type { RemedyQuery } from '@/data/repositories/types';
import { useRepositories } from '@/data/repository-context';
import { useSequencerStore } from '@/store/sequencerStore';
import { useToast } from '@/components/ui/toastContext';
import { RemedyThumb } from '@/features/remedy-search/RemedyThumb';

const DEFAULT_STYLE = 'preset:sunflower';
const chip =
  'flex items-center justify-center gap-1 rounded border border-slate-300 px-1 py-0.5 text-[11px] hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800';

export function LibraryPage() {
  const { remedies } = useRepositories();
  const toast = useToast();
  const [text, setText] = useState('');
  const [packId, setPackId] = useState<PackId | 'all'>('all');

  const packsQuery = useQuery({
    queryKey: ['packs'],
    queryFn: async () => {
      const ps = await remedies.listPacks();
      await Promise.all(ps.map((p) => remedies.loadPack(p.id)));
      return ps;
    },
  });
  const searchQuery = useQuery({
    queryKey: ['remedy-search', text, packId],
    queryFn: () => {
      const q: RemedyQuery = { limit: 500, offset: 0 };
      const t = text.trim();
      if (t) q.text = t;
      if (packId !== 'all') q.packIds = [packId];
      return remedies.search(q);
    },
    enabled: packsQuery.isSuccess,
  });

  const items = searchQuery.data?.items ?? [];
  const addPattern = (r: Remedy) => {
    useSequencerStore.getState().addRemedyCards([r], DEFAULT_STYLE);
    toast.show(`Added ${r.name}`, 'success');
  };
  const addArtwork = (r: Remedy) => {
    useSequencerStore.getState().addImageCards([r], DEFAULT_STYLE);
    toast.show(`Added ${r.name} (artwork)`, 'success');
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Library</h1>
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search remedies…"
            aria-label="Search remedies"
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <select
          value={packId}
          onChange={(e) => setPackId(e.target.value as PackId | 'all')}
          aria-label="Filter by category"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All categories</option>
          {(packsQuery.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.count})
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {packsQuery.isLoading ? 'Loading…' : packsQuery.isError ? 'Packs unavailable' : `${searchQuery.data?.total ?? 0} remedies`}
        </span>
        {packsQuery.isError && (
          <button type="button" onClick={() => void packsQuery.refetch()} className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 dark:border-red-900 dark:text-red-300">
            Retry
          </button>
        )}
      </div>

      <p className="mb-2 text-xs text-slate-400">
        Click a card to add its <strong>Pattern</strong> (generated mandala) to the prescription, or use{' '}
        <strong>Artwork</strong> to add the printed card image.
      </p>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((r) => (
            <div key={r.ref} className="flex flex-col overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => addPattern(r)}
                title={`Add ${r.name} as a pattern`}
                className="flex flex-1 flex-col text-left hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <RemedyThumb remedy={r} className="aspect-[4/7] w-full bg-white dark:bg-slate-900" />
                <div className="p-1.5">
                  <p className="truncate text-xs text-slate-800 dark:text-slate-200" title={r.name}>
                    {r.name}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    {r.category} · Base {r.base}
                  </p>
                  {r.sequence.length > 0 && (
                    <p className="truncate font-mono text-[10px] text-slate-400">{r.sequence.join(' ')}</p>
                  )}
                </div>
              </button>
              <div className="flex gap-1 border-t border-slate-100 p-1 dark:border-slate-800">
                <button type="button" className={chip} onClick={() => addPattern(r)} title="Add the generated mandala">
                  <Sparkles className="h-3 w-3" /> Pattern
                </button>
                <button type="button" className={chip} onClick={() => addArtwork(r)} title="Add the printed artwork">
                  <ImageIcon className="h-3 w-3" /> Artwork
                </button>
              </div>
            </div>
          ))}
        </div>
        {packsQuery.isError && (
          <p className="py-12 text-center text-sm text-red-600 dark:text-red-400">
            Couldn't load remedy packs. Check your connection and Retry.
          </p>
        )}
        {!packsQuery.isLoading && !packsQuery.isError && items.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">No remedies found.</p>
        )}
      </div>
    </div>
  );
}
