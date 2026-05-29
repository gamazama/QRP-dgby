# Full-App Context Load Protocol

Procedure for loading the **entire QRP-Digby app** into context (a fresh session, a
review, or any "read the whole thing" task). Loads logic/UI/config/docs and deliberately
skips dependencies, build output, lockfiles, and raw SVG vector data.

**Cost of the full load set:** ~39 files · ~6,000 lines · ~240 KB · **~63K tokens**
(~3–6% of a 1M window). Adding the omitted SVGs would roughly double that for zero
logic gain — don't.

---

## Load these (the app)

```
App.tsx
index.tsx
types.ts
constants.ts
metadata.json
index.html
vite.config.ts
vite-env.d.ts
tsconfig.json
package.json
README.md
CLAUDE.md
src/styles.css
assets/shapes.ts                      # NOTE: ~3KB is opaque inline SVG path data — logic value is just the exports
scripts/build-library.mjs             # Offline asset pipeline: optimizes ../../assets JPEGs -> public/library/*.webp + manifest.json
utils/library.ts                      # Loads public/library/manifest.json; resolves card URLs under BASE_URL
components/QRPGenerator.tsx
components/SequenceManager.tsx
components/SequenceEditor.tsx
components/LibraryModal.tsx
components/VideoExportModal.tsx
components/ImportModal.tsx
components/Header.tsx
components/VisualizerStage.tsx
components/GeometryTuner.tsx
components/FullScreenOverlay.tsx
components/PlaybackControls.tsx
components/tuner/TunerSections.tsx
components/tuner/PresetSelector.tsx
components/ui/SliderControl.tsx
components/ui/Toast.tsx
components/ui/Accordion.tsx
components/icons/LobeIcons.tsx
components/planets/UranusGeometry.tsx
hooks/useSequencer.ts
hooks/useVideoExport.ts
hooks/useTheme.ts
utils/geometry.ts
utils/compression.ts
utils/png.ts
docs/mp4-export-analysis.md
```

## Omit these (derived / vendored / raw data)

| Path | Why |
|---|---|
| `node_modules/**` | Dependencies, not our code |
| `package-lock.json` | Lockfile, fully derived |
| `dist/**` | Minified build output, derived from source |
| `public/library/**` | Generated WebP cards + `manifest.json` (regenerate via `npm run build:library`); bundled at deploy, not hand-edited |
| `planets/uranus.svg` | 289 KB of raw vector data (~76K tokens alone); injected via `?raw`, no logic |
| `celtic.svg`, `triskelion.svg` | Not imported — live paths are inlined in `assets/shapes.ts` |
| `.gitignore`, `.noignore`, `.claude/settings.json` | Tooling/env noise |

---

## One-shot load command

Run from the `QRP-dgby/` directory. Dumps every load-set file with a header banner,
so the whole app can be read in one pass:

```bash
find . -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.json' \
     -o -name '*.md' -o -name '*.html' \) \
  -not -path './node_modules/*' \
  -not -path './dist/*' \
  -not -path './.claude/*' \
  -not -name 'package-lock.json' \
  | sort \
  | while read -r f; do printf '\n===== %s =====\n' "$f"; cat "$f"; done
```

(`*.svg` is excluded by the extension filter, which already drops `uranus.svg`,
`celtic.svg`, and `triskelion.svg`. `.gitignore`/`.noignore` are excluded by the
extension filter too. This doc itself, `docs/full-context-load.md`, is included in
the set — harmless and self-documenting.)

### Recompute the cost any time

```bash
find . -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.json' \
     -o -name '*.md' -o -name '*.html' \) \
  -not -path './node_modules/*' -not -path './dist/*' -not -path './.claude/*' \
  -not -name 'package-lock.json' \
  -exec wc -lc {} + | tail -1
```

Token estimate ≈ total bytes ÷ 3.8 (TS/TSX tokenizes at ~3.5–4 chars/token).
