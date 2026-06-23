import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Plus, Search, Sparkles, StickyNote } from 'lucide-react';
import type { Remedy } from '@/domain/remedy';
import type { PackId } from '@/domain/ids';
import type { RemedyQuery } from '@/data/repositories/types';
import { useRepositories } from '@/data/repository-context';
import { useSequencerStore } from '@/store/sequencerStore';
import { useToast } from '@/components/ui/toastContext';
import { RemedyThumb } from '@/features/remedy-search/RemedyThumb';
import { RemedyEditor } from '@/features/library/RemedyEditor';
import { CardSurface } from '@/render/CardSurface';
import { DEFAULT_STYLE_CONFIG } from '@/engine/presets';
import { cn } from '@/lib/cn';

const DEFAULT_STYLE = 'preset:sunflower';
type DisplayMode = 'pattern' | 'artwork';
const chip =
  'flex flex-1 items-center justify-center gap-1 rounded border px-1 py-0.5 text-[11px]';

export function LibraryPage() {
  const { remedies } = useRepositories();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [packId, setPackId] = useState<PackId | 'all'>('all');
  const [userOnly, setUserOnly] = useState(false);
  const [editing, setEditing] = useState<Remedy | 'new' | null>(null);
  // Which representation each card shows (default: artwork if it has one).
  const [modes, setModes] = useState<Record<string, DisplayMode>>({});
  const modeOf = (r: Remedy): DisplayMode => modes[r.ref] ?? (r.image ? 'artwork' : 'pattern');
  const setMode = (ref: string, mode: DisplayMode) => setModes((m) => ({ ...m, [ref]: mode }));

  const packsQuery = useQuery({
    queryKey: ['packs'],
    queryFn: async () => {
      const ps = await remedies.listPacks();
      await Promise.all(ps.map((p) => remedies.loadPack(p.id)));
      return ps;
    },
  });
  const searchQuery = useQuery({
    queryKey: ['remedy-search', text, packId, userOnly],
    queryFn: () => {
      const q: RemedyQuery = { limit: 500, offset: 0 };
      const t = text.trim();
      if (t) q.text = t;
      if (packId !== 'all') q.packIds = [packId];
      if (userOnly) q.userOnly = true;
      return remedies.search(q);
    },
    enabled: packsQuery.isSuccess,
  });

  const onSaved = () => void queryClient.invalidateQueries({ queryKey: ['remedy-search'] });
  const items = searchQuery.data?.items ?? [];
  const addPattern = (r: Remedy) => {
    useSequencerStore.getState().addRemedyCards([r], DEFAULT_STYLE);
    toast.show(`Added ${r.name}`, 'success');
  };
  const addArtwork = (r: Remedy) => {
    useSequencerStore.getState().addImageCards([r], DEFAULT_STYLE);
    toast.show(`Added ${r.name} (artwork)`, 'success');
  };
  // The + button adds whichever representation the card is currently showing.
  const addCurrent = (r: Remedy) => {
    if (modeOf(r) === 'artwork' && r.image) addArtwork(r);
    else addPattern(r);
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
        <button
          type="button"
          onClick={() => setUserOnly((v) => !v)}
          aria-pressed={userOnly}
          className={`rounded-md border px-2 py-1.5 text-xs ${
            userOnly
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900'
          }`}
        >
          My cards
        </button>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" /> New card
        </button>
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
        Click a card to <strong>edit</strong> it. Toggle <strong>Pattern</strong> / <strong>Artwork</strong> to choose
        what it shows, then <strong>+</strong> to add it to the prescription.
      </p>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((r) => {
            const mode = modeOf(r);
            const activeChip = 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
            const idleChip =
              'border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800';
            return (
              <div key={r.ref} className="relative flex flex-col overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
                <div className="absolute right-1 top-1 z-10 flex gap-1">
                  {r.notes && (
                    <span className="rounded bg-amber-100 p-1 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300" title={r.notes}>
                      <StickyNote className="h-3 w-3" />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => addCurrent(r)}
                    title={`Add ${r.name} to the prescription`}
                    aria-label={`Add ${r.name}`}
                    className="rounded bg-blue-600 p-1 text-white shadow-sm hover:bg-blue-700"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(r)}
                  title={`Edit ${r.name}`}
                  className="flex flex-1 flex-col text-left hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  {mode === 'pattern' ? (
                    <div className="aspect-4/7 w-full bg-white dark:bg-slate-900">
                      <CardSurface style={DEFAULT_STYLE_CONFIG} sequence={r.sequence} base={r.base} tier="balanced" fill="height" />
                    </div>
                  ) : (
                    <RemedyThumb remedy={r} className="aspect-4/7 w-full bg-white dark:bg-slate-900" />
                  )}
                  <div className="p-1.5">
                    <p className="truncate text-xs text-slate-800 dark:text-slate-200" title={r.name}>
                      {r.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {r.category} · Base {r.base}
                      {r.packId === 'user' ? ' · mine' : r.modified ? ' · edited' : ''}
                    </p>
                    {r.sequence.length > 0 && (
                      <p className="truncate font-mono text-[10px] text-slate-400">{r.sequence.join(' ')}</p>
                    )}
                  </div>
                </button>
                <div className="flex gap-1 border-t border-slate-100 p-1 dark:border-slate-800">
                  <button
                    type="button"
                    className={cn(chip, mode === 'pattern' ? activeChip : idleChip)}
                    onClick={() => setMode(r.ref, 'pattern')}
                    title="Show the generated mandala"
                  >
                    <Sparkles className="h-3 w-3" /> Pattern
                  </button>
                  <button
                    type="button"
                    disabled={!r.image}
                    className={cn(chip, mode === 'artwork' ? activeChip : idleChip, !r.image && 'opacity-40')}
                    onClick={() => setMode(r.ref, 'artwork')}
                    title={r.image ? 'Show the printed artwork' : 'No artwork for this card'}
                  >
                    <ImageIcon className="h-3 w-3" /> Artwork
                  </button>
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
          <p className="py-12 text-center text-sm text-slate-400">
            {userOnly ? 'No cards of your own yet — use “New card” to add one.' : 'No remedies found.'}
          </p>
        )}
      </div>

      {editing !== null && (
        <RemedyEditor
          {...(editing !== 'new' ? { remedy: editing } : {})}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
