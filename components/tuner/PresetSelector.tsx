import React from 'react';
import { Flower, Anchor, Droplets } from 'lucide-react';
import { GeoConfig } from '../../types';
import { SUNFLOWER_PRESET, DHARMA_PRESET, LOTUS_PRESET } from '../../constants';

interface PresetSelectorProps {
  currentType: 'sunflower' | 'lotus' | 'dharma';
  onSelect: (preset: GeoConfig) => void;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({ currentType, onSelect }) => {
  
  const presets = [
    { id: 'sunflower', label: 'Sunflower', icon: Flower, preset: SUNFLOWER_PRESET, color: 'amber' },
    { id: 'lotus', label: 'Lotus', icon: Droplets, preset: LOTUS_PRESET, color: 'emerald' },
    { id: 'dharma', label: 'Dharma', icon: Anchor, preset: DHARMA_PRESET, color: 'blue' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {presets.map((item) => {
        const isActive = currentType === item.id;
        const Icon = item.icon;
        
        let activeClass = "";
        if (isActive) {
            if (item.color === 'amber') activeClass = "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 shadow-sm";
            if (item.color === 'emerald') activeClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-sm";
            if (item.color === 'blue') activeClass = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-sm";
        } else {
            activeClass = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300";
        }

        return (
            <button
                key={item.id}
                onClick={() => onSelect(item.preset)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all duration-200 ${activeClass}`}
            >
                <Icon size={18} />
                <span>{item.label}</span>
            </button>
        );
      })}
    </div>
  );
};

export default PresetSelector;