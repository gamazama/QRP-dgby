import React, { useState, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { useSequencer } from './hooks/useSequencer';
import { compressConfig, decompressConfig } from './utils/compression';
import { GeoConfig } from './types';
import { useToast } from './components/ui/Toast';

import Header from './components/Header';
import FullScreenOverlay from './components/FullScreenOverlay';
import VisualizerStage from './components/VisualizerStage';
import PlaybackControls from './components/PlaybackControls';
import GeometryTuner from './components/GeometryTuner';
import SequenceManager from './components/SequenceManager';
import ImportModal from './components/ImportModal';

const App: React.FC = () => {
  // --- Hooks & State ---
  const { isDarkMode, toggleTheme, setDarkMode } = useTheme();
  const { showToast } = useToast();

  const sequencer = useSequencer();

  // Destructive actions get an inline Undo instead of being irreversible.
  const handleDeleteSequence = (id: number) => {
      sequencer.deleteSequence(id);
      showToast('Card deleted', { type: 'info', action: { label: 'Undo', onClick: sequencer.undo } });
  };
  const handleResetSequences = () => {
      sequencer.resetSequences();
      showToast('All cards reset to defaults', { type: 'info', action: { label: 'Undo', onClick: sequencer.undo } });
  };
  
  // Open the editor by default on a normal landing so the build/tune workflow
  // is immediately visible; stay collapsed when arriving via a shared ?c= link
  // (the mount effect also enforces this for ?c= loads).
  const [showEditor, setShowEditor] = useState(() => {
     if (typeof window !== 'undefined') {
         return !new URLSearchParams(window.location.search).has('c');
     }
     return true;
  });
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

  const handleShareUrl = () => {
      const encoded = compressConfig(activeGeoConfig, sequencer.sequences, sequencer.timingMs);
      const themeParam = isDarkMode ? '&t=dark' : '&t=light';
      const url = `${window.location.origin}${window.location.pathname}?c=${encoded}${themeParam}`;
      
      navigator.clipboard.writeText(url).then(() => {
          showToast('Share link copied to clipboard', { type: 'success' });
      }).catch(err => {
          console.error("Failed to copy", err);
          showToast('Could not copy the link — try again', { type: 'error' });
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
          showToast('Saved qrp_config.json', { type: 'success' });
      } catch (err) {
          console.error("Failed to save", err);
          showToast('Could not save the configuration', { type: 'error' });
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
                     // Loading a config replaces the current deck.
                     sequencer.loadSequences(data.sequences);
                     if (data.timingMs) sequencer.setTimingMs(data.timingMs);
                     setIsViewOnly(false);
                     showToast(`Loaded ${data.sequences.length} card${data.sequences.length === 1 ? '' : 's'}`, { type: 'success' });
                     return;
                 }
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
                      showToast(`Loaded ${loaded.sequences.length} card${loaded.sequences.length === 1 ? '' : 's'}`, { type: 'success' });
                  } else {
                      showToast('That URL has invalid configuration data', { type: 'error' });
                  }
              } else {
                  showToast('No configuration found in that URL', { type: 'error' });
              }
          } else {
              throw new Error("Invalid Input");
          }
      } catch (e) {
          showToast('Unrecognized input — paste a QRP link or JSON config', { type: 'error' });
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
             imageSrc={sequencer.activeSequence.imageSrc}
             imageSrcDark={sequencer.activeSequence.imageSrcDark}
             imageInvert={sequencer.activeSequence.imageInvert}
             imageFrame={sequencer.activeSequence.imageFrame}
          />
      )}

      {showImportModal && (
          <ImportModal 
             onClose={() => setShowImportModal(false)}
             onImport={handleImportInput}
          />
      )}

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-10 flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8 lg:min-h-[calc(100vh-var(--header-h))]">

        {/* Left Column: Visualizer & Controls.
            On lg+ it stays pinned (sticky) as a fixed reference while the right
            editor column scrolls; the max-h + overflow guard short screens. */}
        <div className={`flex-1 flex flex-col gap-6 order-1 lg:order-none lg:sticky lg:top-[var(--header-h)] lg:self-start lg:max-h-[calc(100vh-var(--header-h))] lg:overflow-y-auto custom-scrollbar lg:transition-[flex-basis,max-width] lg:duration-300 ${isViewOnly ? 'mx-auto max-w-3xl' : ''}`}>
            <VisualizerStage
                sequence={sequencer.activeSequence.data}
                name={sequencer.activeSequence.name}
                description={sequencer.activeSequence.description}
                isPlaying={sequencer.isPlaying}
                geoConfig={activeGeoConfig}
                onEnterFullScreen={() => setIsFullScreen(true)}
                imageSrc={sequencer.activeSequence.imageSrc}
                imageSrcDark={sequencer.activeSequence.imageSrcDark}
                imageInvert={sequencer.activeSequence.imageInvert}
                imageFrame={sequencer.activeSequence.imageFrame}
            />

            <PlaybackControls
                isPlaying={sequencer.isPlaying}
                togglePlay={sequencer.togglePlay}
                activeIndex={sequencer.activeIndex}
                sequences={sequencer.sequences}
                selectSequence={sequencer.selectSequence}
            />
        </div>

        {/* Right Column: Editor & Tuner (Hidden in View Only Mode).
            This column is the sole scroll region on lg+. Ordered to match the
            workflow: build/edit cards first, geometry tuning (with its preset
            switcher) below. */}
        {!isViewOnly && showEditor && (
            <div className="lg:w-[400px] xl:w-[460px] flex-shrink-0 flex flex-col gap-6 animate-in order-2 lg:order-none lg:sticky lg:top-[var(--header-h)] lg:self-start lg:max-h-[calc(100vh-var(--header-h))] lg:overflow-y-auto custom-scrollbar lg:pr-1">

                <SequenceManager
                    sequences={sequencer.sequences}
                    activeId={sequencer.activeSequence.id}
                    isPlaying={sequencer.isPlaying}
                    timingMs={sequencer.timingMs}
                    onSetTimingMs={sequencer.setTimingMs}
                    onUpdate={sequencer.updateSequence}
                    onReset={handleResetSequences}
                    onAdd={sequencer.addSequence}
                    onDuplicate={sequencer.duplicateSequence}
                    onDelete={handleDeleteSequence}
                    onSelect={sequencer.selectSequence}
                    onReorder={sequencer.reorderSequences}
                    isDarkMode={isDarkMode}
                    onImportSequence={sequencer.importSequence}
                    onAddImageSequences={sequencer.addImageSequences}
                    onSetSequenceLength={(length) => handleGeoConfigChange({ ...activeGeoConfig, sequenceLength: length })}
                />

                <hr className="border-slate-200 dark:border-slate-800" />

                <GeometryTuner
                    config={activeGeoConfig}
                    onChange={handleGeoConfigChange}
                />
            </div>
        )}

      </main>
    </div>
  );
};

export default App;