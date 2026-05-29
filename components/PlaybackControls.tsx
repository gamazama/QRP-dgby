import React from 'react';
import { Play, Pause } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  togglePlay: () => void;
  activeIndex: number;
  sequences: { id: number; }[];
  selectSequence: (index: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  togglePlay,
  activeIndex,
  sequences,
  selectSequence
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4 transition-colors duration-300">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause playback" : "Play sequence"}
                title={isPlaying ? "Pause" : "Play"}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 flex-shrink-0 ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
            </button>

            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                {isPlaying ? 'Playing' : 'Paused'}
            </span>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-start sm:justify-end overflow-x-auto pb-1 sm:pb-0 scrollbar-hide mask-fade">
            {sequences.map((seq, idx) => (
                <button
                    key={seq.id}
                    onClick={() => selectSequence(idx)}
                    aria-label={`Show card ${idx + 1}`}
                    aria-current={activeIndex === idx}
                    className={`px-3 py-2 min-w-[44px] sm:min-w-[36px] rounded-lg text-xs font-medium transition-all active:scale-95 border flex-shrink-0 ${
                        activeIndex === idx
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
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