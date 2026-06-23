import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { Style, StyleConfig } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { CardSurface } from '@/render/CardSurface';
import { CardView } from '@/render/CardView';
import { useStyles } from '@/features/styles/useStyles';
import { useStyleMutations } from '@/features/styles/useStyleMutations';
import { StyleEditor } from '@/features/styles/StyleEditor';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRenderTier } from '@/hooks/useRenderTier';
import { useSequencerStore } from '@/store/sequencerStore';
import { BUILTIN_STYLE_PRESETS, CENTER_IMAGE_SCALE_DEFAULT } from '@/engine/presets';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { cn } from '@/lib/cn';

const SAMPLE = [0, 1, 0, 3, 0, 1, 0, 2, 0];

const presetConfigFor = (id: StyleId): StyleConfig | undefined =>
  BUILTIN_STYLE_PRESETS.find((p) => p.id === id)?.config;

// Backfill defaults for fields a stored style may pre-date (e.g. photo size).
const withDefaults = (c: StyleConfig): StyleConfig => ({
  ...c,
  centerImageScale: c.centerImageScale ?? CENTER_IMAGE_SCALE_DEFAULT,
});

// Flat config equality (StyleConfig is all primitives).
const sameConfig = (a: StyleConfig, b: StyleConfig): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof StyleConfig>;
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
};

export function StylesPage() {
  const { data: styles } = useStyles();
  // STABLE display order — builtins first, then by createdAt — so editing a
  // style (which bumps updatedAt) never reorders the tiles or shifts selection.
  const list = useMemo(
    () =>
      [...(styles ?? [])].sort((a, b) =>
        a.builtin === b.builtin ? a.createdAt - b.createdAt : a.builtin ? -1 : 1,
      ),
    [styles],
  );
  const { create, duplicate, remove, save } = useStyleMutations();

  const [selectedId, setSelectedId] = useState<StyleId | null>(null);
  const selected = list.find((s) => s.id === selectedId) ?? list[0] ?? null;

  // Pin the selection by id once loaded (so it's never positional).
  useEffect(() => {
    if (selectedId === null && selected) setSelectedId(selected.id);
  }, [selectedId, selected]);

  const [draft, setDraft] = useState<StyleConfig | null>(null);
  const [name, setName] = useState('');
  const syncedId = useRef<StyleId | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ style: Style; name: string; config: StyleConfig } | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  // Persist the most recent edit immediately (used before switching styles + on
  // unmount) so a debounced edit is never silently dropped. Stable identity.
  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const p = pending.current;
    if (p) {
      pending.current = null;
      void saveRef.current({ ...p.style, name: p.name, config: p.config });
    }
  }, []);

  const discardPending = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    pending.current = null;
  }, []);

  // Flush any pending edit before syncing to a newly-selected style.
  useEffect(() => {
    if (selected && selected.id !== syncedId.current) {
      flush();
      setDraft(withDefaults(selected.config));
      setName(selected.name);
      syncedId.current = selected.id;
    }
  }, [selected, flush]);

  // Flush on unmount.
  useEffect(() => () => flush(), [flush]);

  const scheduleSave = (style: Style, nextName: string, config: StyleConfig) => {
    pending.current = { style, name: nextName, config };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 400);
  };

  // Builtins are editable in place (saved like any style); they can be reverted
  // to the shipped preset rather than forcing a duplicate.
  const onChangeConfig = (config: StyleConfig) => {
    if (!selected) return;
    setDraft(config);
    scheduleSave(selected, name, config);
  };
  const onChangeName = (n: string) => {
    setName(n);
    if (selected) scheduleSave(selected, n, draft ?? selected.config);
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
  const presetConfig = selected?.builtin ? presetConfigFor(selected.id) : undefined;
  const isModified = !!(presetConfig && previewConfig && !sameConfig(previewConfig, presetConfig));

  const handleRevert = async () => {
    if (!selected || !presetConfig) return;
    discardPending();
    const presetName = BUILTIN_STYLE_PRESETS.find((p) => p.id === selected.id)?.name ?? selected.name;
    setDraft(presetConfig);
    setName(presetName);
    await save({ ...selected, name: presetName, config: presetConfig });
  };

  // The preview shows the card last selected in Build (rendered with the style
  // being edited) so you tune against a real card; otherwise a sample pattern.
  const buildCard = useSequencerStore((s) => s.sequence.cards[s.activeIndex]);
  const tier = useRenderTier();

  // Resizable preview column (desktop only; persisted).
  const isWide = useMediaQuery('(min-width: 768px)');
  const { width: previewWidth, paneRef, startDrag, reset } = useResizableWidth<HTMLDivElement>(
    'qrp.styles.previewW',
    300,
    220,
    600,
  );

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

      <section
        className="grid min-h-0 grid-cols-1 gap-4"
        style={isWide ? { gridTemplateColumns: `minmax(0,1fr) ${previewWidth}px` } : undefined}
      >
        <div className="custom-scrollbar min-h-0 overflow-y-auto">
          {selected ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => onChangeName(e.target.value)}
                  aria-label="Style name"
                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                {selected.builtin && isModified && (
                  <button type="button" onClick={() => void handleRevert()} title="Revert to the shipped built-in" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40">
                    <RotateCcw className="h-3.5 w-3.5" /> Revert
                  </button>
                )}
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
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                  Built-in style — your edits are saved on this device{isModified ? ' and can be reverted.' : '.'}
                </p>
              )}
              {previewConfig && <StyleEditor config={previewConfig} onChange={onChangeConfig} />}
            </>
          ) : (
            <p className="text-sm text-slate-400">No styles yet — create one.</p>
          )}
        </div>
        <div ref={paneRef} className="relative md:sticky md:top-0 md:self-start">
          {isWide && <ResizeHandle onPointerDown={startDrag} onDoubleClick={reset} />}
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Preview
          </h2>
          <div className="mx-auto w-full">
            {previewConfig &&
              (buildCard ? (
                <CardView card={buildCard} style={previewConfig} tier={tier} spin active />
              ) : (
                <CardSurface style={previewConfig} sequence={SAMPLE} title={name} spin />
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
