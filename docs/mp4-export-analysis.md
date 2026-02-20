# QRP Generator - MP4 Export Implementation Analysis

## Project Overview

The QRP (Quantum Resonance Pattern) Generator is a React/TypeScript application that creates geometric visualizations based on numerical sequences. The app renders SVG-based patterns with various customization options.

## Current Architecture

### Key Components

1. **[`QRPGenerator.tsx`](components/QRPGenerator.tsx)** - Core visualization component
   - Renders SVG-based geometric patterns
   - Supports multiple lobe types: sunflower, dharma, lotus
   - Has `exportMode` and `exportTheme` props for static export
   - Uses SVG with viewBox="0 -150 400 700"

2. **[`SequenceManager.tsx`](components/SequenceManager.tsx)** - Manages sequence collection
   - Contains existing PNG export functionality (`handleExportPng`)
   - Uses hidden high-res export container with `exportRef`
   - Currently exports single frames to PNG with metadata

3. **[`useSequencer.ts`](hooks/useSequencer.ts)** - Playback logic
   - Controls sequence timing with `timingMs` (default 1500ms)
   - Manages `isPlaying` state and `activeIndex`
   - Uses `setInterval` for frame advancement

4. **[`png.ts`](utils/png.ts)** - PNG export utilities
   - Custom CRC32 implementation for PNG chunk manipulation
   - `writePngMetadata` / `readPngMetadata` for embedding config

### Data Types

```typescript
interface Sequence {
  id: number;
  name: string;
  description?: string;
  data: number[];  // The numerical sequence
  geoConfig: GeoConfig;
}

interface GeoConfig {
  // Frame settings
  showFrame: boolean;
  frameDoubleTop: boolean;
  // ... many geometry and style options
}
```

## Current PNG Export Flow

1. User clicks "Save Card" button
2. Hidden `exportRef` div contains high-res `QRPGenerator` with `exportMode={true}`
3. SVG is serialized using `XMLSerializer`
4. Canvas created at 1000x1000 pixels
5. SVG drawn to canvas via `Image` and `drawImage()`
6. Canvas exported to PNG blob
7. Config metadata embedded using `writePngMetadata()`
8. Download triggered via anchor element

## MP4 Export Requirements

### Technical Challenges

1. **Frame Capture** - Need to capture each sequence frame as an image
2. **Video Encoding** - Convert frame sequence to MP4 format
3. **Timing Control** - Respect `timingMs` for frame duration
4. **Browser Compatibility** - WebCodecs API support varies

### Mediabunny Library

**Package:** `mediabunny` (v1.34.4)
**Author:** vanilagy
**Description:** Pure TypeScript media parsing/reading/writing with WebCodecs support

Key capabilities:
- MP4/MOV/fMP4 muxing
- WebM/MKV support
- WebCodecs integration
- Video encoding support

## Proposed Implementation

### Option A: WebCodecs + Mediabunny (Recommended)

```typescript
// Conceptual flow
import { Muxer, ArrayBufferTarget } from 'mediabunny';

// 1. Configure video encoder
const encoder = new VideoEncoder({
  output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
  error: (e) => console.error(e)
});

// 2. Capture frames
for (const sequence of sequences) {
  const frame = await captureFrame(sequence);
  encoder.encode(frame);
}

// 3. Finalize MP4
const buffer = muxer.finalize();
```

### Option B: Canvas + MediaRecorder (Fallback)

- Use `MediaRecorder` API with canvas stream
- Limited to WebM in most browsers
- Would need server-side conversion for MP4

### Option C: Frame-by-frame PNG + FFmpeg.wasm

- Capture all frames as PNGs
- Use FFmpeg.wasm to encode video
- Heavy dependency, slower performance

## Recommended Architecture

### New Files Needed

1. **`utils/video.ts`** - Video encoding utilities
   - `exportSequenceToMP4()` - Main export function
   - `captureFrame()` - SVG to canvas frame capture
   - `encodeVideo()` - WebCodecs encoding

2. **`components/VideoExportModal.tsx`** - Export UI
   - Progress indicator
   - Quality/format settings
   - Cancel button

### Integration Points

- Add to [`SequenceManager.tsx`](components/SequenceManager.tsx) alongside PNG export
- Hook into existing `sequences` and `timingMs` state
- Reuse `exportRef` pattern for frame rendering

