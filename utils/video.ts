/**
 * Video Export Utilities for QRP Generator
 * Uses mediabunny library with WebCodecs API for MP4 encoding
 */

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

export interface VideoExportOptions {
  sequences: Sequence[];
  timingMs: number;
  width?: number;
  height?: number;
  isDarkMode?: boolean;
  onProgress?: (progress: number, message: string) => void;
  signal?: AbortSignal;
}

export interface VideoExportResult {
  blob: Blob;
  filename: string;
}

/**
 * Renders an SVG element to a canvas
 */
const renderSvgToCanvas = async (
  svgElement: SVGSVGElement,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  backgroundColor: string
): Promise<void> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set canvas size
  canvas.width = width;
  canvas.height = height;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Serialize SVG
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Ensure namespace
  if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Ensure dimensions
  if (!source.includes('width=')) {
    source = source.replace('<svg', `<svg width="${width}" height="${height}"`);
  }

  // Create image from SVG
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Calculate aspect-ratio preserving dimensions
      const svgViewBox = svgElement.getAttribute('viewBox');
      let svgWidth = width;
      let svgHeight = height;

      if (svgViewBox) {
        const parts = svgViewBox.split(' ').map(Number);
        if (parts.length === 4) {
          const vbWidth = parts[2];
          const vbHeight = parts[3];
          const vbAspect = vbWidth / vbHeight;
          const canvasAspect = width / height;

          if (vbAspect > canvasAspect) {
            // SVG is wider - fit to width
            svgWidth = width;
            svgHeight = width / vbAspect;
          } else {
            // SVG is taller - fit to height
            svgHeight = height;
            svgWidth = height * vbAspect;
          }
        }
      }

      const xOffset = (width - svgWidth) / 2;
      const yOffset = (height - svgHeight) / 2;

      ctx.drawImage(img, xOffset, yOffset, svgWidth, svgHeight);
      URL.revokeObjectURL(url);
      resolve();
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = url;
  });
};

/**
 * Creates a video encoding configuration
 */
const createEncodingConfig = async (
  width: number,
  height: number,
  framerate: number
): Promise<VideoEncodingConfig> => {
  // Try to get the best available codec
  // Codec order: H.264 (avc) is most widely supported
  const codecOrder: VideoCodec[] = ['avc', 'hevc', 'vp9', 'av1', 'vp8'];
  const codec = await getFirstEncodableVideoCodec(codecOrder, { width, height, bitrate: QUALITY_HIGH });

  if (!codec) {
    // Fallback to H.264 (most common)
    throw new Error('No supported video codec found. Please use a modern browser with WebCodecs support.');
  }

  return {
    codec,
    bitrate: 8_000_000, // 8 Mbps for good quality
    keyFrameInterval: 2, // Keyframe every 2 seconds
    latencyMode: 'quality',
    bitrateMode: 'variable',
  };
};

/**
 * Exports sequences as MP4 video
 * 
 * @param options - Export options including sequences, timing, and callbacks
 * @returns Promise resolving to video blob and filename
 */
export const exportSequencesToMP4 = async (
  options: VideoExportOptions
): Promise<VideoExportResult> => {
  const {
    sequences,
    timingMs,
    width = 1000,
    height = 1000,
    isDarkMode = false,
    onProgress,
    signal,
  } = options;

  if (sequences.length === 0) {
    throw new Error('No sequences to export');
  }

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const frameDuration = timingMs / 1000; // Convert to seconds
  const framerate = 1 / frameDuration;

  onProgress?.(0, 'Initializing video encoder...');

  // Create encoding config
  const encodingConfig = await createEncodingConfig(width, height, framerate);

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

  onProgress?.(5, 'Starting frame capture...');

  // Process each sequence
  let currentTimestamp = 0;
  const totalFrames = sequences.length;

  for (let i = 0; i < sequences.length; i++) {
    if (signal?.aborted) {
      await output.cancel();
      throw new Error('Export cancelled');
    }

    const sequence = sequences[i];
    const progress = 5 + ((i / totalFrames) * 90);

    onProgress?.(progress, `Rendering frame ${i + 1} of ${totalFrames}...`);

    // Create a temporary container to render the QRPGenerator
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${width}px;
      height: ${height}px;
      pointer-events: none;
    `;

    // We need to render the QRPGenerator component
    // Since we're in a utility, we'll use a callback approach
    // The actual rendering will be done by the component
    // For now, we'll use a placeholder approach
    
    // This will be called from the component with the rendered SVG
    // For the utility, we expect an SVG element to be passed
    
    document.body.appendChild(container);

    try {
      // Wait for rendering (simplified - actual implementation needs React integration)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Find the SVG in the container
      const svgElement = container.querySelector('svg');
      if (svgElement) {
        await renderSvgToCanvas(svgElement, canvas, width, height, backgroundColor);
      }

      // Add frame to video
      await canvasSource.add(currentTimestamp, frameDuration);
      currentTimestamp += frameDuration;

    } finally {
      document.body.removeChild(container);
    }
  }

  onProgress?.(95, 'Finalizing video...');

  // Close source and finalize
  canvasSource.close();
  await output.finalize();

  onProgress?.(100, 'Export complete!');

  // Create blob from buffer
  const buffer = target.buffer;
  if (!buffer) {
    throw new Error('Failed to create video buffer');
  }

  const blob = new Blob([buffer], { type: 'video/mp4' });
  const filename = `qrp-sequence-${Date.now()}.mp4`;

  return { blob, filename };
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

/**
 * Check if WebCodecs is supported
 */
export const isWebCodecsSupported = (): boolean => {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
};

/**
 * Get supported video codecs for encoding
 */
export const getSupportedCodecs = async (): Promise<string[]> => {
  const codecs: string[] = [];
  
  const codecList: VideoCodec[] = ['avc', 'hevc', 'vp9', 'av1', 'vp8'];
  
  for (const codec of codecList) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: codec,
        width: 1000,
        height: 1000,
      });
      if (support.supported) {
        codecs.push(codec);
      }
    } catch {
      // Codec not supported
    }
  }

  return codecs;
};
