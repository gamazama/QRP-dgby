import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { Card } from '@/domain/card';
import type { Style } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { buildStylesMap, resolveStyleConfig } from '@/features/styles/useStyles';
import { decodeShare, type SharePayload } from '@/features/build/shareLink';
import { useRenderTier } from '@/hooks/useRenderTier';
import { CardView } from '@/render/CardView';
import { CardCrossfade } from '@/render/CardCrossfade';

const cardDuration = (card: Card | undefined, perCardMs: number) =>
  card?.content.kind === 'transition' ? card.content.durationMs : perCardMs;

// Patient playback-only view. Decodes a self-contained share payload from the
// hash, renders the prescription fullscreen on an infinite loop. No editor, no
// app chrome — just the cards. Rendered OUTSIDE AppLayout (its own route).
export function ViewPage() {
  const [params] = useSearchParams();
  const code = params.get('d');
  const theme = params.get('t');

  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const tier = useRenderTier();
  const hideTimer = useRef<number | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Carry the link's theme onto the document.
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else if (theme === 'light') document.documentElement.classList.remove('dark');
  }, [theme]);

  // Decode the payload once.
  useEffect(() => {
    let cancelled = false;
    if (!code) {
      setError('This link has no prescription data.');
      return;
    }
    decodeShare(code)
      .then((p) => !cancelled && setPayload(p))
      .catch((err) => {
        console.error('Share decode failed', err);
        if (!cancelled) setError('This link is invalid or was created by an incompatible version.');
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const stylesById = useMemo<Map<StyleId, Style>>(
    () => buildStylesMap(payload?.styles),
    [payload],
  );
  const cards = payload?.seq.cards ?? [];
  const perCardMs = payload?.seq.timing.perCardMs ?? 1500;
  const crossfadeMs = payload?.seq.timing.crossfadeMs ?? 0;
  const activeCard = cards[idx];

  // Local playback loop (wraps around forever).
  useEffect(() => {
    if (!playing || cards.length === 0) return;
    const t = window.setTimeout(
      () => setIdx((i) => (i + 1) % cards.length),
      Math.max(200, cardDuration(activeCard, perCardMs)),
    );
    return () => window.clearTimeout(t);
  }, [playing, idx, cards.length, activeCard, perCardMs]);

  // Auto-hide the controls a moment after the pointer stops moving.
  const nudgeControls = () => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2500);
  };
  useEffect(() => {
    nudgeControls();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [payload]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-white p-6 text-center dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
      </div>
    );
  }
  if (!payload) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <p className="text-sm text-slate-400">Loading prescription…</p>
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-white dark:bg-slate-950"
      onMouseMove={nudgeControls}
      onClick={() => setPlaying((p) => !p)}
    >
      <div className="absolute inset-3 flex items-center justify-center">
        {activeCard ? (
          <CardCrossfade cardKey={activeCard.id} durationMs={crossfadeMs} className="absolute inset-0">
            <CardView
              card={activeCard}
              style={resolveStyleConfig(activeCard, stylesById)}
              tier={tier}
              spin
              active={playing}
              fill="height"
            />
          </CardCrossfade>
        ) : (
          <p className="text-sm text-slate-400">Empty prescription.</p>
        )}
      </div>

      {/* Minimal patient controls (auto-hide). */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 p-4 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={(e) => {
            e.stopPropagation();
            setPlaying((p) => !p);
          }}
          className="pointer-events-auto rounded-full border border-slate-300 bg-white/90 p-3 shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-900"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        {cards.length > 1 && (
          <span className="pointer-events-none rounded-full bg-white/80 px-3 py-1 text-xs tabular-nums text-slate-500 shadow-sm dark:bg-slate-900/80 dark:text-slate-400">
            {idx + 1} / {cards.length}
          </span>
        )}
      </div>
    </div>
  );
}
