import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plus, Search } from 'lucide-react';
import { useRepositories } from '@/data/repository-context';
import type { Remedy } from '@/domain/remedy';
import { packAssetUrl, remedyImageRel } from '@/lib/assets';
import { cn } from '@/lib/cn';

export type AddMode = 'rate' | 'image';

export function RemedySearchPanel({ onAdd }: { onAdd: (r: Remedy, mode: AddMode) => void }) {
  const { remedies } = useRepositories();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<AddMode>('rate');

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
      return remedies.search(q ? { text: q, limit: 300, offset: 0 } : { limit: 300, offset: 0 });
    },
    enabled: packsQuery.isSuccess,
  });

  const items = searchQuery.data?.items ?? [];
  const parentRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
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

      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {packsQuery.isLoading ? 'Loading…' : `${searchQuery.data?.total ?? 0} remedies`}
        </span>
        <div className="flex overflow-hidden rounded-md border border-slate-300 text-xs dark:border-slate-700">
          {(['rate', 'image'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'px-2 py-1 capitalize',
                mode === m ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
              title={m === 'rate' ? 'Add as generated rate mandala' : 'Add as the card artwork'}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div ref={parentRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
          {virt.getVirtualItems().map((v) => {
            const r = items[v.index]!;
            const img = r.image ? packAssetUrl(remedyImageRel(r.packId, r.image.light)) : null;
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
                {img ? (
                  <img src={img} alt="" loading="lazy" decoding="async" className="h-9 w-9 shrink-0 rounded object-contain" />
                ) : (
                  <span className="h-9 w-9 shrink-0 rounded bg-slate-100 dark:bg-slate-800" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-800 dark:text-slate-200">{r.name}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {r.category} · Base {r.base}
                  </span>
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
