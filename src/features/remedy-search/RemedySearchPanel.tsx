import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plus, Search } from 'lucide-react';
import { useRepositories } from '@/data/repository-context';
import type { Remedy } from '@/domain/remedy';
import type { PackId } from '@/domain/ids';
import type { RemedyQuery } from '@/data/repositories/types';
import { RemedyThumb } from './RemedyThumb';
import { cn } from '@/lib/cn';

export type AddMode = 'pattern' | 'artwork';

export function RemedySearchPanel({ onAdd }: { onAdd: (r: Remedy, mode: AddMode) => void }) {
  const { remedies } = useRepositories();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<AddMode>('pattern');
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
      const q: RemedyQuery = { limit: 300, offset: 0 };
      const t = text.trim();
      if (t) q.text = t;
      if (packId !== 'all') q.packIds = [packId];
      return remedies.search(q);
    },
    enabled: packsQuery.isSuccess,
  });

  const items = searchQuery.data?.items ?? [];
  const parentRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search remedies…"
          aria-label="Search remedies"
          className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {/* Category filter */}
      <select
        value={packId}
        onChange={(e) => setPackId(e.target.value as PackId | 'all')}
        aria-label="Filter by category"
        className="mb-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
      >
        <option value="all">All categories</option>
        {(packsQuery.data ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.count})
          </option>
        ))}
      </select>

      {packsQuery.isError && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-red-300 bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>Couldn't load remedy packs.</span>
          <button type="button" onClick={() => void packsQuery.refetch()} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      {/* Add-as mode */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {packsQuery.isLoading ? 'Loading…' : `${searchQuery.data?.total ?? 0} remedies`}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Add as</span>
          <div className="flex overflow-hidden rounded-md border border-slate-300 text-xs dark:border-slate-700">
            {(
              [
                ['pattern', 'Pattern', 'Add the generated QRP mandala from the rate'],
                ['artwork', 'Artwork', 'Add the printed card artwork'],
              ] as const
            ).map(([m, label, tip]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                title={tip}
                className={cn(
                  'px-2 py-1',
                  mode === m ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={parentRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
          {virt.getVirtualItems().map((v) => {
            const r = items[v.index]!;
            return (
              <button
                key={r.ref}
                type="button"
                data-remedy={r.ref}
                onClick={() => onAdd(r, mode)}
                title={`Add ${r.name}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: v.size, transform: `translateY(${v.start}px)` }}
                className="group flex items-center gap-2 border-b border-slate-100 px-1 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <RemedyThumb remedy={r} className="h-11 w-11 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-800 dark:text-slate-200">{r.name}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {r.category} · Base {r.base}
                  </span>
                  {r.sequence.length > 0 && (
                    <span className="block truncate font-mono text-[11px] text-slate-400">{r.sequence.join(' ')}</span>
                  )}
                </span>
                <Plus className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-500" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
