import { useRef } from 'react';
import { ChevronDown, ChevronUp, Copy, FilePlus2, GripVertical, Sparkles, Trash2 } from 'lucide-react';
import type { Style } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { useSequencerStore } from '@/store/sequencerStore';
import { CardView } from '@/render/CardView';
import { resolveStyleConfig } from '@/features/styles/useStyles';
import { cn } from '@/lib/cn';

function RateEditor({ cardId, sequence }: { cardId: string; sequence: number[] }) {
  const setCardRate = useSequencerStore.getState().setCardRate;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {sequence.map((v, i) => (
        <input
          key={i}
          type="number"
          min={0}
          max={99}
          value={v}
          aria-label={`Rate position ${i + 1}`}
          onChange={(e) => {
            const next = [...sequence];
            next[i] = Math.max(0, Math.min(99, Number(e.target.value) || 0));
            setCardRate(cardId, next);
          }}
          className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-center text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      ))}
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
  const timing = useSequencerStore((s) => s.sequence.timing);
  const activeIndex = useSequencerStore((s) => s.activeIndex);
  const selectedIds = useSequencerStore((s) => s.selectedIds);

  const store = useSequencerStore.getState;
  const dragIndex = useRef<number | null>(null);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => store().setName(e.target.value)}
            aria-label="Prescription name"
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => store().newSequence()}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
          >
            New
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <label className="flex items-center gap-1">
            Card
            <input
              type="number"
              min={200}
              step={100}
              value={timing.perCardMs}
              onChange={(e) => store().setTiming({ perCardMs: Math.max(200, Number(e.target.value) || 1500) })}
              className="w-20 rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-slate-700 dark:bg-slate-900"
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
              className="w-20 rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-slate-700 dark:bg-slate-900"
            />
            ms
          </label>
        </div>
        <div className="flex gap-2">
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
              {active && card.content.kind === 'data' && (
                <RateEditor cardId={card.id} sequence={card.content.sequence} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
