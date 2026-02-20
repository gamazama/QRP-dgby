/**
 * Video Export Modal Component
 * Provides UI for exporting sequences as MP4 video
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { X, Film, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Sequence } from '../types';
import { useVideoExport, isWebCodecsSupported, downloadVideo } from '../hooks/useVideoExport';
import QRPGenerator from './QRPGenerator';

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sequences: Sequence[];
  timingMs: number;
  isDarkMode: boolean;
}

// Intro Card Component - Shows sequence name
const IntroCard: React.FC<{ 
  name: string; 
  backgroundColor: string;
  textColor: string;
}> = ({ name, backgroundColor, textColor }) => (
  <div style={{
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor,
    color: textColor,
    fontFamily: 'Inter, system-ui, sans-serif',
  }}>
    <h1 style={{
      fontSize: '48px',
      fontWeight: 300,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom: '16px',
    }}>
      {name || 'QRP Sequence'}
    </h1>
    <p style={{
      fontSize: '16px',
      opacity: 0.6,
      letterSpacing: '0.2em',
    }}>
      QUANTUM RESONANCE PATTERN
    </p>
  </div>
);

// Outro Card Component - Prevents black screen dropout
const OutroCard: React.FC<{ 
  backgroundColor: string;
  textColor: string;
}> = ({ backgroundColor, textColor }) => (
  <div style={{
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor,
    color: textColor,
    fontFamily: 'Inter, system-ui, sans-serif',
  }}>
    <div style={{
      fontSize: '64px',
      marginBottom: '24px',
      opacity: 0.8,
    }}>
      ○
    </div>
    <p style={{
      fontSize: '14px',
      opacity: 0.5,
      letterSpacing: '0.15em',
    }}>
      END OF SEQUENCE
    </p>
  </div>
);

const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  sequences,
  timingMs,
  isDarkMode,
}) => {
  const {
    isExporting,
    progress,
    message,
    error,
    exportVideo,
    cancelExport,
    resetState,
  } = useVideoExport({ width: 1000, height: 1000 });

  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [isIntroFrame, setIsIntroFrame] = useState(false);
  const [isOutroFrame, setIsOutroFrame] = useState(false);
  const [animationRotation, setAnimationRotation] = useState(0);
  const [frameCounter, setFrameCounter] = useState(0); // Force re-render on each frame
  const renderRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0); // Use ref for immediate rotation value

  // Export options
  const [loopCount, setLoopCount] = useState(3);
  const [videoName, setVideoName] = useState('QRP Sequence');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      resetState();
      setExportedBlob(null);
      setCurrentSequenceIndex(0);
      setIsIntroFrame(false);
      setIsOutroFrame(false);
      // Set default name from first sequence
      if (sequences.length > 0) {
        setVideoName(sequences[0].name || 'QRP Sequence');
      }
    }
  }, [isOpen, resetState, sequences]);

  // Render a sequence to the canvas by updating the render container
  const renderFrame = useCallback(async (
    canvas: HTMLCanvasElement, 
    sequence?: Sequence,
    isIntro: boolean = false,
    isOutro: boolean = false,
    rotation: number = 0
  ): Promise<void> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
    const textColor = isDarkMode ? '#e2e8f0' : '#0f172a';

    // Reset canvas context state
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset any transforms
    
    // Clear canvas with background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Handle intro/outro cards - render directly to canvas
    if (isIntro) {
      // Draw title
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '300 48px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(videoName.toUpperCase(), canvas.width / 2, canvas.height / 2 - 20);
      
      // Draw subtitle
      ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = isDarkMode ? 'rgba(226, 232, 240, 0.5)' : 'rgba(15, 23, 42, 0.5)';
      ctx.fillText('QUANTUM RESONANCE PATTERN', canvas.width / 2, canvas.height / 2 + 30);
      
      // Wait for canvas to update
      return;
    }

    if (isOutro) {
      // Draw circle symbol directly (more reliable than text character)
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2 - 30, 40, 0, Math.PI * 2);
      ctx.strokeStyle = textColor;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
      
      // Draw end text
      ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = isDarkMode ? 'rgba(226, 232, 240, 0.5)' : 'rgba(15, 23, 42, 0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('END OF SEQUENCE', canvas.width / 2, canvas.height / 2 + 40);
      
      // Wait for canvas to update
      return;
    }

    if (!renderRef.current) {
      throw new Error('Render container not found');
    }

    // Find the SVG in the render container
    const svgElement = renderRef.current.querySelector('svg');
    if (!svgElement) {
      throw new Error('SVG element not found');
    }

    // Directly update the transform attributes in the DOM before serializing
    // This ensures the rotation is applied even if React hasn't re-rendered
    const rotatingGroups = svgElement.querySelectorAll('[data-rotate="seeds"]');
    rotatingGroups.forEach((g) => {
      (g as SVGElement).setAttribute('transform', `rotate(${rotation})`);
    });
    
    const centralRotatingGroups = svgElement.querySelectorAll('[data-rotate="central"]');
    centralRotatingGroups.forEach((g) => {
      (g as SVGElement).setAttribute('transform', `rotate(${rotation * 0.5})`);
    });

    // Serialize SVG
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);

    // Ensure namespace
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Ensure dimensions
    if (!source.includes('width=')) {
      source = source.replace('<svg', '<svg width="1000" height="1000"');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        // Calculate aspect-ratio preserving dimensions
        // SVG viewBox is "0 -150 400 700" (4:7 aspect ratio)
        const vbWidth = 400;
        const vbHeight = 700;
        const vbAspect = vbWidth / vbHeight;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth: number;
        let drawHeight: number;

        if (vbAspect > canvasAspect) {
          drawWidth = canvas.width;
          drawHeight = canvas.width / vbAspect;
        } else {
          drawHeight = canvas.height;
          drawWidth = canvas.height * vbAspect;
        }

        const xOffset = (canvas.width - drawWidth) / 2;
        const yOffset = (canvas.height - drawHeight) / 2;

        ctx.drawImage(img, xOffset, yOffset, drawWidth, drawHeight);
        URL.revokeObjectURL(url);
        resolve();
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };

      img.src = url;
    });
  }, [isDarkMode, videoName]);

  // Start export with frame-by-frame rendering
  const handleStartExport = useCallback(async () => {
    setExportedBlob(null);
    
    // Build expanded sequence list with loops, intro, and outro
    const expandedSequences: (Sequence & { isIntro?: boolean; isOutro?: boolean })[] = [];
    
    // Add intro card
    expandedSequences.push({ 
      ...sequences[0], 
      id: -1, 
      name: videoName,
      isIntro: true 
    });
    
    // Add loops
    for (let loop = 0; loop < loopCount; loop++) {
      for (const seq of sequences) {
        expandedSequences.push(seq);
      }
    }
    
    // Add outro card
    expandedSequences.push({ 
      ...sequences[0], 
      id: -2, 
      name: 'Outro',
      isOutro: true 
    });
    
    // Create a custom export that renders each frame
    // Global frame counter for continuous rotation across all scenes
    let globalFrameIndex = 0;
    
    const blob = await exportVideo(
      expandedSequences,
      timingMs,
      isDarkMode,
      async (sequence: Sequence, canvas: HTMLCanvasElement, frameInScene: number, framesPerScene: number) => {
        const isIntro = (sequence as any).isIntro;
        const isOutro = (sequence as any).isOutro;
        
        // Calculate animation rotation based on global frame index (negative for anti-clockwise)
        // 24 seconds per full rotation at 30fps = 720 frames
        const rotationPerFrame = 360 / (24 * 30); // degrees per frame at 30fps
        const currentRotation = -globalFrameIndex * rotationPerFrame; // Negative for anti-clockwise
        
        globalFrameIndex++;
        
        // Use flushSync to ensure state updates are applied synchronously
        flushSync(() => {
          // Update state for rendering
          setIsIntroFrame(isIntro);
          setIsOutroFrame(isOutro);
          
          // Update both ref (immediate) and state (for React re-render)
          rotationRef.current = currentRotation;
          setAnimationRotation(currentRotation);
          setFrameCounter(globalFrameIndex); // Force re-render on each frame
          
          if (!isIntro && !isOutro) {
            // Update the current sequence index to trigger re-render
            const index = sequences.findIndex(s => s.id === sequence.id);
            setCurrentSequenceIndex(index >= 0 ? index : 0);
          }
        });
        
        // Render the frame with the current rotation
        await renderFrame(canvas, sequence, isIntro, isOutro, currentRotation);
      }
    );
    
    if (blob) {
      setExportedBlob(blob);
    }
  }, [sequences, timingMs, isDarkMode, exportVideo, renderFrame, loopCount, videoName]);

  // Download the exported video
  const handleDownload = useCallback(() => {
    if (exportedBlob) {
      // Sanitize filename
      const sanitizedName = videoName
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
      const filename = `${sanitizedName || 'qrp-sequence'}-${new Date().toISOString().slice(0, 10)}.mp4`;
      downloadVideo(exportedBlob, filename);
    }
  }, [exportedBlob, videoName]);

  // Handle close
  const handleClose = useCallback(() => {
    if (isExporting) {
      cancelExport();
    }
    onClose();
  }, [isExporting, cancelExport, onClose]);

  if (!isOpen) return null;

  const webCodecsSupported = isWebCodecsSupported();
  const currentSequence = sequences[currentSequenceIndex] || sequences[0];
  
  // Calculate total duration
  const totalFrames = 1 + (sequences.length * loopCount) + 1; // intro + loops + outro
  const totalDuration = (totalFrames * timingMs) / 1000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Export Video
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Browser Support Warning */}
          {!webCodecsSupported && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Browser Not Supported
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  WebCodecs API is required for video export. Please use Chrome 94+ or Edge 94+.
                </p>
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="space-y-3">
            {/* Video Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Video Name
              </label>
              <input
                type="text"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter video name..."
              />
            </div>

            {/* Loop Count */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Loop Count
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={loopCount}
                  onChange={(e) => setLoopCount(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 w-8 text-center">
                  {loopCount}x
                </span>
              </div>
            </div>
          </div>

          {/* Export Info */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Sequences:</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">{sequences.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Frame Duration:</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">{timingMs}ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Total Frames:</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">{totalFrames}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Total Duration:</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">
                {totalDuration.toFixed(1)}s
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Resolution:</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">1000×1000</span>
            </div>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{message}</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Export Failed</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Success */}
          {exportedBlob && !isExporting && (
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Export Complete!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Video size: {(exportedBlob.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>

          {!exportedBlob ? (
            <button
              onClick={handleStartExport}
              disabled={isExporting || !webCodecsSupported || sequences.length === 0}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  Start Export
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Video
            </button>
          )}
        </div>

        {/* Hidden render container for current sequence */}
        <div
          ref={renderRef}
          style={{
            position: 'absolute',
            top: -9999,
            left: -9999,
            width: 1000,
            height: 1000,
            pointerEvents: 'none',
            opacity: 0,
          }}
        >
          {!isIntroFrame && !isOutroFrame && currentSequence && (
            <QRPGenerator
              key={`frame-${frameCounter}`}
              sequence={currentSequence.data}
              size={1000}
              showLabels={false}
              active={true}
              title={currentSequence.name}
              description={currentSequence.description}
              exportMode={true}
              exportTheme={isDarkMode ? 'dark' : 'light'}
              animationRotation={animationRotation}
              {...currentSequence.geoConfig}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoExportModal;
