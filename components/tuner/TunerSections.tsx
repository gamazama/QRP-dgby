
import React from 'react';
import { 
  Maximize2, PenLine, Eye, Hash, Circle, 
  ArrowUpFromLine, AlignJustify, Type, Activity, 
  MoveHorizontal, Sun, RotateCw, Sparkles, Move, Hexagon,
  Globe
} from 'lucide-react';
import SliderControl from '../ui/SliderControl';
import { GeoConfig } from '../../types';

interface SectionProps {
  config: GeoConfig;
  update: (key: keyof GeoConfig, value: any) => void;
}

export const LayoutSection: React.FC<SectionProps> = ({ config, update }) => (
    <div className="space-y-4">
       <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                <input 
                    type="checkbox"
                    checked={config.showFrame}
                    onChange={(e) => update('showFrame', e.target.checked)}
                    className="accent-blue-600 rounded"
                />
                Frame
            </label>
            <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors ${config.showFrame ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>
                <input 
                    type="checkbox"
                    checked={config.frameDoubleTop}
                    onChange={(e) => update('frameDoubleTop', e.target.checked)}
                    disabled={!config.showFrame}
                    className="accent-blue-600 rounded"
                />
                Double Header
            </label>
            <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors ${config.showFrame && config.frameDoubleTop ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>
                <input 
                    type="checkbox"
                    checked={config.frameSquareHeader}
                    onChange={(e) => update('frameSquareHeader', e.target.checked)}
                    disabled={!config.showFrame || !config.frameDoubleTop}
                    className="accent-blue-600 rounded"
                />
                Box
            </label>
       </div>
        
       <div className="grid grid-cols-2 gap-2">
            <SliderControl 
                label="Zoom"
                icon={Maximize2}
                value={config.overallScale}
                min={0.5} max={1.5} step={0.05}
                onChange={(val) => update('overallScale', val)}
            />
            <SliderControl 
                label="Content"
                icon={Circle}
                value={config.mainScale ?? 1.0}
                min={0.5} max={1.5} step={0.05}
                onChange={(val) => update('mainScale', val)}
            />
       </div>

       <div className="grid grid-cols-2 gap-2">
            <SliderControl 
                 label="Frame Size"
                 icon={Maximize2}
                 value={config.frameScale}
                 min={0.5} max={1.2} step={0.05}
                 onChange={(val) => update('frameScale', val)}
            />
             <SliderControl 
                 label="Font Size"
                 icon={Type}
                 value={config.uiFontSize}
                 min={8} max={24} step={1}
                 onChange={(val) => update('uiFontSize', val)}
            />
       </div>

       <SliderControl 
            label="Header Offset"
            icon={ArrowUpFromLine}
            value={config.frameHeaderOffset}
            min={5} max={100} step={1}
            onChange={(val) => update('frameHeaderOffset', val)}
       />
    </div>
);

export const GeometrySection: React.FC<SectionProps> = ({ config, update }) => (
    <div className="space-y-4">
       <div className="grid grid-cols-2 gap-2">
           <SliderControl 
               label="Lobe Count"
               icon={Hash}
               value={config.lobeCount}
               min={3} max={16} step={1}
               onChange={(val) => update('lobeCount', val)}
           />
           <SliderControl 
               label="Lobe Radius"
               icon={Circle}
               value={config.lobeRadius}
               min={20} max={100} step={1}
               onChange={(val) => update('lobeRadius', val)}
           />
       </div>

       <div className="grid grid-cols-2 gap-2">
           <SliderControl 
               label={config.lobeType === 'lotus' ? "Waist Height" : "Valley"}
               icon={Activity}
               value={config.hullValley}
               min={0.5} max={1.5} step={0.01}
               onChange={(val) => update('hullValley', val)}
           />
           <SliderControl 
               label={config.lobeType === 'lotus' ? "Petal Width" : "Coverage"}
               icon={Sun}
               value={config.hullCoverage}
               min={100} max={270} step={5}
               onChange={(val) => update('hullCoverage', val)}
           />
       </div>
       
        <SliderControl 
            label="Rotation"
            icon={RotateCw}
            value={config.geometryRotation || 0}
            min={0} max={360} step={1}
            onChange={(val) => update('geometryRotation', val)}
        />
        
        {/* Extended Control Group for Dharma OR Lotus */}
        {(config.lobeType === 'dharma' || config.lobeType === 'lotus') && (
            <div className={`p-3 rounded-lg space-y-3 mt-2 ${config.lobeType === 'lotus' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${config.lobeType === 'lotus' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {config.lobeType === 'lotus' ? 'Petal Shape' : 'Gate Parameters'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <SliderControl 
                        label={config.lobeType === 'lotus' ? "Petal Bulge" : "Stem Out"}
                        icon={MoveHorizontal}
                        value={config.dharmaExtrusionOut}
                        min={0.0} max={1.0} step={0.05}
                        onChange={(val) => update('dharmaExtrusionOut', val)}
                    />
                    <SliderControl 
                        label={config.lobeType === 'lotus' ? "Base Width" : "Top Width"}
                        icon={MoveHorizontal}
                        value={config.dharmaExtrusionSide}
                        min={0.0} max={1.0} step={0.05}
                        onChange={(val) => update('dharmaExtrusionSide', val)}
                    />
                </div>
                {/* Additional row for Lotus Base Offset & Neck Width */}
                {config.lobeType === 'lotus' && (
                    <div className="grid grid-cols-2 gap-2">
                        <SliderControl 
                            label="Neck Width"
                            icon={Activity}
                            value={config.dharmaStemWidth ?? 0.2}
                            min={0.0} max={1.0} step={0.05}
                            onChange={(val) => update('dharmaStemWidth', val)}
                        />
                        <SliderControl 
                            label="Base Offset"
                            icon={ArrowUpFromLine}
                            value={config.dharmaCapHeight ?? 0.5}
                            min={0.0} max={1.0} step={0.02}
                            onChange={(val) => update('dharmaCapHeight', val)}
                        />
                    </div>
                )}
            </div>
        )}
    </div>
);

export const InnerSection: React.FC<SectionProps> = ({ config, update }) => (
    <div className="space-y-4">
        {/* Lobe Design Selector */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Sparkles size={12} />
                <span>Lobe Pattern</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
                {(['seeds', 'celtic', 'triskelion'] as const).map(design => (
                    <button
                        key={design}
                        onClick={() => update('lobeDesign', design)}
                        className={`py-1.5 px-2 rounded-md text-xs font-medium capitalize transition-all ${
                            (config.lobeDesign || 'seeds') === design
                            ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-200 shadow-sm border border-slate-200 dark:border-slate-500'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700'
                        }`}
                    >
                        {design}
                    </button>
                ))}
            </div>
        </div>

        {/* Center Design Selector */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Hexagon size={12} />
                <span>Center Pattern</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
                {(['seeds', 'celtic', 'triskelion', 'uranus'] as const).map(design => (
                    <button
                        key={design}
                        onClick={() => update('centerDesign', design)}
                        className={`py-1.5 px-1 rounded-md text-[10px] sm:text-xs font-medium capitalize transition-all flex items-center justify-center gap-1 ${
                            (config.centerDesign || 'seeds') === design
                            ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-200 shadow-sm border border-slate-200 dark:border-slate-500'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700'
                        }`}
                        title={design}
                    >
                        {design === 'uranus' ? <Globe size={10} /> : null}
                        <span className="truncate">{design}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Conditional Seeds Controls */}
        {config.lobeDesign === 'seeds' && (
             <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg space-y-3">
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Seed Parameters</p>
                <SliderControl 
                    label="Seed Count"
                    icon={Hash}
                    value={config.petals}
                    min={10} max={250} step={1}
                    onChange={(val) => update('petals', val)}
                />
                <div className="grid grid-cols-2 gap-2">
                    <SliderControl 
                        label="Seed Size"
                        icon={Circle}
                        value={config.petalSize}
                        min={0.5} max={4.0} step={0.1}
                        onChange={(val) => update('petalSize', val)}
                    />
                    <SliderControl 
                        label="Roundness"
                        icon={Circle}
                        value={config.petalRoundness}
                        min={0.1} max={1.0} step={0.05}
                        onChange={(val) => update('petalRoundness', val)}
                    />
                </div>
            </div>
        )}

        {/* Conditional SVG Design Controls */}
        {config.lobeDesign !== 'seeds' && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg space-y-3">
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Pattern Adjustments</p>
                <div className="grid grid-cols-2 gap-2">
                    <SliderControl 
                        label="Pattern Scale"
                        icon={Maximize2}
                        value={config.designScale ?? 1.0}
                        min={0.2} max={3.0} step={0.1}
                        onChange={(val) => update('designScale', val)}
                    />
                    <SliderControl 
                        label="Radial Offset"
                        icon={Move}
                        value={config.designOffset ?? 0}
                        min={-100} max={100} step={1}
                        onChange={(val) => update('designOffset', val)}
                    />
                </div>
            </div>
        )}

        <div className="space-y-3">
             <div className="flex justify-between items-center text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><Hash size={12}/> Sequence Length</span>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-0.5">
                    {[9, 10, 44].map((steps) => (
                            <button 
                            key={steps}
                            onClick={() => update('sequenceLength', steps)}
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${config.sequenceLength === steps ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            {steps}
                        </button>
                    ))}
                </div>
            </div>

            <SliderControl 
                label="Ring Radius"
                icon={Maximize2}
                value={config.ringInnerRadius}
                min={30} max={100} step={1}
                onChange={(val) => update('ringInnerRadius', val)}
            />

            <div className="grid grid-cols-2 gap-2">
                <SliderControl 
                    label="Stripe Gap"
                    icon={AlignJustify}
                    value={config.stripeSep}
                    min={1} max={12} step={0.5}
                    onChange={(val) => update('stripeSep', val)}
                />
                <SliderControl 
                    label="Stripe Start"
                    icon={ArrowUpFromLine}
                    value={config.stripeStart}
                    min={0} max={Math.max(0, config.ringInnerRadius - 10)} step={1}
                    onChange={(val) => update('stripeStart', val)}
                />
            </div>
        </div>
    </div>
);

export const StyleSection: React.FC<SectionProps> = ({ config, update }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
            <SliderControl 
                label="Lobe Opacity"
                icon={Eye}
                value={config.lobeOpacity ?? 0.7}
                min={0.0} max={1.0} step={0.05}
                onChange={(val) => update('lobeOpacity', val)}
            />
            <SliderControl 
                label="Center Opacity"
                icon={Eye}
                value={config.centerOpacity ?? 0.1}
                min={0.0} max={1.0} step={0.05}
                onChange={(val) => update('centerOpacity', val)}
            />
        </div>

        <div className="grid grid-cols-2 gap-2">
            <SliderControl 
                label="Shell Scale"
                icon={Maximize2}
                value={config.shellScale}
                min={0.5} max={1.5} step={0.05}
                onChange={(val) => update('shellScale', val)}
            />
            <SliderControl 
                label="Shell Stroke"
                icon={PenLine}
                value={config.shellStroke}
                min={0.1} max={5.0} step={0.1}
                onChange={(val) => update('shellStroke', val)}
            />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
            <SliderControl 
                label="Ring Stroke"
                icon={PenLine}
                value={config.ringStroke}
                min={0.1} max={5.0} step={0.1}
                onChange={(val) => update('ringStroke', val)}
            />
            <SliderControl 
                label="Stripe Stroke"
                icon={PenLine}
                value={config.stripeStroke}
                min={0.1} max={5.0} step={0.1}
                onChange={(val) => update('stripeStroke', val)}
            />
        </div>
        
         <div className="grid grid-cols-2 gap-2">
            <SliderControl 
                 label="Frame Stroke"
                 icon={PenLine}
                 value={config.frameStrokeWidth}
                 min={0.5} max={5} step={0.1}
                 onChange={(val) => update('frameStrokeWidth', val)}
            />
            <SliderControl 
                 label="Tick Length"
                 icon={MoveHorizontal}
                 value={config.frameTickLength}
                 min={0} max={100} step={1}
                 onChange={(val) => update('frameTickLength', val)}
            />
       </div>
    </div>
);