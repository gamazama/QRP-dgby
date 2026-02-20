import React from 'react';
import { Play, Pause } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  togglePlay: () => void;
  timingMs: number;
  setTimingMs: (ms: number) => void;
  activeIndex: number;
  sequences: { id: number; }[];
  selectSequence: (index: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  togglePlay,
  timingMs,
  setTimingMs,
  activeIndex,
  sequences,
  selectSequence
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4 transition-colors duration-300">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <button 
                onClick={togglePlay}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 flex-shrink-0 ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
            </button>
            
            <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-1">Sequence Timing</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="range" 
                        min="200" 
                        max="30000" 
                        step="100" 
                        value={timingMs}
                        onChange={(e) => setTimingMs(Number(e.target.value))}
                        className="w-24 sm:w-32 accent-blue-600 dark:accent-blue-500"
                    />
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300 w-12 sm:w-16 text-right">{(timingMs / 1000).toFixed(1)}s</span>
                </div>
            </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-start sm:justify-end overflow-x-auto pb-1 sm:pb-0 scrollbar-hide mask-fade">
            {sequences.map((seq, idx) => (
                <button
                    key={seq.id}
                    onClick={() => selectSequence(idx)}
                    className={`px-3 py-2 min-w-[36px] rounded-lg text-xs font-medium transition-colors border flex-shrink-0 ${
                        activeIndex === idx 
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                >
                    {idx + 1}
                </button>
            ))}
        </div>
    </div>
  );
};

export default PlaybackControls;