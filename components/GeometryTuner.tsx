
import React, { useState } from 'react';
import { Sliders, Layout, Hexagon, Component, Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { GeoConfig } from '../types';
import PresetSelector from './tuner/PresetSelector';
import { AccordionItem } from './ui/Accordion';
import { LayoutSection, GeometrySection, InnerSection, StyleSection } from './tuner/TunerSections';

interface GeometryTunerProps {
  config: GeoConfig;
  onChange: (newConfig: GeoConfig) => void;
}

const GeometryTuner: React.FC<GeometryTunerProps> = ({ config, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to update specific key
  const updateConfig = (key: keyof GeoConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };
  
  // Helper for bulk update (Presets)
  const applyPreset = (preset: GeoConfig) => {
      onChange({ ...config, ...preset });
  };

  return (
    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 flex flex-col max-h-[80vh]">
       {/* Tuner Header */}
       <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex-shrink-0 flex items-center justify-between p-4 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
       >
           <div className="flex items-center gap-2">
              <Sliders size={18} className="text-blue-500" />
              <h2 className="font-semibold">Geometry Tuning</h2>
           </div>
           {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
       </button>
       
       {isExpanded && (
           <div className="flex-1 overflow-y-auto p-3 pt-0 custom-scrollbar animate-in slide-in-from-top-2 duration-200">
              
              <PresetSelector currentType={config.lobeType} onSelect={applyPreset} />
              
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
                  <AccordionItem title="Layout & Frame" icon={Layout} defaultOpen={false}>
                      <LayoutSection config={config} update={updateConfig} />
                  </AccordionItem>
                  
                  <AccordionItem title="Hull Geometry" icon={Hexagon} defaultOpen={true}>
                      <GeometrySection config={config} update={updateConfig} />
                  </AccordionItem>

                  <AccordionItem title="Inner Pattern" icon={Component} defaultOpen={false}>
                      <InnerSection config={config} update={updateConfig} />
                  </AccordionItem>

                  <AccordionItem title="Style & Stroke" icon={Palette} defaultOpen={false}>
                      <StyleSection config={config} update={updateConfig} />
                  </AccordionItem>
              </div>

           </div>
       )}
    </div>
  );
};

export default GeometryTuner;
