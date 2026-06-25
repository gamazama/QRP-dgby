import { useEffect, useState } from 'react';
import { Download, Film, X } from 'lucide-react';
import type { Card } from '@/domain/card';
import type { Sequence } from '@/domain/sequence';
import type { Style } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { resolveStyleConfig } from '@/features/styles/useStyles';
import { useToast } from '@/components/ui/toastContext';
import { exportCardPng } from '@/render/exportPng';
import { downloadBlob, exportSequenceVideo } from '@/render/exportVideo';
import { cn } from '@/lib/cn';

const currentTheme = (): 'light' | 'dark' =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

const btn =
  'flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-900';

const RESOLUTIONS = [
  { value: 720, label: '720p · web' },
  { value: 1000, label: '1000p · standard' },
  { value: 1440, label: '1440p · hi-res' },
] as const;

function fmtClock(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ExportControls({
  activeCard,
  sequence,
  stylesById,
}: {
  activeCard?: Card | undefined;
  sequence: Sequence;
  stylesById: Map<StyleId, Style>;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(currentTheme);
  const [size, setSize] = useState<number>(1000);
  const [loops, setLoops] = useState(1);
  const [includeTone, setIncludeTone] = useState(true);
  const toast = useToast();

  const exporting = progress !== null;
  const hasCards = sequence.cards.length > 0;
  const hasTonalCard = sequence.cards.some(
    (c) => (c.content.kind === 'remedy' || c.content.kind === 'data') && c.content.base === 9,
  );

  // Sync theme default to current app theme each time the dialog opens.
  useEffect(() => {
    if (dialogOpen) setTheme(currentTheme());
  }, [dialogOpen]);

  // Esc closes the dialog (unless mid-export).
  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !exporting) setDialogOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen, exporting]);

  const onPng = async () => {
    if (!activeCard) return;
    try {
      await exportCardPng(activeCard, resolveStyleConfig(activeCard, stylesById), { theme: currentTheme() });
      toast.show('PNG exported', 'success');
    } catch (err) {
      console.error('PNG export failed', err);
      toast.show('PNG export failed', 'error');
    }
  };

  const onMp4 = async () => {
    if (!hasCards || exporting) return;
    setProgress(0);
    try {
      const blob = await exportSequenceVideo(sequence, stylesById, {
        theme,
        size,
        loops,
        includeTone: includeTone && hasTonalCard,
        onProgress: setProgress,
      });
      downloadBlob(blob, `${sequence.name || 'prescription'}.mp4`);
      toast.show('MP4 exported', 'success');
      setDialogOpen(false);
    } catch (err) {
      console.error('MP4 export failed', err);
      toast.show('MP4 export failed', 'error');
    } finally {
      setProgress(null);
    }
  };

  const oneLoopMs = sequence.cards.reduce(
    (sum, c) => sum + (c.content.kind === 'transition' ? c.content.durationMs : sequence.timing.perCardMs),
    0,
  );
  const totalMs = oneLoopMs * loops;
  const totalFrames = Math.round((totalMs / 1000) * 30);

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => void onPng()} disabled={!activeCard} title="Export the current card as PNG">
        <Download className="h-3.5 w-3.5" /> PNG
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => setDialogOpen(true)}
        disabled={!hasCards}
        title="Export the whole sequence as MP4"
      >
        <Film className="h-3.5 w-3.5" /> MP4
      </button>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => !exporting && setDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Export MP4 options"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <Film className="h-4 w-4" /> Export MP4
              </h2>
              <button
                type="button"
                aria-label="Close"
                disabled={exporting}
                onClick={() => setDialogOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Background</p>
                <div className="flex gap-2">
                  {(['light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={exporting}
                      onClick={() => setTheme(t)}
                      className={cn(
                        'flex-1 rounded-md border px-3 py-1.5 text-xs capitalize transition-colors disabled:opacity-50',
                        theme === t
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Resolution</label>
                <select
                  value={size}
                  disabled={exporting}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
                >
                  {RESOLUTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Loops</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={loops}
                  disabled={exporting}
                  onChange={(e) => setLoops(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  {sequence.cards.length} card{sequence.cards.length === 1 ? '' : 's'} · ≈ {fmtClock(totalMs)} · {totalFrames} frames
                </p>
              </div>

              <div>
                <label
                  className={cn(
                    'flex items-center gap-2 text-xs',
                    !hasTonalCard && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={includeTone && hasTonalCard}
                    disabled={exporting || !hasTonalCard}
                    onChange={(e) => setIncludeTone(e.target.checked)}
                  />
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Include sequence tone
                  </span>
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  {hasTonalCard
                    ? 'Bakes the base-9 cards’ meditative tone into the MP4 audio track.'
                    : 'No base-9 cards in this prescription to sound.'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={exporting}
                onClick={() => setDialogOpen(false)}
                className="rounded-md px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onMp4()}
                disabled={exporting || !hasCards}
                className="flex min-w-28 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {exporting ? (
                  <>Rendering… {Math.round((progress ?? 0) * 100)}%</>
                ) : (
                  <>
                    <Film className="h-3.5 w-3.5" /> Export
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
