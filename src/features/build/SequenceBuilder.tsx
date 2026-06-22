import { useRef, type ChangeEvent } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FilePlus2,
  GripVertical,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import type { Style } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import type { RateBase } from '@/domain/remedy';
import type { TransitionShape, TransitionSpin } from '@/domain/card';
import { useSequencerStore } from '@/store/sequencerStore';
import { useToast } from '@/components/ui/toastContext';
import { CardView } from '@/render/CardView';
import { resolveStyleConfig } from '@/features/styles/useStyles';
import { exportSequenceJson, importSequenceJson } from './deckIO';
import { cn } from '@/lib/cn';

const BASES: RateBase[] = [9, 10, 44];
const SHAPES: TransitionShape[] = ['sunflower', 'celtic', 'triskelion'];
const SPINS: TransitionSpin[] = ['off', 'cw', 'ccw', 'alternate'];
const numInput =
  'rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900';

const resize = (seq: number[], len: number) =>
  len <= seq.length ? seq.slice(0, len) : [...seq, ...new Array<number>(len - seq.length).fill(0)];

function DataCardEditor({ id, base, sequence }: { id: string; base: RateBase; sequence: number[] }) {
  const update = useSequencerStore.getState().updateCard;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <label className="flex items-center gap-1">
          Base
          <select
            value={base}
            onChange={(e) =>
              update(id, { content: { kind: 'data', base: Number(e.target.value) as RateBase, sequence } })
            }
            className={numInput}
          >
            {BASES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Steps
          <input
            type="number"
            min={1}
            max={44}
            value={sequence.length}
            onChange={(e) => {
              const len = Math.max(1, Math.min(44, Number(e.target.value) || 1));
              update(id, { content: { kind: 'data', base, sequence: resize(sequence, len) } });
            }}
            className={`w-14 ${numInput}`}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        {sequence.map((v, i) => (
          <input
            key={i}
            type="number"
            min={0}
            max={99}
            value={v}
            aria-label={`Position ${i + 1}`}
            onChange={(e) => {
              const next = [...sequence];
              next[i] = Math.max(0, Math.min(99, Number(e.target.value) || 0));
              update(id, { content: { kind: 'data', base, sequence: next } });
            }}
            className={`w-12 text-center ${numInput}`}
          />
        ))}
      </div>
    </div>
  );
}

