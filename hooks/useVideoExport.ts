/**
 * Video Export Hook for QRP Generator
 * Handles rendering sequences to video using mediabunny
 */

import { useRef, useCallback, useState } from 'react';
import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  VideoEncodingConfig,
  QUALITY_HIGH,
  getFirstEncodableVideoCodec,
  VideoCodec,
} from 'mediabunny';
import { Sequence } from '../types';

export interface VideoExportState {
  isExporting: boolean;
  progress: number;
  message: string;
  error: string | null;
}

export interface UseVideoExportOptions {
  width?: number;
  height?: number;
}

export const useVideoExport = (options: UseVideoExportOptions = {}) => {
  const { width = 1000, height = 1000 } = options;
  
  const [state, setState] = useState<VideoExportState>({
    isExporting: false,
    progress: 0,
    message: '',
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateProgress = useCallback((progress: number, message: string) => {
    setState(prev => ({ ...prev, progress, message }));
  }, []);

  const createEncodingConfig = useCallback(async (): Promise<VideoEncodingConfig> => {
    const codecOrder: VideoCodec[] = ['avc', 'hevc', 'vp9', 'av1', 'vp8'];
    const codec = await getFirstEncodableVideoCodec(codecOrder, { width, height, bitrate: QUALITY_HIGH });

    if (!codec) {
      throw new Error('No supported video codec found. Please use a modern browser with WebCodecs support.');
    }

    return {
      codec,
      bitrate: 8_000_000,
      keyFrameInterval: 2,
      latencyMode: 'quality',
      bitrateMode: 'variable',
    };
  }, [width, height]);

  const exportVideo = useCallback(async (
    sequences: Sequence[],
    timingMs: number,
    isDarkMode: boolean,
    renderFrame: (sequence: Sequence, canvas: HTMLCanvasElement, frameIndex: number, totalFramesPerScene: number) => Promise<void>
  ): Promise<Blob | null> => {
    if (sequences.length === 0) {
      setState(prev => ({ ...prev, error: 'No sequences to export' }));
      return null;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState({
      isExporting: true,
      progress: 0,
      message: 'Initializing...',
      error: null,
    });

    try {
      const framerate = 30; // Fixed 30fps
      const frameDuration = 1 / framerate; // Duration of each frame in seconds
      const sceneDuration = timingMs / 1000; // Duration of each scene in seconds
      const framesPerScene = Math.round(sceneDuration * framerate); // Number of frames per scene

      updateProgress(5, 'Creating video encoder...');

      // Create encoding config
      const encodingConfig = await createEncodingConfig();

      // Create output components
      const target = new BufferTarget();
      const format = new Mp4OutputFormat({ fastStart: 'in-memory' });
      const output = new Output({ format, target });

      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      // Create canvas source for video
      const canvasSource = new CanvasSource(canvas, encodingConfig);

      // Add video track
      output.addVideoTrack(canvasSource, {
        frameRate: framerate,
        name: 'QRP Sequence Animation',
      });

      // Start output
      await output.start();

      updateProgress(10, 'Starting frame capture...');

      // Process each sequence
      let currentTimestamp = 0;
      const totalScenes = sequences.length;
      let globalFrameIndex = 0;

      for (let sceneIndex = 0; sceneIndex < sequences.length; sceneIndex++) {
        if (abortController.signal.aborted) {
          await output.cancel();
          setState(prev => ({ ...prev, error: 'Export cancelled' }));
          return null;
        }

        const sequence = sequences[sceneIndex];
        
        // Render all frames for this scene
        for (let frameInScene = 0; frameInScene < framesPerScene; frameInScene++) {
          const progress = 10 + ((globalFrameIndex / (totalScenes * framesPerScene)) * 85);
          updateProgress(progress, `Rendering frame ${globalFrameIndex + 1}...`);

          // Render the frame using the provided callback
          await renderFrame(sequence, canvas, frameInScene, framesPerScene);

          // Add frame to video
          await canvasSource.add(currentTimestamp, frameDuration);
          currentTimestamp += frameDuration;
          globalFrameIndex++;
        }
      }

      updateProgress(95, 'Finalizing video...');

      // Close source and finalize
      canvasSource.close();
      await output.finalize();

      updateProgress(100, 'Export complete!');

      // Create blob from buffer
      const buffer = target.buffer;
      if (!buffer) {
        throw new Error('Failed to create video buffer');
      }

      const blob = new Blob([buffer], { type: 'video/mp4' });

      setState(prev => ({ ...prev, isExporting: false }));
      return blob;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during export';
      setState(prev => ({ ...prev, isExporting: false, error: message }));
      return null;
    }
  }, [width, height, updateProgress, createEncodingConfig]);

  const cancelExport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const resetState = useCallback(() => {
    setState({
      isExporting: false,
      progress: 0,
      message: '',
      error: null,
    });
  }, []);

  return {
    ...state,
    exportVideo,
    cancelExport,
    resetState,
  };
};

/**
 * Check if WebCodecs is supported
 */
export const isWebCodecsSupported = (): boolean => {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
};

/**
 * Triggers download of a video blob
 */
export const downloadVideo = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
