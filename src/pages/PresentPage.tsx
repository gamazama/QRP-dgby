import { useState, useRef } from 'react';
import { Maximize, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useSequencerStore } from '@/store/sequencerStore';
import { usePlaybackClock } from '@/hooks/usePlaybackClock';
import { useRenderTier } from '@/hooks/useRenderTier';
import { usePresentationTone } from '@/audio/usePresentationTone';
import { isToneSupported } from '@/audio/SequenceTonePlayer';
import { buildStylesMap, resolveStyleConfig, useStyles } from '@/features/styles/useStyles';
import { ExportControls } from '@/features/export/ExportControls';
import { CardView } from '@/render/CardView';
import { CardCrossfade } from '@/render/CardCrossfade';
import { cn } from '@/lib/cn';

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

  // Optional sequence-tone playback that follows the presented card.
  const [toneOn, setToneOn] = useState(false);
  usePresentationTone(toneOn);
  const hasTonalCard = cards.some(
    (c) => (c.content.kind === 'remedy' || c.content.kind === 'data') && c.content.base === 9,
  );
  const canTone = isToneSupported() && hasTonalCard;

  const stageRef = useRef<HTMLDivElement>(null);
  const store = useSequencerStore.getState;
  const tier = useRenderTier();
  const iconBtn =
    'rounded-md border border-slate-300 p-2 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-900';

  return (
    <div className="flex h-full flex-col items-center gap-4 p-4">
      <div
        ref={stageRef}
        className="relative flex min-h-0 w-full flex-1 items-center justify-center bg-white p-2 dark:bg-slate-950"
      >
        {activeCard ? (
          <CardCrossfade cardKey={activeCard.id} durationMs={crossfadeMs} className="absolute inset-2">
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
          aria-label={toneOn ? 'Mute sequence tone' : 'Play sequence tone'}
          aria-pressed={toneOn}
          title={
            !canTone
              ? 'No base-9 cards to sound'
              : toneOn
                ? 'Mute the sequence tone'
                : 'Sound each base-9 card as it is presented'
          }
          disabled={!canTone}
          className={cn(
            iconBtn,
            toneOn &&
              'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300',
          )}
          onClick={() => setToneOn((v) => !v)}
        >
          {toneOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
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
