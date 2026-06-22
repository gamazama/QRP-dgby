import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import type { Remedy } from '@/domain/remedy';
import { useRepositories } from '@/data/repository-context';
import { useSequencerStore } from '@/store/sequencerStore';
import { packAssetUrl, remedyImageRel } from '@/lib/assets';

const DEFAULT_STYLE = 'preset:sunflower';
const btn =
  'flex-1 rounded border border-slate-300 px-1 py-0.5 text-[11px] hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800';

export function LibraryPage() {
  const { remedies } = useRepositories();
  const [text, setText] = useState('');

  const packsQuery = useQuery({
    queryKey: ['packs'],
    queryFn: async () => {
      const ps = await remedies.listPacks();
      await Promise.all(ps.map((p) => remedies.loadPack(p.id)));
      return ps;
    },
  });
  const searchQuery = useQuery({
    queryKey: ['remedy-search', text],
    queryFn: () => {
      const q = text.trim();
      return remedies.search(q ? { text: q, limit: 500, offset: 0 } : { limit: 500, offset: 0 });
    },
    enabled: packsQuery.isSuccess,
  });

  const items = searchQuery.data?.items ?? [];
  const addImage = (r: Remedy) => useSequencerStore.getState().addImageCards([r], DEFAULT_STYLE);
  const addRate = (r: Remedy) => useSequencerStore.getState().addRemedyCards([r], DEFAULT_STYLE);

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
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {packsQuery.isLoading
            ? 'Loading…'
            : packsQuery.isError
              ? 'Packs unavailable'
              : `${searchQuery.data?.total ?? 0} remedies`}
        </span>
        {packsQuery.isError && (
          <button
            type="button"
            onClick={() => void packsQuery.refetch()}
            className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"
          >
            Retry
          </button>
        )}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((r) => {
            const img = r.image ? packAssetUrl(remedyImageRel(r.packId, r.image.light)) : null;
            return (
              <div key={r.ref} className="flex flex-col overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
                <div className="flex aspect-[4/7] items-center justify-center bg-white dark:bg-slate-900">
                  {img ? (
                    <img src={img} alt={r.name} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400">no image</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 p-1.5">
                  <p className="truncate text-xs text-slate-800 dark:text-slate-200" title={r.name}>
                    {r.name}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    {r.category} · Base {r.base}
                  </p>
                  <div className="mt-0.5 flex gap-1">
                    <button type="button" className={btn} onClick={() => addImage(r)} title="Add the card artwork">
                      Image
                    </button>
                    <button type="button" className={btn} onClick={() => addRate(r)} title="Add the generated rate mandala">
                      Rate
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
