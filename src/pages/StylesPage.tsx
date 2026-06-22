import { useEffect, useRef, useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { Style, StyleConfig } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { CardSurface } from '@/render/CardSurface';
import { useStyles } from '@/features/styles/useStyles';
import { useStyleMutations } from '@/features/styles/useStyleMutations';
import { StyleEditor } from '@/features/styles/StyleEditor';
import { cn } from '@/lib/cn';

const SAMPLE = [0, 1, 0, 3, 0, 1, 0, 2, 0];

export function StylesPage() {
  const { data: styles } = useStyles();
  const list = styles ?? [];
  const { create, duplicate, remove, save } = useStyleMutations();

  const [selectedId, setSelectedId] = useState<StyleId | null>(null);
  const selected = list.find((s) => s.id === selectedId) ?? list[0] ?? null;

  const [draft, setDraft] = useState<StyleConfig | null>(null);
  const [name, setName] = useState('');
  const syncedId = useRef<StyleId | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected && selected.id !== syncedId.current) {
      setDraft(selected.config);
      setName(selected.name);
      syncedId.current = selected.id;
    }
  }, [selected]);

  const scheduleSave = (style: Style, nextName: string, config: StyleConfig) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save({ ...style, name: nextName, config }), 400);
  };

  const onChangeConfig = (config: StyleConfig) => {
    if (!selected || selected.builtin) return;
    setDraft(config);
    scheduleSave(selected, name, config);
  };
  const onChangeName = (n: string) => {
    setName(n);
    if (selected && !selected.builtin) scheduleSave(selected, n, draft ?? selected.config);
  };

  const handleNew = async () => setSelectedId((await create()).id);
  const handleDuplicate = async () => {
    if (selected) setSelectedId((await duplicate(selected)).id);
  };
  const handleDelete = async () => {
    if (selected && !selected.builtin) {
      await remove(selected.id);
      setSelectedId(null);
    }
  };

  const previewConfig = draft ?? selected?.config;

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="custom-scrollbar min-h-0 overflow-y-auto">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-sm font-semibold">Style Library</h1>
          <button
            type="button"
            onClick={() => void handleNew()}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {list.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              className={cn(
                'rounded-md border p-1.5 text-left transition-colors',
                s.id === selected?.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
              )}
            >
              <div className="pointer-events-none">
                <CardSurface style={s.config} sequence={SAMPLE} tier="balanced" />
              </div>
              <span className="mt-1 block truncate text-[11px] text-slate-600 dark:text-slate-300">
                {s.name}
                {s.builtin && <span className="text-slate-400"> · builtin</span>}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="custom-scrollbar min-h-0 overflow-y-auto">
          {selected ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => onChangeName(e.target.value)}
                  disabled={selected.builtin}
                  aria-label="Style name"
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
                />
                <button type="button" onClick={() => void handleDuplicate()} title="Duplicate" className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">
                  <Copy className="h-4 w-4" />
                </button>
                {!selected.builtin && (
                  <button type="button" onClick={() => void handleDelete()} title="Delete" className="rounded-md border border-slate-300 p-1.5 hover:bg-red-50 hover:text-red-500 dark:border-slate-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {selected.builtin && (
                <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
                  Built-in style — duplicate to edit.
                </p>
              )}
              {previewConfig && <StyleEditor config={previewConfig} onChange={onChangeConfig} disabled={selected.builtin} />}
            </>
          ) : (
            <p className="text-sm text-slate-400">No styles yet — create one.</p>
          )}
        </div>
        <div className="md:sticky md:top-0 md:self-start">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Preview
          </h2>
          <div className="mx-auto max-w-[240px]">
            {previewConfig && <CardSurface style={previewConfig} sequence={SAMPLE} title={name} spin />}
          </div>
        </div>
      </section>
    </div>
  );
}
