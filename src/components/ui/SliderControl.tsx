import { useId } from 'react';

export interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

// Range + numeric entry. Editing writes to the parent's local working config
// (cheap); persistence is debounced upstream, so there's no global/IndexedDB
// thrash during a drag (the commit-on-release intent).
export function SliderControl({ label, value, min, max, step = 1, onChange }: SliderControlProps) {
  const id = useId();
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="py-1">
      <label htmlFor={id} className="mb-0.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          aria-label={`${label} value`}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
          className="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-right text-xs dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  );
}
