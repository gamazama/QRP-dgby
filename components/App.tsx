
import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useSequencer } from '../hooks/useSequencer';
import { compressConfig, decompressConfig } from '../utils/compression';
import { Flower, Anchor, Droplets } from 'lucide-react';
import { SUNFLOWER_PRESET, DHARMA_PRESET, LOTUS_PRESET } from '../constants';
import { GeoConfig } from '../types';

import Header from './Header';
import FullScreenOverlay from './FullScreenOverlay';
import VisualizerStage from './VisualizerStage';
import PlaybackControls from './PlaybackControls';
import GeometryTuner from './GeometryTuner';
import SequenceManager from './SequenceManager';
import ImportModal from './ImportModal';

const App: React.FC = () => {
  // --- Hooks & State ---
  const { isDarkMode, toggleTheme, setDarkMode } = useTheme();
  
  const sequencer = useSequencer();
  
  const [showEditor, setShowEditor] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Initialize View State from URL to prevent flash
  const [isFullScreen, setIsFullScreen] = useState(() => {
     if (typeof window !== 'undefined') {
         return new URLSearchParams(window.location.search).has('c');
     }
     return false;
  });

  const [isViewOnly, setIsViewOnly] = useState(() => {
     if (typeof window !== 'undefined') {
         return new URLSearchParams(window.location.search).has('c');
     }
     return false;
  });
  
  // URL Loading Logic
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      
      // Theme Check
      const themeParam = params.get('t');
      if (themeParam) {
          setDarkMode(themeParam === 'dark');
      }

      // Config Check
      const configParam = params.get('c');
      if (configParam) {
          const loaded = decompressConfig(configParam);
          if (loaded) {
              // Load sequences (which now contain their own geoConfig)
              sequencer.loadSequences(loaded.sequences);
              
              // Load Timing
              if (loaded.timingMs) {
                  sequencer.setTimingMs(loaded.timingMs);
              }
              
              // Ensure View State is synced (redundant but safe)
              setIsViewOnly(true);
              setShowEditor(false);
              setIsFullScreen(true);
              
              // Auto Play
              setTimeout(() => {
                  sequencer.setPlaying(true);
              }, 500);
          }
      } 
  }, []); // Run once on mount

  // Helper to get active config
  const activeGeoConfig = sequencer.activeSequence.geoConfig;

  const handleGeoConfigChange = (newConfig: GeoConfig) => {
    const activeId = sequencer.activeSequence.id;
    
    // Check if length changed, if so resize data
    if (newConfig.sequenceLength !== activeGeoConfig.sequenceLength) {
        sequencer.resizeSequence(activeId, newConfig.sequenceLength);
    }
    
    // Update config for active sequence
    sequencer.updateSequence(activeId, { geoConfig: newConfig });
  };

  const applyPreset = (preset: GeoConfig) => {
      // Apply preset to active sequence
      handleGeoConfigChange({ ...activeGeoConfig, ...preset });
  };

  const handleShareUrl = () => {
      // Version 3: Pass timingMs
      const encoded = compressConfig(activeGeoConfig, sequencer.sequences, sequencer.timingMs);
      const themeParam = isDarkMode ? '&t=dark' : '&t=light';
      const url = `${window.location.origin}${window.location.pathname}?c=${encoded}${themeParam}`;
      
      navigator.clipboard.writeText(url).then(() => {
          alert("Share URL copied to clipboard!");
      }).catch(err => {
          console.error("Failed to copy", err);
          alert("Failed to copy URL. Please try again.");
      });
  };
  
  const handleSaveConfig = () => {
      const configData = {
          sequences: sequencer.sequences,
          timingMs: sequencer.timingMs
      };
      const jsonString = JSON.stringify(configData, null, 2);
      
      try {
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'qrp_config.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (err) {
          console.error("Failed to save", err);
          alert("Failed to save configuration.");
      }
  };

  const handleImportInput = (input: string) => {
      try {
          // 1. Try JSON parsing first
          if (input.trim().startsWith('{')) {
             try {
                 const data = JSON.parse(input);
                 // Support V2/V3 import (sequences have geoConfig)
                 if (data.sequences) {
                     // If importing a single card (sequences array of 1), we might want to append?
                     // For now, load replaces all, per previous behavior. 
                     // TODO: In future, consider merge strategy.
                     sequencer.loadSequences(data.sequences);
                     if (data.timingMs) sequencer.setTimingMs(data.timingMs);
                     setIsViewOnly(false); 
                     return;
                 }
                 // Support legacy JSON import if needed (though structure changed)
             } catch (e) {
                 // Not valid JSON, fall through to URL
             }
          }
          
          // 2. Try URL parsing
          let urlObj;
          try {
             urlObj = new URL(input);
          } catch(e) {
             // If relative path or partial
             if (input.includes('c=')) {
                 urlObj = new URL(window.location.origin + (input.startsWith('/') ? '' : '/') + input);
             }
          }

          if (urlObj) {
              const params = new URLSearchParams(urlObj.search);
              
              // Check for theme in import
              const themeParam = params.get('t');
              if (themeParam) {
                  setDarkMode(themeParam === 'dark');
              }

              const configParam = params.get('c');
              
              if (configParam) {
                  const loaded = decompressConfig(configParam);
                  if (loaded) {
                      sequencer.loadSequences(loaded.sequences);
                      if (loaded.timingMs) sequencer.setTimingMs(loaded.timingMs);
                      setIsViewOnly(false);
                  } else {
                      alert("Invalid configuration data found in URL.");
                  }
              } else {
                  alert("No configuration parameter found in the URL.");
              }
          } else {
              throw new Error("Invalid Input");
          }
      } catch (e) {
          alert("Invalid input format. Please paste a valid URL or JSON configuration object.");
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-100 dark:selection:bg-blue-900 transition-colors duration-300">
      
      <Header 
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        toggleFullScreen={() => setIsFullScreen(true)}
        toggleEditor={() => setShowEditor(!showEditor)}
        showEditor={showEditor}
        onShare={handleShareUrl}
        onSave={handleSaveConfig}
        onImport={() => setShowImportModal(true)}
        isViewOnly={isViewOnly}
      />

      {isFullScreen && (
          <FullScreenOverlay 
             onClose={() => setIsFullScreen(false)}
             sequence={sequencer.activeSequence.data}
             sequenceName={sequencer.activeSequence.name}
             sequenceDesc={sequencer.activeSequence.description}
             isPlaying={sequencer.isPlaying}
             geoConfig={activeGeoConfig}
             isViewOnly={isViewOnly}
          />
      )}

      {showImportModal && (
          <ImportModal 
             onClose={() => setShowImportModal(false)}
             onImport={handleImportInput}
          />
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-10 flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* Left Column: Visualizer & Controls */}
        <div className={`flex-1 flex flex-col gap-6 order-1 lg:order-none ${isViewOnly ? 'mx-auto max-w-3xl' : ''}`}>
            <VisualizerStage 
                sequence={sequencer.activeSequence.data}
                name={sequencer.activeSequence.name}
                description={sequencer.activeSequence.description}
                isPlaying={sequencer.isPlaying}
                geoConfig={activeGeoConfig}
                onEnterFullScreen={() => setIsFullScreen(true)}
            />

            <PlaybackControls 
                isPlaying={sequencer.isPlaying}
                togglePlay={sequencer.togglePlay}
                timingMs={sequencer.timingMs}
                setTimingMs={sequencer.setTimingMs}
                activeIndex={sequencer.activeIndex}
                sequences={sequencer.sequences}
                selectSequence={sequencer.selectSequence}
            />
        </div>

        {/* Right Column: Editor & Tuner (Hidden in View Only Mode) */}
        {!isViewOnly && showEditor && (
            <div className="lg:w-[400px] flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300 order-2 lg:order-none">
                
                <GeometryTuner 
                    config={activeGeoConfig}
                    onChange={handleGeoConfigChange}
                />
                
                {/* Mode Switcher - Updates Active Sequence Config */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => applyPreset(SUNFLOWER_PRESET)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors ${
                            activeGeoConfig.lobeType === 'sunflower'
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        <Flower size={16} /> Sunflower
                    </button>
                    <button
                        onClick={() => applyPreset(LOTUS_PRESET)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors ${
                            activeGeoConfig.lobeType === 'lotus'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        <Droplets size={16} /> Lotus
                    </button>
                    <button
                        onClick={() => applyPreset(DHARMA_PRESET)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors ${
                            activeGeoConfig.lobeType === 'dharma'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                        <Anchor size={16} /> Dharma
                    </button>
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                <SequenceManager 
                    sequences={sequencer.sequences}
                    activeId={sequencer.activeSequence.id}
                    isPlaying={sequencer.isPlaying}
                    timingMs={sequencer.timingMs}
                    onUpdate={sequencer.updateSequence}
                    onReset={sequencer.resetSequences}
                    onAdd={sequencer.addSequence}
                    onDuplicate={sequencer.duplicateSequence}
                    onDelete={sequencer.deleteSequence}
                    onSelect={sequencer.selectSequence}
                    onReorder={sequencer.reorderSequences}
                    isDarkMode={isDarkMode}
                    onImportSequence={sequencer.importSequence}
                />
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
