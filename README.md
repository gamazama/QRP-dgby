# QRP

A client-only React + TypeScript + Vite app for radionics practitioners: search a
remedy database, build a patient sequence of mandala "cards" in reusable styles, and
present/export them. Local-first (IndexedDB) and backend-ready (all data access goes
through repository interfaces).

This is the from-scratch rebuild of the prototype in `../QRP-dgby`. See the architecture
and phased build plan in the approved plan document.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run test` | Vitest (unit / golden / contract) |
| `npm run test:e2e` | Playwright smoke e2e |
| `npm run ci` | typecheck + lint + test |

## Structure

- `src/engine/` — pure, React-free render core (geometry → SVG layer model). The visual identity.
- `src/domain/` — framework-free types: Style, Remedy, Pack, Card, Sequence, Session.
- `src/data/` — repository interfaces + local (IndexedDB/static-fetch) implementations.
- `src/store/` — Zustand UI/playback state.
- `src/render/` — React rendering of engine output (`CardSurface`, crossfade, thumbnails).
- `src/features/` — clinical screens (build, remedy-search, styles, present, export).
- `scripts/pipeline/` — offline card-pack build (sharp WebP bake + OCR + search/index).

Deploy base path is env-driven via `QRP_BASE` (see `.env.example`).