## Browser Support Considerations

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebCodecs | 94+ | No* | No | 94+ |
| MediaRecorder | 49+ | 51+ | 14.1+ | 79+ |
| OffscreenCanvas | 69+ | 105+ | 16.4+ | 79+ |

*Firefox has WebCodecs behind flag

### Fallback Strategy

1. Try WebCodecs first
2. Fall back to MediaRecorder (WebM output)
3. Provide quality/format options based on capabilities

## Mediabunny API Analysis (Completed)

### Key Classes for MP4 Export

1. **`CanvasSource`** - Perfect for our use case!
   ```typescript
   constructor(canvas: HTMLCanvasElement | OffscreenCanvas, encodingConfig: VideoEncodingConfig)
   add(timestamp: number, duration?: number, encodeOptions?: VideoEncoderEncodeOptions): Promise<void>
   ```
   - Takes a canvas element
   - Captures current canvas state as a video frame
   - Automatically encodes and adds to output

2. **`VideoSampleSource`** - Alternative for raw frames
   ```typescript
   constructor(encodingConfig: VideoEncodingConfig)
   add(videoSample: VideoSample): Promise<void>
   ```

3. **`Output`** - Main orchestrator
   ```typescript
   constructor({ format, target })
   addVideoTrack(source: VideoSource, metadata?: VideoTrackMetadata): void
   start(): Promise<void>
   finalize(): Promise<void>
   ```

4. **`Mp4OutputFormat`** - MP4 container
   ```typescript
   new Mp4OutputFormat({ fastStart: 'in-memory' })
   ```

5. **`BufferTarget`** - In-memory output
   ```typescript
   new BufferTarget() // buffer.buffer contains ArrayBuffer after finalize
   ```

6. **Encoding Configuration**
   ```typescript
   VideoEncodingConfig {
     codec: VideoCodec,  // 'avc' | 'vp8' | 'vp9' | 'av1' | 'hevc'
     bitrate: number | Quality,
     keyFrameInterval?: number,
     alpha?: 'discard' | 'keep',
     bitrateMode?: 'constant' | 'variable',
     latencyMode?: 'quality' | 'realtime'
   }
   ```

7. **Browser Capability Detection**
   ```typescript
   canEncodeVideo(codec, options): Promise<boolean>
   getFirstEncodableVideoCodec(codecs, options): Promise<VideoCodec | null>
   getEncodableVideoCodecs(): Promise<VideoCodec[]>
   ```

### Implementation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    MP4 Export Flow                          │
├─────────────────────────────────────────────────────────────┤
│  1. Create hidden canvas (1000x1000)                        │
│  2. Create BufferTarget + Mp4OutputFormat + Output          │
│  3. Create CanvasSource with encoding config                │
│  4. Add video track to output                               │
│  5. Start output                                            │
│  6. For each sequence:                                      │
│     a. Render QRPGenerator to canvas                        │
│     b. await canvasSource.add(timestamp, duration)          │
│     c. Update progress callback                             │
│  7. Close source & finalize output                          │
│  8. Create Blob from BufferTarget.buffer                    │
│  9. Trigger download                                        │
└─────────────────────────────────────────────────────────────┘
```

### Codec Priority (browser support)

1. `avc` (H.264) - Most widely supported, works in all modern browsers
2. `vp9` - Good compression, Chrome/Firefox
3. `av1` - Best compression, limited hardware support
4. `hevc` (H.265) - Good compression, Safari/limited Chrome

### Frame Timing

- Each sequence frame duration = `timingMs` (default 1500ms)
- Timestamp = frameIndex * (timingMs / 1000) seconds
- Duration = timingMs / 1000 seconds

## Next Steps

1. ~~Install mediabunny: `npm install mediabunny`~~ ✅ Done
2. ~~Create `utils/video.ts` with frame capture logic~~ ✅ Done
3. ~~Implement WebCodecs video encoder~~ ✅ Done
4. ~~Add export button to UI~~ ✅ Done
5. ~~Handle browser compatibility~~ ✅ Done (error message for unsupported browsers)
6. ~~Add progress tracking~~ ✅ Done

## Implementation Complete ✅

### Files Created/Modified

1. **[`utils/video.ts`](utils/video.ts)** - Video export utilities
   - `exportSequencesToMP4()` - Main export function
   - `renderSvgToCanvas()` - SVG to canvas rendering
   - `createEncodingConfig()` - Video encoder configuration
   - `isWebCodecsSupported()` - Browser support check
   - `getSupportedCodecs()` - List available codecs
   - `downloadVideo()` - Trigger download

2. **[`hooks/useVideoExport.ts`](hooks/useVideoExport.ts)** - React hook for video export
   - `useVideoExport()` - Hook with export state and controls
   - Progress tracking via callbacks
   - Abort controller for cancellation
   - Error handling

3. **[`components/VideoExportModal.tsx`](components/VideoExportModal.tsx)** - Export UI modal
   - Export info display (sequences, duration, resolution)
   - Progress bar with messages
   - Browser support warning
   - Download button for completed exports

4. **[`components/SequenceManager.tsx`](components/SequenceManager.tsx)** - Added video export button
   - New "Export Video" button with Film icon
   - Integrated VideoExportModal
   - Added `timingMs` prop

5. **[`App.tsx`](App.tsx)** - Updated to pass `timingMs` to SequenceManager

### Usage

1. Open the editor panel (click "Editor" button)
2. Click "Export Video" button in the Sequence Manager
3. Review export info (sequences, duration, resolution)
4. Click "Start Export"
5. Wait for progress to complete
6. Click "Download Video"

### Browser Requirements

- Chrome 94+ or Edge 94+ (WebCodecs API required)
- Firefox and Safari are not currently supported
- Users on unsupported browsers see a warning message

---

## Session Learnings & Debugging Notes

### Issue: Each Scene Rendered as Single Frame

**Problem:** Initial implementation rendered each sequence as one video frame, resulting in very short videos.

**Root Cause:** The frame timing calculation wasn't using the 30fps rate properly.

**Solution:** Calculate frames per scene at 30fps:
```typescript
const framerate = 30;
const sceneDuration = timingMs / 1000;
const framesPerScene = Math.round(sceneDuration * framerate);

