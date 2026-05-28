# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm run dev` — Vite dev server on port 3000 (host 0.0.0.0)
- `npm run build` — production build to `dist/` (writes `.nojekyll` via custom plugin)
- `npm run preview` — serve the production build locally
- `npm run deploy` — build and publish `dist/` to GitHub Pages (`gh-pages -f`)

No test runner or linter is configured. Type checking is via `tsconfig.json` only (`noEmit: true`); there is no standalone `tsc` script — rely on Vite/editor for type errors.

### Important deploy/path detail
`vite.config.ts` sets `base: '/QRP-dgby/'` because the app is hosted at a GitHub Pages subpath. Local dev works at the root, but built assets assume the `/QRP-dgby/` prefix. Don't hardcode absolute asset paths.

`GEMINI_API_KEY` is wired into `define` (exposed as `process.env.API_KEY`/`process.env.GEMINI_API_KEY`) as a leftover from the AI Studio scaffold, but no runtime code currently consumes it.

## Architecture

This is a client-only React 19 + TypeScript + Vite app (no backend, no router). It generates animated SVG "Quantum Resonance Pattern" mandalas driven by numeric sequences, and exports them as PNG or MP4. The app entry is `index.tsx` → root `App.tsx`. Note: there is also a `components/App.tsx`; the live entry is the **root** `App.tsx`.

### Core data model (`types.ts`)
- `GeoConfig` — the full set of geometry/frame/style parameters for one visualization. This is the central object everything revolves around.
- `Sequence` — `{ id, name, description?, data: number[], geoConfig }`. Each sequence carries its **own** `GeoConfig`. There is no single global config; the "active" sequence's `geoConfig` is what the UI edits.

### State flow
- `hooks/useSequencer.ts` is the single source of truth for the sequence collection, `activeIndex`, `isPlaying`, and `timingMs`. Playback is a `setInterval` that advances `activeIndex` every `timingMs`. All add/duplicate/delete/reorder/resize/import logic lives here. New sequences clone the active sequence's `geoConfig` for continuity.
- `App.tsx` wires the sequencer to the UI. Editing geometry calls `handleGeoConfigChange`, which detects `sequenceLength` changes and calls `resizeSequence` (pad with zeros / trim) before updating the active sequence's config.
- `hooks/useTheme.ts` manages dark mode (Tailwind `dark:` classes; Tailwind is loaded via CDN in `index.html`).

### Rendering (`components/QRPGenerator.tsx` + `utils/geometry.ts`)
`QRPGenerator` is the pure SVG renderer. It takes a `sequence: number[]` plus a spread `GeoConfig` (props default individually, so it's safe to pass a partial). All shape math is in `utils/geometry.ts`, which builds SVG path strings via polar→cartesian helpers:
- `generateSunflowerPoints` / `generateSunflowerLobePath` — phyllotaxis seed packing (golden angle).
- `createScallopedHull` — sunflower outer hull.
- `createLotusPetals` — individually-stroked lotus petals (heavy bezier control-point math).
- `createMandalaHull` — angular "dharma gate" T-shapes.

`lobeType` (`sunflower`/`dharma`/`lotus`) selects the hull; `lobeDesign`/`centerDesign` (`seeds`/`celtic`/`triskelion`/`uranus`) select the fill motif. Motif paths come from `assets/shapes.ts` and `components/planets/UranusGeometry.tsx`. Presets (`SUNFLOWER_PRESET`, `DHARMA_PRESET`, `LOTUS_PRESET`) live in `constants.ts`.

### Share/persistence (`utils/compression.ts`)
Configs are shareable via a `?c=` URL param (base64 of JSON). The format is **versioned (current v4)** with a decoder for v1–v4 — keep all legacy branches working when changing the schema:
- Long `GeoConfig` keys are minified to single letters via `GEO_KEY_MAP`.
- v4 uses **diff inheritance**: a global geo is stored as a diff against `SUNFLOWER_PRESET`, and each sequence stores only its diff against that global base (usually empty). When adding a `GeoConfig` field, you MUST add it to `GEO_KEY_MAP` or it won't serialize.
- Loading a URL with `?c=` puts the app into view-only/fullscreen autoplay mode (see the mount `useEffect` in `App.tsx`).

### Export
- PNG: `utils/png.ts` implements CRC32 + PNG chunk writing to embed the config JSON as metadata directly in exported PNGs (so a PNG can be re-imported). Export rendering uses a hidden high-res container.
- MP4: `hooks/useVideoExport.ts` is the active path — fixed 30fps, renders N frames per scene to a canvas via a `renderFrame` callback, encodes with **mediabunny** (WebCodecs, H.264 preferred). `utils/video.ts` is an earlier standalone attempt with a placeholder render loop and is **not** the live implementation. See `docs/mp4-export-analysis.md` for background.

### UI components
`components/` holds the panels (`Header`, `GeometryTuner`, `SequenceManager`, `SequenceEditor`, `PlaybackControls`, `VisualizerStage`, `FullScreenOverlay`, `ImportModal`, `VideoExportModal`). Reusable primitives are in `components/ui/` (`Accordion`, `SliderControl`) and tuner sections in `components/tuner/`. Icons are `lucide-react`.
