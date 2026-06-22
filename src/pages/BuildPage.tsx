import { useEffect, useState } from 'react';
import type { Remedy } from '@/domain/remedy';
import type { StyleId } from '@/domain/ids';
import { useSequencerStore } from '@/store/sequencerStore';
import { useRenderTier } from '@/hooks/useRenderTier';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { buildStylesMap, resolveStyleConfig, useStyles } from '@/features/styles/useStyles';
import { RemedySearchPanel, type AddMode } from '@/features/remedy-search/RemedySearchPanel';
import { SequenceBuilder } from '@/features/build/SequenceBuilder';
import { StylePicker } from '@/features/build/StylePicker';
import { ExportControls } from '@/features/export/ExportControls';
import { CardView } from '@/render/CardView';

export function BuildPage() {
  const { data: styles } = useStyles();
  const stylesById = buildStylesMap(styles);
  const [currentStyleId, setCurrentStyleId] = useState<StyleId>('preset:sunflower');

  // If the current style was deleted, fall back to the first available one so new
  // cards never reference a ghost style id.
  useEffect(() => {
    if (styles && styles.length > 0 && !styles.some((s) => s.id === currentStyleId)) {
      setCurrentStyleId(styles[0]!.id);
    }
  }, [styles, currentStyleId]);

  const sequence = useSequencerStore((s) => s.sequence);
  const cards = sequence.cards;
  const activeIndex = useSequencerStore((s) => s.activeIndex);
  const activeCard = cards[activeIndex];
  const tier = useRenderTier();

  // Resizable preview/style column (desktop only; persisted).
  const isWide = useMediaQuery('(min-width: 1024px)');
  const { width: sideWidth, paneRef, startDrag, reset } = useResizableWidth<HTMLDivElement>(
    'qrp.build.sideW',
    340,
    260,
    720,
  );

  const onAdd = (r: Remedy, mode: AddMode) => {
    const s = useSequencerStore.getState();
    if (mode === 'artwork') s.addImageCards([r], currentStyleId);
    else s.addRemedyCards([r], currentStyleId);
  };
  const onPickStyle = (id: StyleId) => {
    setCurrentStyleId(id);
    useSequencerStore.getState().applyStyleToSelection(id);
  };

  return (
    <div
      className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-rows-[minmax(0,1fr)]"
      style={isWide ? { gridTemplateColumns: `300px minmax(0,1fr) ${sideWidth}px` } : undefined}
    >
      <aside className="h-[45vh] min-h-0 rounded-lg border border-slate-200 p-3 lg:h-auto dark:border-slate-800">
        <RemedySearchPanel onAdd={onAdd} />
      </aside>

      <section className="h-[55vh] min-h-0 lg:h-auto">
        <SequenceBuilder stylesById={stylesById} currentStyleId={currentStyleId} />
      </section>

      <div ref={paneRef} className="relative min-h-0">
        {isWide && <ResizeHandle onPointerDown={startDrag} onDoubleClick={reset} />}
        <aside className="custom-scrollbar h-full space-y-4 overflow-y-auto">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Preview
              </h2>
              <ExportControls activeCard={activeCard} sequence={sequence} stylesById={stylesById} />
            </div>
            <div className="mx-auto w-full">
              {activeCard ? (
                <CardView
                  card={activeCard}
                  style={resolveStyleConfig(activeCard, stylesById)}
                  tier={tier}
                  spin
                  active
                />
              ) : (
                <div className="flex aspect-4/7 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-400 dark:border-slate-700">
                  No card selected
                </div>
              )}
            </div>
          </div>
          <StylePicker styles={styles ?? []} currentStyleId={currentStyleId} onPick={onPickStyle} />
        </aside>
      </div>
    </div>
  );
}
