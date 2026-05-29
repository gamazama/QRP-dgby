import React, { useRef } from 'react';
import { MAX_VALUE_PER_DIVISION } from '../constants';
import { Minus, Plus, RotateCcw, Hash } from 'lucide-react';

interface SequenceEditorProps {
  name: string;
  description?: string;
  sequence: number[];
  onChange: (updates: { data?: number[], name?: string, description?: string }) => void;
  onSetLength?: (length: number) => void;
}

const SequenceEditor: React.FC<SequenceEditorProps> = ({ name, description, sequence, onChange, onSetLength }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleValueChange = (index: number, delta: number) => {
    const newSeq = [...sequence];
    const val = newSeq[index] + delta;
    if (val >= 0 && val <= MAX_VALUE_PER_DIVISION) {
      newSeq[index] = val;
      onChange({ data: newSeq });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      // Direct numeric input handling (Fallback for when onKeyDown doesn't catch it, e.g. Paste or Mobile)
      const valStr = e.target.value;
      if (valStr === '') return; 
      
      const val = parseInt(valStr);
      if (!isNaN(val) && val >= 0 && val <= MAX_VALUE_PER_DIVISION) {
          const newSeq = [...sequence];
          newSeq[index] = val;
          onChange({ data: newSeq });
          
          // Auto advance if valid single digit entered
          if (index < sequence.length - 1) {
              inputRefs.current[index + 1]?.focus();
          }
      }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      // Navigation
      if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (index < sequence.length - 1) {
              inputRefs.current[index + 1]?.focus();
          }
          return;
      }
      if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (index > 0) {
              inputRefs.current[index - 1]?.focus();
          }
          return;
      }
      
      // Handle Backspace (Clear to 0)
      if (e.key === 'Backspace') {
          e.preventDefault();
          const newSeq = [...sequence];
          newSeq[index] = 0;
          onChange({ data: newSeq });
          return;
      }

      // Handle Direct Digit Entry (0-9) via Keyboard
      // This ensures that typing the same number works (overwrites and advances)
      // and bypasses potential onChange limitations with same-value updates.
      if (/^[0-9]$/.test(e.key)) {
          const val = parseInt(e.key);
          if (val <= MAX_VALUE_PER_DIVISION) {
              e.preventDefault(); // Prevent default to avoid double input in onChange
              
              const newSeq = [...sequence];
              newSeq[index] = val;
              onChange({ data: newSeq });

              // Auto-advance
              if (index < sequence.length - 1) {
                  inputRefs.current[index + 1]?.focus();
              }
          }
      }
  };

  const handleReset = () => {
    onChange({ data: new Array(sequence.length).fill(0) });
  };

  // Long sequences (the 44-step preset) are binary on/off, so their cells are
  // rendered as toggles rather than numeric fields.
  const toggleStep = (index: number) => {
    const newSeq = [...sequence];
    newSeq[index] = newSeq[index] ? 0 : 1;
    onChange({ data: newSeq });
  };
  const isBinary = sequence.length > 20;

  // Dynamically determine grid columns based on length to prevent layout breakage
  // For small sequences (9-10), use 5 cols. For large (44), use more to save vertical space.
  const gridClass = sequence.length > 20 
    ? "grid-cols-6 sm:grid-cols-8" 
    : "grid-cols-5";

  return (
    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
      
      {/* Header Editing */}
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex-1 space-y-1">
            <input
                type="text"
                value={name}
                onChange={(e) => onChange({ name: e.target.value })}
                onFocus={(e) => e.target.select()}
                aria-label="Card name"
                className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none transition-colors px-1"
                placeholder="Card Name"
            />
            <input
                type="text"
                value={description || ''}
                onChange={(e) => onChange({ description: e.target.value })}
                onFocus={(e) => e.target.select()}
                aria-label="Card description"
                className="w-full bg-transparent text-xs text-slate-500 dark:text-slate-400 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none transition-colors px-1"
                placeholder="Description"
            />
        </div>
        <button onClick={handleReset} aria-label="Clear sequence data" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pt-1" title="Clear Sequence Data">
            <RotateCcw size={14} />
        </button>
      </div>

      {/* Sequence length — sits with the numbered steps it controls */}
      {onSetLength && (
        <div className="flex justify-between items-center mb-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Hash size={12} /> Steps
                <span className="font-mono text-slate-400 dark:text-slate-500">({sequence.length})</span>
            </span>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-0.5">
                {[7, 9, 10, 12, 44].map((steps) => (
                    <button
                        key={steps}
                        onClick={() => onSetLength(steps)}
                        aria-label={`Set sequence to ${steps} steps`}
                        aria-pressed={sequence.length === steps}
                        className={`px-2 py-0.5 text-[10px] rounded transition-colors ${sequence.length === steps ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                        {steps}
                    </button>
                ))}
            </div>
        </div>
      )}

      {/* Sequence Grid */}
      <div className={`grid ${gridClass} gap-2`}>
        {sequence.map((val, i) => {
          const on = val !== 0;

          // Binary mode: each step is an on/off toggle styled like the numeric
          // cells, so the grid reads the same but flips state on click.
          if (isBinary) {
            return (
              <button
                key={i}
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Step ${i + 1}: ${on ? 'on' : 'off'}`}
                onClick={() => toggleStep(i)}
                className={`flex flex-col items-center rounded-md p-1 border transition-colors touch-manipulation ${
                  on
                    ? 'bg-blue-500 border-blue-500 text-white shadow-sm hover:bg-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span className="text-[10px] font-mono leading-none select-none">{i + 1}</span>
                <span className={`mt-1 w-2.5 h-2.5 rounded-full transition-colors ${on ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`} />
              </button>
            );
          }

          return (
            <div key={i} className="flex flex-col items-center bg-slate-50 dark:bg-slate-800 rounded-md p-1 border border-slate-100 dark:border-slate-700 transition-colors group focus-within:ring-1 focus-within:ring-blue-500">
              {/* Display 1-based index */}
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mb-1 cursor-default select-none">{i + 1}</span>

              <div className="flex items-center gap-0.5 justify-center w-full">
                <button
                  onClick={() => handleValueChange(i, -1)}
                  aria-label={`Decrease step ${i + 1}`}
                  className="w-4 h-4 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 touch-manipulation transition-colors flex-shrink-0"
                  disabled={val <= 0}
                  tabIndex={-1}
                >
                  <Minus size={8} />
                </button>

                <input
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={val}
                  onChange={(e) => handleInputChange(e, i)}
                  onFocus={handleInputFocus}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  aria-label={`Step ${i + 1} value`}
                  className="w-5 text-center font-bold text-slate-800 dark:text-slate-200 text-sm bg-transparent border-none focus:outline-none p-0 cursor-text selection:bg-blue-200 dark:selection:bg-blue-800"
                />

                <button
                  onClick={() => handleValueChange(i, 1)}
                  aria-label={`Increase step ${i + 1}`}
                  className="w-4 h-4 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 touch-manipulation transition-colors flex-shrink-0"
                  disabled={val >= MAX_VALUE_PER_DIVISION}
                  tabIndex={-1}
                >
                  <Plus size={8} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SequenceEditor;