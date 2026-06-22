import { CardSurface } from '@/render/CardSurface';
import { BUILTIN_STYLE_PRESETS } from '@/engine/presets';

// Phase 1 harness: render the three built-in styles so fidelity is visible.
// Replaced by the full Style Library in Phase 5.
const SAMPLE_RATE = [0, 1, 0, 3, 0, 1, 0, 2, 0, 0];

export function StylesPage() {
  return (
    <section className="p-6">
      <h1 className="text-lg font-semibold">Styles</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Built-in styles (Phase 1 preview — the full Style Library lands in Phase 5).
      </p>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {BUILTIN_STYLE_PRESETS.map((p) => (
          <figure key={p.id} className="flex flex-col items-center gap-3">
            <div className="w-full max-w-xs">
              <CardSurface style={p.config} sequence={SAMPLE_RATE} title={p.name} description="Preview" spin />
            </div>
            <figcaption className="text-sm text-slate-600 dark:text-slate-300">{p.name}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
