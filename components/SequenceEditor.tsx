import React, { useRef } from 'react';
import { MAX_VALUE_PER_DIVISION } from '../constants';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface SequenceEditorProps {
  id: number;
  name: string;
  description?: string;
  sequence: number[];
  onChange: (updates: { data?: number[], name?: string, description?: string }) => void;
}

const SequenceEditor: React.FC<SequenceEditorProps> = ({ id, name, description, sequence, onChange }) => {
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
                className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none transition-colors px-1"
                placeholder="Card Name"
            />
            <input 
                type="text"
                value={description || ''}
                onChange={(e) => onChange({ description: e.target.value })}
                onFocus={(e) => e.target.select()}
                className="w-full bg-transparent text-xs text-slate-500 dark:text-slate-400 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none transition-colors px-1"
                placeholder="Description"
            />
        </div>
        <button onClick={handleReset} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pt-1" title="Clear Sequence Data">
            <RotateCcw size={14} />
        </button>
      </div>
      
      {/* Sequence Grid */}
      <div className={`grid ${gridClass} gap-2`}>
        {sequence.map((val, i) => (
          <div key={i} className="flex flex-col items-center bg-slate-50 dark:bg-slate-800 rounded-md p-1 border border-slate-100 dark:border-slate-700 transition-colors group focus-within:ring-1 focus-within:ring-blue-500">
            {/* Display 1-based index */}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mb-1 cursor-default select-none">{i + 1}</span>
            
            <div className="flex items-center gap-0.5 justify-center w-full">
              {/* Hide buttons on large grids to save space, user likely uses keyboard */}
              {sequence.length <= 20 && (
                  <button 
                    onClick={() => handleValueChange(i, -1)}
                    className="w-4 h-4 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 touch-manipulation transition-colors flex-shrink-0"
                    disabled={val <= 0}
                    tabIndex={-1}
                  >
                    <Minus size={8} />
                  </button>
              )}
              
              <input
                ref={el => { inputRefs.current[i] = el; }}
                type="text" 
                inputMode="numeric"
                pattern="[0-9]*"
                value={val}
                onChange={(e) => handleInputChange(e, i)}
                onFocus={handleInputFocus}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className="w-5 text-center font-bold text-slate-800 dark:text-slate-200 text-sm bg-transparent border-none focus:outline-none p-0 cursor-text selection:bg-blue-200 dark:selection:bg-blue-800"
              />

              {sequence.length <= 20 && (
                  <button 
                    onClick={() => handleValueChange(i, 1)}
                    className="w-4 h-4 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 touch-manipulation transition-colors flex-shrink-0"
                    disabled={val >= MAX_VALUE_PER_DIVISION}
                    tabIndex={-1}
                  >
                    <Plus size={8} />
                  </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SequenceEditor;