// Then loop through each frame:
for (let frameInScene = 0; frameInScene < framesPerScene; frameInScene++) {
  await renderFrame(sequence, canvas, frameInScene, framesPerScene);
  await canvasSource.add(currentTimestamp, frameDuration);
}
```

### Anti-Clockwise Rotation

**Implementation:** Rotation is calculated per-frame using the global frame index:
```typescript
const rotationPerFrame = 360 / (24 * 30); // 0.5° per frame at 30fps for 24s full rotation
const currentRotation = -globalFrameIndex * rotationPerFrame; // Negative for anti-clockwise
```

Applied via direct DOM manipulation using `data-rotate` attributes:
```typescript
const rotatingGroups = svgElement.querySelectorAll('[data-rotate="seeds"]');
rotatingGroups.forEach((g) => {
  (g as SVGElement).setAttribute('transform', `rotate(${rotation})`);
});
```

### Intro/Outro Cards

**Why Needed:** Without intro/outro cards, videos often show black frames at start/end due to encoder initialization/finalization.

**Implementation:** Render directly to canvas using 2D context:
- **Intro Card:** Shows sequence name and "QUANTUM RESONANCE PATTERN" subtitle
- **Outro Card:** Shows circle symbol and "END OF SEQUENCE" text

### Performance Considerations

1. **Frame Rendering Pipeline:**
   - SVG serialization → Blob creation → Image loading → Canvas drawing → Video encoding
   - This is the inherent bottleneck, not the delays

2. **Delay Removal:** All artificial delays (setTimeout) have been removed after debugging:
   - Intro/outro card delays: Removed
   - DOM update delays: Removed
   - Frame capture delays: Removed

3. **Key Files for Export:**
   - [`hooks/useVideoExport.ts`](hooks/useVideoExport.ts) - Core export logic with mediabunny
   - [`components/VideoExportModal.tsx`](components/VideoExportModal.tsx) - UI and frame rendering
   - [`components/QRPGenerator.tsx`](components/QRPGenerator.tsx) - Added `data-rotate` attributes for animation

4. **Tailwind Animation for Preview:**
   - Added `animate-spin-reverse` in [`index.html`](index.html) for anti-clockwise playback preview:
   ```javascript
   animation: {
     'spin-reverse': 'spin 24s linear infinite reverse',
     'spin-reverse-slow': 'spin 48s linear infinite reverse',
   }
   ```

### Export Options

- **Loop Count:** Number of times to repeat the sequence (1-10x)
- **Video Name:** Custom name shown in intro card and filename
- **Resolution:** 1000×1000 pixels
- **Frame Rate:** 30fps
- **Format:** MP4 (H.264)
