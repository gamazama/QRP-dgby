import { useMemo } from 'react';
import { Play, Square } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buildTonePlan, formatHz } from './toneMath';
import { useSequenceTone } from './useSequenceTone';

/**
 * Prototype tone control for a base-9 rate card: a play/stop button plus a
 * readout of the exact frequencies the sequence maps to (base + per-note Hz, to
 * ~4 dp), so the practitioner can verify the pitch against the dial positions.
 */
export function SequenceTonePanel({ sequence, base }: { sequence: number[]; base: number }) {
  const { playing, toggle, supported } = useSequenceTone(sequence, base);
  const plan = useMemo(() => buildTonePlan(sequence), [sequence]);
  const hasRate = plan.notes.some((n) => !n.rest);
  const disabled = !supported || !hasRate;

  const title = !supported
    ? 'Tone playback is tuned for base-9 sequences'
    : !hasRate
      ? 'Enter a rate to play'
      : playing
        ? 'Stop'
        : 'Play this sequence as a meditative tone';

  return (
    <div className="space-y-1.5 border-t border-slate-200/70 pt-2 dark:border-slate-700/60">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          title={title}
          aria-label={playing ? 'Stop tone' : 'Play sequence as tone'}
          aria-pressed={playing}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            playing
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900',
          )}
        >
          {playing ? (
            <Square className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          {playing ? 'Stop tone' : 'Play tone'}
        </button>
        {supported && (
          <span
            className="text-[11px] text-slate-500 dark:text-slate-400"
            title={`Sub-octave ${formatHz(plan.sub)} Hz`}
          >
            Base <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{formatHz(plan.base)}</span> Hz
          </span>
        )}
      </div>

      {supported ? (
        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 font-mono text-[10px] text-slate-400">
          {plan.notes.map((note, i) => (
            <span
              key={i}
              title={note.rest ? 'Rest (dial 0)' : `Dial ${note.value} → ${formatHz(note.freq)} Hz`}
              className={cn(
                'rounded px-1 tabular-nums',
                playing && 'bg-indigo-50/60 dark:bg-indigo-950/30',
                note.rest && 'italic text-slate-300 dark:text-slate-600',
              )}
            >
              {note.rest ? 'rest' : formatHz(note.freq)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400">Tone playback is tuned for base-9 sequences.</p>
      )}
    </div>
  );
}
