import { useRef, useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import type { Card, CardContent, TransitionShape, TransitionSpin } from '@/domain/card';
import { cardDurationMs } from '@/domain/timing';
import { useSequencerStore } from '@/store/sequencerStore';
import { useRepositories } from '@/data/repository-context';
import { useToast } from '@/components/ui/toastContext';
import { CardView } from '@/render/CardView';
import { resolveStyleConfig } from '@/features/styles/useStyles';
import { exportSequenceJson, importSequenceJson } from './deckIO';
import { SharePrescription } from './SharePrescription';
import { PrescriptionPicker } from './PrescriptionPicker';
import { SequenceTonePanel } from '@/audio/SequenceTonePanel';
import { cn } from '@/lib/cn';

const BASES: RateBase[] = [9, 10, 44];
const SHAPES: TransitionShape[] = ['sunflower', 'celtic', 'triskelion'];
const SPINS: TransitionSpin[] = ['off', 'cw', 'ccw', 'alternate'];
const numInput =
  'rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900';

// Parse a free-typed rate ("5 10 21" / "5,10,21") into clamped dial positions.
const parseRate = (text: string, base: number): number[] =>
  text
    .split(/[\s,]+/)
    .filter((t) => t !== '')
    .map((t) => Math.max(0, Math.min(base, Math.round(Number(t)))))
    .filter((n) => Number.isFinite(n));

// "1.5s" / "21s" / "2:05" — compact human duration.
function fmtDuration(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${Number.isInteger(s) ? s : s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}

// One colour per card kind, shared by the timeline bar and its legend.
const CARD_TYPE_META: Record<string, { label: string; bar: string; dot: string }> = {
  remedy: { label: 'Remedy', bar: 'bg-sky-400 hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400', dot: 'bg-sky-400 dark:bg-sky-500' },
  data: { label: 'Custom rate', bar: 'bg-violet-400 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400', dot: 'bg-violet-400 dark:bg-violet-500' },
  image: { label: 'Artwork', bar: 'bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400', dot: 'bg-emerald-400 dark:bg-emerald-500' },
  transition: { label: 'Transition', bar: 'bg-amber-400 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400', dot: 'bg-amber-400 dark:bg-amber-500' },
};
const FALLBACK_META = { label: 'Card', bar: 'bg-slate-400 hover:bg-slate-500 dark:bg-slate-500', dot: 'bg-slate-400 dark:bg-slate-500' };
const cardTypeMeta = (kind: string) => CARD_TYPE_META[kind] ?? FALLBACK_META;
const KIND_ORDER = ['remedy', 'data', 'image', 'transition'];

// A horizontal bar visualising the whole sequence: one segment per card, sized
// by its play duration (flex-grow, with a min width so brief cards stay
// clickable) and coloured by card type. Click a segment to jump; the active
// card keeps its type colour and gains a ring. Total duration sits beside, and
// a legend names the colours of the types present.
function SequenceTimeline({
  cards,
  perCardMs,
  activeIndex,
  onSelect,
}: {
  cards: Card[];
  perCardMs: number;
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  if (cards.length === 0) return null;
  const durations = cards.map((c) => cardDurationMs(c, perCardMs));
  const total = durations.reduce((a, b) => a + b, 0);
  const kindsPresent = KIND_ORDER.filter((k) => cards.some((c) => c.content.kind === k));
  return (
    <div className="space-y-1" aria-label="Sequence timeline">
      <div className="flex items-center gap-2">
        <div className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {cards.map((card, i) => {
            const meta = cardTypeMeta(card.content.kind);
            const dur = durations[i] ?? perCardMs;
            const active = i === activeIndex;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelect(i)}
                title={`${i + 1}. ${card.title} · ${meta.label} · ${fmtDuration(dur)}`}
                aria-label={`${i + 1}. ${card.title}, ${meta.label}, ${fmtDuration(dur)}`}
                style={{ flexGrow: dur, flexBasis: 0, minWidth: '4px' }}
                className={cn(
                  'h-full border-r border-white/80 transition-colors last:border-r-0 dark:border-slate-950/50',
                  meta.bar,
                  active && 'z-10 ring-2 ring-inset ring-slate-900/80 dark:ring-white',
                )}
              />
            );
          })}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400" title="Total duration">
          {fmtDuration(total)}
        </span>
      </div>
      {kindsPresent.length > 1 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
          {kindsPresent.map((k) => {
            const meta = cardTypeMeta(k);
            return (
              <span key={k} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Edit a card's name + description inline, like the old app. Works for any card.
// For a remedy card, its note is written through to the library remedy (by ref)
// so practitioner notes propagate back to the database.
function CardHeaderEditor({ card }: { card: Card }) {
  const update = useSequencerStore.getState().updateCard;
  const { remedies } = useRepositories();
  const qc = useQueryClient();
  const content = card.content;
  const propagateNotes = () => {
    if (content.kind === 'remedy') {
      void remedies
        .setNotes(content.ref, card.notes ?? '')
        .then(() => qc.invalidateQueries({ queryKey: ['remedy-search'] }))
        .catch((err) => console.error('Propagate note failed', err));
    }
  };
  return (
    <div className="space-y-1.5">
      <input
        value={card.title}
        onChange={(e) => update(card.id, { title: e.target.value })}
        placeholder="Card name"
        aria-label="Card name"
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
      />
      <input
        value={card.description ?? ''}
        onChange={(e) => update(card.id, { description: e.target.value })}
        placeholder="Description"
        aria-label="Card description"
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
      />
      <textarea
        value={card.notes ?? ''}
        onChange={(e) => update(card.id, { notes: e.target.value })}
        onBlur={propagateNotes}
        placeholder={content.kind === 'remedy' ? 'Notes (saved to the library card)' : 'Notes (not shown on the card)'}
        aria-label="Card notes"
        rows={2}
        className="w-full resize-y rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
      />
    </div>
  );
}

// Edit the number sequence + base of any rate-bearing card (remedy OR data),
// like the old app: type the rate freely ("5 10 21"). A remedy keeps its `ref`
// (provenance) while its rate is overridden in place. Local text state so you
// can type spaces/new positions without the field fighting you; remounts per
// card (the panel is keyed by card id).
function RateEditor({ card }: { card: Card }) {
  const update = useSequencerStore.getState().updateCard;
  const c = card.content;
  const initial = c.kind === 'remedy' || c.kind === 'data' ? c.sequence.join(' ') : '';
  const [text, setText] = useState(initial);
  if (c.kind !== 'remedy' && c.kind !== 'data') return null;

  const write = (nextBase: RateBase, nextSeq: number[]) => {
    const content: CardContent =
      c.kind === 'remedy'
        ? { kind: 'remedy', ref: c.ref, base: nextBase, sequence: nextSeq }
        : { kind: 'data', base: nextBase, sequence: nextSeq };
    update(card.id, { content });
  };

  return (
    <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1">
          Base
          <select
            value={c.base}
            onChange={(e) => write(Number(e.target.value) as RateBase, parseRate(text, Number(e.target.value)))}
            className={numInput}
          >
            {BASES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <span className="text-slate-400">{c.sequence.length} positions</span>
      </div>
      <label className="block">
        <span className="mb-1 block">Rate (dial positions)</span>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            write(c.base, parseRate(e.target.value, c.base));
          }}
          inputMode="numeric"
          placeholder="e.g. 5 10 21"
          aria-label="Rate sequence"
          className={`w-full font-mono ${numInput} px-2 py-1`}
        />
      </label>
      <SequenceTonePanel sequence={c.sequence} base={c.base} />
    </div>
  );
}

// Pull a remedy's printed picture into the card centre as a circular photo (and
// clear it). Only remedy cards can fetch artwork; any card with one can clear it.
function PhotoCentreToggle({ card }: { card: Card }) {
  const { remedies } = useRepositories();
  const setCardCenterImage = useSequencerStore.getState().setCardCenterImage;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const c = card.content;
  const has = !!card.centerImage;
  const canFetch = c.kind === 'remedy';
  if (!has && !canFetch) return null;

  const onToggle = async (checked: boolean) => {
    if (!checked) {
      setCardCenterImage(card.id, undefined);
      return;
    }
    if (c.kind !== 'remedy') return;
    setBusy(true);
    try {
      const r = await remedies.getByRef(c.ref);
      // The engine crops the printed card's photo circle out of the artwork.
      if (r?.image) setCardCenterImage(card.id, { src: `packs/${r.packId}/${r.image.light}`, circle: true });
      else toast.show('No artwork for this card', 'info');
    } catch (err) {
      console.error('Center image fetch failed', err);
      toast.show('Could not load artwork', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <input type="checkbox" checked={has} disabled={busy} onChange={(e) => void onToggle(e.target.checked)} />
      Photo centre {busy && <span className="text-[10px] text-slate-400">loading…</span>}
    </label>
  );
}

// Per-card dwell time. Transition cards write content.durationMs; every other
// card writes the top-level override (blank = inherits the sequence default).
function DurationControl({ card, perCardMs }: { card: Card; perCardMs: number }) {
  const setCardDuration = useSequencerStore.getState().setCardDuration;
  const isTransition = card.content.kind === 'transition';
  const value =
    card.content.kind === 'transition' ? card.content.durationMs : (card.durationMs ?? perCardMs);
  const usesDefault = !isTransition && card.durationMs === undefined;

  return (
    <div className="flex items-center gap-2 border-t border-slate-200/70 pt-2 text-xs text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
      <label className="flex items-center gap-1">
        Duration
        <input
          type="number"
          min={200}
          step={100}
          value={value}
          onChange={(e) => setCardDuration(card.id, Math.max(200, Number(e.target.value) || perCardMs))}
          className={`w-20 ${numInput}`}
        />
        ms
      </label>
      {usesDefault ? (
        <span className="text-[10px] text-slate-400">default</span>
      ) : (
        !isTransition && (
          <button
            type="button"
            onClick={() => setCardDuration(card.id, undefined)}
            className="text-[10px] text-blue-600 hover:underline dark:text-blue-400"
          >
            reset
          </button>
        )
      )}
    </div>
  );
}

// Image cards: artwork is fixed once added; show what it is so the panel isn't
// empty (Duration is added by the shared options wrapper).
function ImageOptions({ card }: { card: Card }) {
  if (card.content.kind !== 'image') return null;
  const file = card.content.light.split('/').pop() ?? card.content.light;
  return (
    <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={card.content.light}>
      Artwork: <span className="font-mono">{file}</span>
    </p>
  );
}

// One inline panel shown for EVERY selected card, so all card types are
// consistent: name/description, kind-specific controls, then per-card Duration.
function CardOptions({ card, perCardMs }: { card: Card; perCardMs: number }) {
  const c = card.content;
  const isRate = c.kind === 'remedy' || c.kind === 'data';
  return (
    <div className="mt-2 space-y-2.5 rounded-md border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/40">
      <CardHeaderEditor card={card} />
      {isRate && <RateEditor card={card} />}
      {c.kind === 'transition' && <TransitionEditor card={card} />}
      {c.kind === 'image' && <ImageOptions card={card} />}
      {isRate && <PhotoCentreToggle card={card} />}
      <DurationControl card={card} perCardMs={perCardMs} />
    </div>
  );
}

function TransitionEditor({ card }: { card: Card }) {
  const update = useSequencerStore.getState().updateCard;
  const c = card.content;
  if (c.kind !== 'transition') return null;
  // Spread existing content so durationMs (managed by DurationControl) survives.
  const patch = (p: Partial<{ shape: TransitionShape; spin: TransitionSpin; spinSeconds: number }>) =>
    update(card.id, { content: { ...c, ...p } });
  return (
    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
      <label className="flex items-center justify-between gap-1">
        Shape
        <select value={c.shape} onChange={(e) => patch({ shape: e.target.value as TransitionShape })} className={numInput}>
          {SHAPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-1">
        Spin
        <select value={c.spin} onChange={(e) => patch({ spin: e.target.value as TransitionSpin })} className={numInput}>
          {SPINS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="col-span-2 flex items-center gap-1">
        Spin secs
        <input
          type="number"
          min={2}
          max={60}
          value={c.spinSeconds}
          onChange={(e) => patch({ spinSeconds: Math.max(2, Number(e.target.value) || 24) })}
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
        <PrescriptionPicker />
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
          <SharePrescription sequence={store().sequence} stylesById={stylesById} />
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
          <label className="flex items-center gap-1" title="Default dwell for cards that don't set their own Duration">
            Default
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

        <SequenceTimeline
          cards={cards}
          perCardMs={timing.perCardMs}
          activeIndex={activeIndex}
          onSelect={(i) => store().selectCard(i)}
        />
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
              {active && <CardOptions key={card.id} card={card} perCardMs={timing.perCardMs} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
