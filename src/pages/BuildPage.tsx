import { useState } from 'react';
import type { Remedy } from '@/domain/remedy';
import type { StyleId } from '@/domain/ids';
import { useSequencerStore } from '@/store/sequencerStore';
import { useSequencePersistence } from '@/hooks/useSequencePersistence';
import { buildStylesMap, resolveStyleConfig, useStyles } from '@/features/styles/useStyles';
import { RemedySearchPanel } from '@/features/remedy-search/RemedySearchPanel';
import { SequenceBuilder } from '@/features/build/SequenceBuilder';
import { StylePicker } from '@/features/build/StylePicker';
import { CardView } from '@/render/CardView';

export function BuildPage() {
  useSequencePersistence();
  const { data: styles } = useStyles();
  const stylesById = buildStylesMap(styles);
  const [currentStyleId, setCurrentStyleId] = useState<StyleId>('preset:sunflower');

  const cards = useSequencerStore((s) => s.sequence.cards);
  const activeIndex = useSequencerStore((s) => s.activeIndex);
  const activeCard = cards[activeIndex];

  const onAddRemedy = (r: Remedy) =>
    useSequencerStore.getState().addRemedyCards([r], currentStyleId);
  const onPickStyle = (id: StyleId) => {
    setCurrentStyleId(id);
    useSequencerStore.getState().applyStyleToSelection(id);
  };

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
      <aside className="min-h-0 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <RemedySearchPanel onAdd={onAddRemedy} />
      </aside>

      <section className="min-h-0">
        <SequenceBuilder stylesById={stylesById} currentStyleId={currentStyleId} />
      </section>

      <aside className="custom-scrollbar min-h-0 space-y-4 overflow-y-auto">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Preview
          </h2>
          <div className="mx-auto max-w-[260px]">
            {activeCard ? (
              <CardView
                card={activeCard}
                style={resolveStyleConfig(activeCard, stylesById)}
                spin
                active
              />
            ) : (
              <div className="flex aspect-[4/7] items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-400 dark:border-slate-700">
                No card selected
              </div>
            )}
          </div>
        </div>
        <StylePicker styles={styles ?? []} currentStyleId={currentStyleId} onPick={onPickStyle} />
      </aside>
    </div>
  );
}