function TransitionEditor({
  id,
  shape,
  spin,
  spinSeconds,
  durationMs,
}: {
  id: string;
  shape: TransitionShape;
  spin: TransitionSpin;
  spinSeconds: number;
  durationMs: number;
}) {
  const update = useSequencerStore.getState().updateCard;
  const patch = (p: Partial<{ shape: TransitionShape; spin: TransitionSpin; spinSeconds: number; durationMs: number }>) =>
    update(id, { content: { kind: 'transition', shape, spin, spinSeconds, durationMs, ...p } });
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
      <label className="flex items-center justify-between gap-1">
        Shape
        <select value={shape} onChange={(e) => patch({ shape: e.target.value as TransitionShape })} className={numInput}>
          {SHAPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-1">
        Spin
        <select value={spin} onChange={(e) => patch({ spin: e.target.value as TransitionSpin })} className={numInput}>
          {SPINS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-1">
        Spin secs
        <input
          type="number"
          min={2}
          max={60}
          value={spinSeconds}
          onChange={(e) => patch({ spinSeconds: Math.max(2, Number(e.target.value) || 24) })}
          className={`w-16 ${numInput}`}
        />
      </label>
      <label className="flex items-center justify-between gap-1">
        Hold ms
        <input
          type="number"
          min={200}
          step={100}
          value={durationMs}
          onChange={(e) => patch({ durationMs: Math.max(200, Number(e.target.value) || 2500) })}
          className={`w-16 ${numInput}`}
        />
      </label>
    </div>
  );
}

export function SequenceBuilder({
  stylesById,
  currentStyleId,
}: {
  stylesById: Map<StyleId, Style>;
  currentStyleId: StyleId;
}) {
  const cards = useSequencerStore((s) => s.sequence.cards);
  const name = useSequencerStore((s) => s.sequence.name);
  const patientRef = useSequencerStore((s) => s.sequence.patientRef ?? '');
  const notes = useSequencerStore((s) => s.sequence.notes ?? '');
  const timing = useSequencerStore((s) => s.sequence.timing);
  const activeIndex = useSequencerStore((s) => s.activeIndex);
  const selectedIds = useSequencerStore((s) => s.selectedIds);

  const store = useSequencerStore.getState;
  const toast = useToast();
  const dragIndex = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      store().loadSequence(await importSequenceJson(file));
      toast.show('Prescription imported', 'success');
    } catch (err) {
      console.error('Import failed', err);
      toast.show('Invalid prescription file', 'error');
    }
  };

  const iconBtn =
    'rounded-md border border-slate-300 p-1.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <input
            value={name}
            onChange={(e) => store().setName(e.target.value)}
            aria-label="Prescription name"
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
          />
          <button type="button" onClick={() => store().undo()} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo" className={iconBtn}>
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => exportSequenceJson(store().sequence)} title="Export prescription (JSON)" aria-label="Export" className={iconBtn}>
            <Download className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} title="Import prescription (JSON)" aria-label="Import" className={iconBtn}>
            <Upload className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => store().newSequence()}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            New
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onImport(e)} />
        </div>

        <details className="rounded-md border border-slate-200 text-xs dark:border-slate-800">
          <summary className="cursor-pointer px-2 py-1 text-slate-500 dark:text-slate-400">Patient details</summary>
          <div className="space-y-2 p-2">
            <input
              value={patientRef}
              onChange={(e) => store().setPatientRef(e.target.value)}
              placeholder="Patient reference"
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
            <textarea
              value={notes}
              onChange={(e) => store().setNotes(e.target.value)}
              placeholder="Notes"
              rows={2}
              className="w-full resize-y rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </details>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <label className="flex items-center gap-1">
            Card
            <input
              type="number"
              min={200}
              step={100}
              value={timing.perCardMs}
              onChange={(e) => store().setTiming({ perCardMs: Math.max(200, Number(e.target.value) || 1500) })}
              className={`w-20 ${numInput}`}
            />
            ms
          </label>
          <label className="flex items-center gap-1">
            Fade
            <input
              type="number"
              min={0}
              step={100}
              value={timing.crossfadeMs}
              onChange={(e) => store().setTiming({ crossfadeMs: Math.max(0, Number(e.target.value) || 0) })}
              className={`w-20 ${numInput}`}
            />
            ms
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => store().addDataCard(currentStyleId)}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            <FilePlus2 className="h-3.5 w-3.5" /> Blank card
          </button>
          <button
            type="button"
            onClick={() => store().addTransitionCard(currentStyleId)}
            className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            <Sparkles className="h-3.5 w-3.5" /> Transition
          </button>
          {cards.length > 0 && (
            <>
              <button type="button" onClick={() => store().selectAll()} className="ml-auto text-xs text-blue-600 hover:underline dark:text-blue-400">
                Select all
              </button>
              <span className="text-xs text-slate-400">{selectedIds.length} selected</span>
              {selectedIds.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const n = selectedIds.length;
                    store().bulkDelete(selectedIds);
                    toast.show(`Deleted ${n} cards`, 'info');
                  }}
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Card list */}
      <div className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {cards.length === 0 && (
          <p className="px-1 py-8 text-center text-sm text-slate-400">
            Search remedies on the left and add them to build a prescription.
          </p>
        )}
        {cards.map((card, i) => {
          const selected = selectedIds.includes(card.id);
          const active = i === activeIndex;
          const style = resolveStyleConfig(card, stylesById);
          const c = card.content;
          const subtitle =
            c.kind === 'transition'
              ? 'Transition'
              : c.kind === 'image'
                ? 'Image card'
                : `Base ${c.base} · ${stylesById.get(card.styleId)?.name ?? 'style'}`;
          return (
            <div
              key={card.id}
              draggable
              onDragStart={() => {
                dragIndex.current = i;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const from = dragIndex.current;
                if (from !== null && from !== i) store().reorderCards(from, i);
                dragIndex.current = null;
              }}
              className={cn(
                'rounded-md border p-2',
                active
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                  : selected
                    ? 'border-blue-300 dark:border-blue-800'
                    : 'border-slate-200 dark:border-slate-800',
              )}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300 dark:text-slate-600" />
                <button
                  type="button"
                  onClick={(e) => {
                    if (e.shiftKey) store().selectRangeTo(i);
                    else if (e.ctrlKey || e.metaKey) store().toggleSelectAt(i);
                    else store().selectCard(i);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="w-10 shrink-0">
                    <CardView card={card} style={style} tier="lite" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-800 dark:text-slate-200">
                      {i + 1}. {card.title}
                    </span>
                    <span className="block truncate text-xs text-slate-400">{subtitle}</span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 text-slate-400">
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => store().reorderCards(i, i - 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Move down" disabled={i === cards.length - 1} onClick={() => store().reorderCards(i, i + 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Duplicate" onClick={() => store().duplicateCard(card.id)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Delete" onClick={() => store().deleteCard(card.id)} className="rounded p-1 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {active && c.kind === 'data' && <DataCardEditor id={card.id} base={c.base} sequence={c.sequence} />}
              {active && c.kind === 'transition' && (
                <TransitionEditor id={card.id} shape={c.shape} spin={c.spin} spinSeconds={c.spinSeconds} durationMs={c.durationMs} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
