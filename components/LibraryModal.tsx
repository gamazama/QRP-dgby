import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Loader2, AlertCircle } from 'lucide-react';
import {
  loadLibraryManifest,
  libraryImageUrl,
  LibraryManifest,
  LibraryCard,
} from '../utils/library';

interface LibraryModalProps {
  // 'cards' = pick full-card images to add as new cards (multi-select).
  // 'centers' = pick one center motif (chakra mandala) for the active card.
  mode: 'cards' | 'centers';
  onClose: () => void;
  onAddCards?: (cards: LibraryCard[]) => void;
  onPickCenter?: (card: LibraryCard) => void;
}

const LibraryModal: React.FC<LibraryModalProps> = ({ mode, onClose, onAddCards, onPickCenter }) => {
  const [manifest, setManifest] = useState<LibraryManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, LibraryCard>>({});

  // Load manifest on mount.
  useEffect(() => {
    let alive = true;
    loadLibraryManifest()
      .then((m) => { if (alive) setManifest(m); })
      .catch((e) => { if (alive) setError(e.message || 'Could not load the library'); });
    return () => { alive = false; };
  }, []);

  // Close on Escape, matching the app's other modals.
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const wantKind = mode === 'centers' ? 'center' : 'card';
  const categories = useMemo(
    () => (manifest?.categories ?? []).filter((c) => c.kind === wantKind),
    [manifest, wantKind]
  );

  const visibleCards = useMemo(() => {
    const cats = activeCat === 'all' ? categories : categories.filter((c) => c.id === activeCat);
    const q = query.trim().toLowerCase();
    const cards = cats.flatMap((c) => c.cards);
    return q ? cards.filter((card) => card.name.toLowerCase().includes(q)) : cards;
  }, [categories, activeCat, query]);

  const selectedList = Object.values(selected);

  const handleCardClick = (card: LibraryCard) => {
    if (mode === 'centers') {
      // Single pick applies immediately (reversible) and closes.
      onPickCenter?.(card);
      onClose();
      return;
    }
    setSelected((prev) => {
      const next = { ...prev };
      if (next[card.id]) delete next[card.id];
      else next[card.id] = card;
      return next;
    });
  };

  const handleAdd = () => {
    if (selectedList.length === 0) return;
    onAddCards?.(selectedList);
    onClose();
  };

  // Portal to <body> so the fixed overlay covers the viewport — rendering in
  // place would trap it inside the editor column's containing block (transform/
  // scroll ancestor), confining the modal to that narrow panel.
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div>
            <h2 id="library-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Resource Library
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'centers'
                ? 'Pick a mandala for this card’s center'
                : 'Select cards to add to your sequence'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading / error / content */}
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
            <AlertCircle className="text-red-500" size={28} />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{error}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Run <code className="font-mono">npm run build:library</code> to generate it.
            </p>
          </div>
        ) : !manifest ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={20} /> Loading library…
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* Category sidebar */}
            <nav className="w-36 sm:w-44 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar p-2 space-y-1">
              <CategoryButton label="All" active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
              {categories.map((c) => (
                <CategoryButton
                  key={c.id}
                  label={c.label}
                  count={c.cards.length}
                  active={activeCat === c.id}
                  onClick={() => setActiveCat(c.id)}
                />
              ))}
            </nav>

            {/* Main: search + grid */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name…"
                    aria-label="Search the library"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {visibleCards.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center mt-8">No matches.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {visibleCards.map((card) => {
                      const isSel = !!selected[card.id];
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleCardClick(card)}
                          aria-pressed={mode === 'cards' ? isSel : undefined}
                          title={card.name}
                          className={`group relative flex flex-col rounded-lg border overflow-hidden transition-all active:scale-95 ${
                            isSel
                              ? 'border-blue-500 ring-2 ring-blue-400/50'
                              : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                          }`}
                        >
                          {/* White tile so white-ground cards read correctly in any theme */}
                          <div className="aspect-[3/4] bg-white flex items-center justify-center overflow-hidden">
                            <img
                              src={libraryImageUrl(card.file)}
                              alt={card.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          {isSel && (
                            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow">
                              <Check size={13} />
                            </span>
                          )}
                          <span className="text-xs leading-tight font-medium text-slate-700 dark:text-slate-200 px-2 py-1.5 truncate w-full text-center bg-slate-50 dark:bg-slate-800/50">
                            {card.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer (cards mode only — centers apply on click) */}
        {mode === 'cards' && manifest && !error && (
          <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {selectedList.length} selected
            </span>
            <div className="flex gap-2">
              {selectedList.length > 0 && (
                <button
                  onClick={() => setSelected({})}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleAdd}
                disabled={selectedList.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {selectedList.length || ''} {selectedList.length === 1 ? 'card' : 'cards'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

const CategoryButton: React.FC<{ label: string; count?: number; active: boolean; onClick: () => void }> = ({
  label,
  count,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors ${
      active
        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    <span className="truncate">{label}</span>
    {count != null && <span className="text-[10px] tabular-nums text-slate-400">{count}</span>}
  </button>
);

export default LibraryModal;
