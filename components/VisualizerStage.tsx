import React from 'react';
import QRPGenerator from './QRPGenerator';
import { Maximize } from 'lucide-react';
import { GeoConfig } from '../types';

interface VisualizerStageProps {
  sequence: number[];
  name: string;
  description?: string;
  isPlaying: boolean;
  geoConfig: GeoConfig;
  onEnterFullScreen: () => void;
}

const VisualizerStage: React.FC<VisualizerStageProps> = ({ 
  sequence, 
  name, 
  description,
  isPlaying, 
  geoConfig, 
  onEnterFullScreen 
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-4 sm:p-8 flex flex-col items-center justify-center min-h-[400px] lg:min-h-[500px] relative overflow-hidden group transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50/50 dark:from-blue-900/10 to-transparent pointer-events-none" />
        
        {/* Expand Button */}
        <button 
            onClick={onEnterFullScreen}
            className="absolute top-4 right-4 p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 shadow-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hidden md:flex items-center justify-center z-10 hover:scale-110 hover:shadow-md"
            title="Enter Full Screen"
        >
            <Maximize size={24} />
        </button>

        {/* Status Indicator */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {isPlaying ? 'Running' : 'Standby'}
            </span>
        </div>

        {/* The Shape */}
        <div className="relative z-0 transform transition-transform duration-700 ease-out w-full flex justify-center">
            <QRPGenerator 
                sequence={sequence} 
                size={420}
                active={isPlaying}
                showLabels={false}
                title={name}
                description={description}
                {...geoConfig}
            />
        </div>
        
        {/* Only show title below if frame is NOT showing it */}
        {(!geoConfig.showFrame || !geoConfig.frameDoubleTop) && (
            <div className="mt-8 text-center">
                <h2 className="text-xl sm:text-2xl font-light text-slate-800 dark:text-slate-200 mb-1">{name}</h2>
                <p className="font-mono text-xs sm:text-sm text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full inline-block">
                    [{sequence.join(', ')}]
                </p>
            </div>
        )}
    </div>
  );
};

export default VisualizerStage;