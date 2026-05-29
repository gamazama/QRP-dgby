/**
 * Video Export Modal Component
 * Provides UI for exporting sequences as MP4 video
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { flushSync, createPortal } from 'react-dom';
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
  const renderRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0); // Use ref for immediate rotation value
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map()); // Decoded image-card bitmaps, keyed by data URL

  // Decode an image-card source once and reuse it across every frame of the scene.
  const loadCachedImage = useCallback((src: string): Promise<HTMLImageElement> => {
    const cached = imageCacheRef.current.get(src);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        imageCacheRef.current.set(src, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error('Failed to load card image'));
      img.src = src;
    });
  }, []);

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

    // Image-card fast path: the image is identical on every frame of the scene,
    // so skip the per-frame SVG serialize + base64 decode and just draw the
    // cached bitmap. Framed image cards fall through to the normal SVG path so
    // QRPGenerator draws the frame (and the feColorMatrix invert).
    if (sequence?.imageSrc && !sequence.imageFrame) {
      // Baked theme-pair cards: draw the layer matching the theme, no filter.
      const src = sequence.imageSrcDark && isDarkMode ? sequence.imageSrcDark : sequence.imageSrc;
      const img = await loadCachedImage(src);
      const boxAspect = 400 / 700; // QRPGenerator viewBox aspect
      const canvasAspect = canvas.width / canvas.height;
      let boxW: number;
      let boxH: number;
      if (boxAspect > canvasAspect) {
        boxW = canvas.width;
        boxH = canvas.width / boxAspect;
      } else {
        boxH = canvas.height;
        boxW = canvas.height * boxAspect;
      }
      const boxX = (canvas.width - boxW) / 2;
      const boxY = (canvas.height - boxH) / 2;
      // Fit (contain) the image inside the card box — matches preserveAspectRatio="meet"
      const imgAspect = img.width / img.height;
      let dW: number;
      let dH: number;
      if (imgAspect > boxW / boxH) {
        dW = boxW;
        dH = boxW / imgAspect;
      } else {
        dH = boxH;
        dW = boxH * imgAspect;
      }
      // Match the live dark-mode treatment: invert black-line image cards so
      // their lines render as white in a dark-themed video (unless opted out).
      // Theme-pair cards skip this — their dark layer is already white-on-clear.
      if (!sequence.imageSrcDark && isDarkMode && sequence.imageInvert !== false) {
        // Luminance-preserving invert — matches the live `.qrp-invert` CSS.
        ctx.filter = 'invert(1) hue-rotate(180deg) contrast(1.05)';
      }
      ctx.drawImage(img, boxX + (boxW - dW) / 2, boxY + (boxH - dH) / 2, dW, dH);
      ctx.filter = 'none';
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
  }, [isDarkMode, videoName, loadCachedImage]);

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
    // Map scene id → original index once, instead of scanning every frame.
    const indexById = new Map(sequences.map((s, i) => [s.id, i]));

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

        // Unframed image cards render straight from a cached bitmap and never
        // read the hidden QRPGenerator, so skip the per-frame React re-render.
        // Framed image cards DO use the hidden QRPGenerator (for the frame), so
        // they still need the re-render below.
        const usesFastPath = !isIntro && !isOutro && !!sequence.imageSrc && !sequence.imageFrame;

        if (!usesFastPath) {
          // Use flushSync to ensure state updates are applied synchronously
          flushSync(() => {
            // Update state for rendering
            setIsIntroFrame(isIntro);
            setIsOutroFrame(isOutro);

            // Update both ref (immediate) and state (for React re-render)
            rotationRef.current = currentRotation;
            setAnimationRotation(currentRotation);

            if (!isIntro && !isOutro) {
              // Update the current sequence index to trigger re-render
              setCurrentSequenceIndex(indexById.get(sequence.id) ?? 0);
            }
          });
        }

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

  // Close on Escape while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const webCodecsSupported = isWebCodecsSupported();
  const currentSequence = sequences[currentSequenceIndex] || sequences[0];
  
  // Calculate total duration
  const totalFrames = 1 + (sequences.length * loopCount) + 1; // intro + loops + outro
  const totalDuration = (totalFrames * timingMs) / 1000;

  // Portal to <body> so the fixed overlay isn't trapped inside the editor
  // column's containing block (it's rendered from within that scrolling panel).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200 dark:border-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-export-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-500" />
            <h2 id="video-export-title" className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Export Video
            </h2>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            title="Close (Esc)"
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
              <label htmlFor="video-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Video Name
              </label>
              <input
                id="video-name"
                type="text"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter video name…"
              />
            </div>

            {/* Loop Count */}
            <div>
              <label htmlFor="loop-count" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Loop Count
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="loop-count"
                  type="range"
                  min="1"
                  max="10"
                  value={loopCount}
                  onChange={(e) => setLoopCount(parseInt(e.target.value))}
                  aria-valuetext={`${loopCount} times`}
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
              <span className="text-slate-800 dark:text-slate-200 font-medium">{(timingMs / 1000).toFixed(1)}s</span>
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
            {isExporting ? 'Cancel Export' : 'Close'}
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
              imageSrc={currentSequence.imageSrc}
              imageSrcDark={currentSequence.imageSrcDark}
              imageInvert={currentSequence.imageInvert}
              imageFrame={currentSequence.imageFrame}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VideoExportModal;
