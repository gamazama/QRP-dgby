import { useState } from 'react';
import { Download, Film } from 'lucide-react';
import type { Card } from '@/domain/card';
import type { Sequence } from '@/domain/sequence';
import type { Style } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { resolveStyleConfig } from '@/features/styles/useStyles';
import { exportCardPng } from '@/render/exportPng';
import { downloadBlob, exportSequenceVideo } from '@/render/exportVideo';

const currentTheme = (): 'light' | 'dark' =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

const btn =
  'flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-900';

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

  const onPng = () => {
    if (!activeCard) return;
    void exportCardPng(activeCard, resolveStyleConfig(activeCard, stylesById), { theme: currentTheme() });
  };

  const onMp4 = async () => {
    if (sequence.cards.length === 0 || progress !== null) return;
    setProgress(0);
    try {
      const blob = await exportSequenceVideo(sequence, stylesById, {
        theme: currentTheme(),
        onProgress: setProgress,
      });
      downloadBlob(blob, `${sequence.name || 'prescription'}.mp4`);
    } catch (err) {
      console.error('MP4 export failed', err);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={onPng} disabled={!activeCard} title="Export the current card as PNG">
        <Download className="h-3.5 w-3.5" /> PNG
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => void onMp4()}
        disabled={sequence.cards.length === 0 || progress !== null}
        title="Export the whole sequence as MP4"
      >
        <Film className="h-3.5 w-3.5" />
        {progress !== null ? `MP4 ${Math.round(progress * 100)}%` : 'MP4'}
      </button>
    </div>
  );
}
