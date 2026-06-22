import { useRef } from 'react';
import { Maximize, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useSequencerStore } from '@/store/sequencerStore';
import { usePlaybackClock } from '@/hooks/usePlaybackClock';
import { useRenderTier } from '@/hooks/useRenderTier';
import { buildStylesMap, resolveStyleConfig, useStyles } from '@/features/styles/useStyles';
import { ExportControls } from '@/features/export/ExportControls';
import { CardView } from '@/render/CardView';
import { CardCrossfade } from '@/render/CardCrossfade';

export function PresentPage() {
  usePlaybackClock();
  const { data: styles } = useStyles();
  const stylesById = buildStylesMap(styles);

  const sequence = useSequencerStore((s) => s.sequence);
  const cards = sequence.cards;
  const activeIndex = useSequencerStore((s) => s.activeIndex);
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const crossfadeMs = sequence.timing.crossfadeMs;
  const activeCard = cards[activeIndex];

  const stageRef = useRef<HTMLDivElement>(null);
  const store = useSequencerStore.getState;
  const tier = useRenderTier();
  const iconBtn =
    'rounded-md border border-slate-300 p-2 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-900';

  return (
    <div className="flex h-full flex-col items-center gap-4 p-4">
      <div
        ref={stageRef}
        className="flex min-h-0 w-full flex-1 items-center justify-center bg-white p-2 dark:bg-slate-950"
      >
        {activeCard ? (
          <CardCrossfade cardKey={activeCard.id} durationMs={crossfadeMs} className="h-full w-full">
            <CardView card={activeCard} style={resolveStyleConfig(activeCard, stylesById)} tier={tier} spin active fill="height" />
          </CardCrossfade>
        ) : (
          <p className="text-center text-sm text-slate-400">No cards — build a prescription first.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          aria-label="Previous"
          className={iconBtn}
          disabled={activeIndex <= 0}
          onClick={() => store().selectCard(Math.max(0, activeIndex - 1))}
        >
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={iconBtn}
          disabled={cards.length === 0}
          onClick={() => store().togglePlay()}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          type="button"
          aria-label="Next"
          className={iconBtn}
          disabled={activeIndex >= cards.length - 1}
          onClick={() => store().selectCard(Math.min(cards.length - 1, activeIndex + 1))}
        >
          <SkipForward className="h-5 w-5" />
        </button>
        <span className="px-2 text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {cards.length ? `${activeIndex + 1} / ${cards.length}` : '0 / 0'}
        </span>
        <button
          type="button"
          aria-label="Fullscreen"
          className={iconBtn}
          onClick={() => void stageRef.current?.requestFullscreen?.()}
        >
          <Maximize className="h-5 w-5" />
        </button>
        <ExportControls activeCard={activeCard} sequence={sequence} stylesById={stylesById} />
      </div>
    </div>
  );
}
