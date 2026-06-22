import { useRef } from 'react';
import { Download, Maximize, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useSequencerStore } from '@/store/sequencerStore';
import { usePlaybackClock } from '@/hooks/usePlaybackClock';
import { buildStylesMap, resolveStyleConfig, useStyles } from '@/features/styles/useStyles';
import { CardView } from '@/render/CardView';
import { CardCrossfade } from '@/render/CardCrossfade';
import { exportCardPng } from '@/render/exportPng';

export function PresentPage() {
  usePlaybackClock();
  const { data: styles } = useStyles();
  const stylesById = buildStylesMap(styles);

  const cards = useSequencerStore((s) => s.sequence.cards);
  const activeIndex = useSequencerStore((s) => s.activeIndex);
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const crossfadeMs = useSequencerStore((s) => s.sequence.timing.crossfadeMs);
  const activeCard = cards[activeIndex];

  const stageRef = useRef<HTMLDivElement>(null);
  const store = useSequencerStore.getState;
  const iconBtn =
    'rounded-md border border-slate-300 p-2 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-900';

  return (
    <div className="flex h-full flex-col items-center gap-4 p-4">
      <div
        ref={stageRef}
        className="flex min-h-0 w-full flex-1 items-center justify-center bg-white dark:bg-slate-950"
      >
        <div className="w-[min(90vw,460px)]">
          {activeCard ? (
            <CardCrossfade cardKey={activeCard.id} durationMs={crossfadeMs}>
              <CardView card={activeCard} style={resolveStyleConfig(activeCard, stylesById)} spin active />
            </CardCrossfade>
          ) : (
            <p className="text-center text-sm text-slate-400">No cards — build a prescription first.</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
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
        <button
          type="button"
          aria-label="Export PNG"
          className={iconBtn}
          disabled={!activeCard}
          onClick={() => {
            if (!activeCard) return;
            const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            void exportCardPng(activeCard, resolveStyleConfig(activeCard, stylesById), { theme });
          }}
        >
          <Download className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
