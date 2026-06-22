import type { Style } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { CardSurface } from '@/render/CardSurface';
import { cn } from '@/lib/cn';

const SAMPLE = [0, 1, 0, 3, 0, 1, 0, 2, 0];

export function StylePicker({
  styles,
  currentStyleId,
  onPick,
}: {
  styles: Style[];
  currentStyleId: StyleId;
  onPick: (id: StyleId) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Style
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {styles.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            title={s.name}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md border p-1.5 transition-colors',
              s.id === currentStyleId
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900',
            )}
          >
            <div className="pointer-events-none w-full">
              <CardSurface style={s.config} sequence={SAMPLE} tier="balanced" />
            </div>
            <span className="truncate text-[11px] text-slate-600 dark:text-slate-300">{s.name}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Applies to the selected card(s).</p>
    </div>
  );
}
