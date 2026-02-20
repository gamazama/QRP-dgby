
import React, { useRef, useState, useEffect } from 'react';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  className?: string;
  icon?: React.ElementType;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  className = '',
  icon: Icon
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const commitValue = () => {
    let num = parseFloat(inputValue);
    if (isNaN(num)) num = value;
    num = Math.min(Math.max(num, min), max);
    
    // Precision handling based on step
    const stepStr = step.toString();
    const basePrecision = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;
    num = parseFloat(num.toFixed(Math.max(basePrecision, 2)));
    
    setInputValue(num.toString());
    onChange(num);
    setIsEditing(false);
  };

  const handleBlur = () => {
    commitValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') inputRef.current?.blur();
    if (e.key === 'Escape') {
        setInputValue(value.toString());
        setIsEditing(false);
        setTimeout(() => displayRef.current?.focus(), 0);
    }
  };
  
  const handleInputMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return; 
    e.preventDefault();
    const startX = e.clientX;
    const startValue = value;
    let hasMoved = false;

    const fineStep = step / 10;
    const stepStr = step.toString();
    const basePrecision = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;
    const finePrecision = basePrecision + 1;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (Math.abs(deltaX) > 3) {
          hasMoved = true;
          document.body.style.cursor = 'ew-resize';
      }
      if (hasMoved) {
        const steps = deltaX / 5; 
        let newValue = startValue + (steps * fineStep);
        newValue = Math.max(min, Math.min(max, newValue));
        newValue = parseFloat(newValue.toFixed(finePrecision));
        onChange(newValue);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      if (!hasMoved) {
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else {
        displayRef.current?.focus();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 overflow-hidden">
        {Icon && <Icon size={12} className="flex-shrink-0 opacity-70" />}
        <label className="truncate pr-1 cursor-help" title={label}>{label}</label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 min-w-0 accent-slate-800 dark:accent-slate-400 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
          tabIndex={-1}
        />
        <div className="relative w-10 flex-shrink-0">
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="number"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    step={step / 10}
                    className="w-full bg-white dark:bg-slate-700 border border-blue-500 rounded px-1 py-0.5 text-center text-[10px] font-mono text-slate-900 dark:text-white focus:outline-none leading-tight"
                />
            ) : (
                <div 
                    ref={displayRef}
                    tabIndex={0}
                    onMouseDown={handleInputMouseDown}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:outline-none rounded px-1 py-0.5 text-center text-[10px] font-mono text-slate-700 dark:text-slate-300 cursor-ew-resize select-none transition-colors leading-tight truncate"
                >
                    {value}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SliderControl;