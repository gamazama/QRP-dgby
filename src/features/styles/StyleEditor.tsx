import type { StyleConfig } from '@/domain/style';
import { SliderControl } from '@/components/ui/SliderControl';
import { SelectControl, Toggle } from '@/components/ui/controls';
import { STYLE_SCHEMA } from './styleSchema';

// Generic, schema-driven geometry editor. The demoted tuner: used to author a
// Style, not as the app's main surface.
export function StyleEditor({
  config,
  onChange,
  disabled = false,
}: {
  config: StyleConfig;
  onChange: (config: StyleConfig) => void;
  disabled?: boolean;
}) {
  const update = (key: keyof StyleConfig, value: number | boolean | string) =>
    onChange({ ...config, [key]: value } as StyleConfig);

  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : undefined} aria-disabled={disabled}>
      <div className="space-y-2">
        {STYLE_SCHEMA.map((group) => (
          <details key={group.title} open className="rounded-md border border-slate-200 dark:border-slate-800">
            <summary className="cursor-pointer px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {group.title}
            </summary>
            <div className="px-2 pb-2">
              {group.fields.map((f) => {
                if (f.kind === 'toggle') {
                  return <Toggle key={f.key} label={f.label} checked={config[f.key] as boolean} onChange={(v) => update(f.key, v)} />;
                }
                if (f.kind === 'select') {
                  return (
                    <SelectControl
                      key={f.key}
                      label={f.label}
                      value={config[f.key] as string}
                      options={f.options}
                      onChange={(v) => update(f.key, v)}
                    />
                  );
                }
                return (
                  <SliderControl
                    key={f.key}
                    label={f.label}
                    value={config[f.key] as number}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    onChange={(v) => update(f.key, v)}
                  />
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
