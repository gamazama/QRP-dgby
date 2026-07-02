# afdesign → library pipeline

Extracts radionics cards from `assets/Cards Batch 2` Affinity `.afdesign` files into
QRP v2 library packs. **`../catalog.json` is the durable, hand-refined source of truth**
(committed; `public/packs/` is gitignored + regenerable).

## Scripts
- `textobjs.mjs` — read an .afdesign: unzip its zstd chunks, pull the `+8ftU` UTF-8 text runs.
- `cardfields.mjs` — `extractCard()`: name / subheading / base / sequence / source / flags.
- `af-to-pack.mjs` — build one pack (manifest + search.json + light/dark/centre webp).
- `build-all.mjs` — classify all 391 cards → 8 `*-v2` packs (one card per pack).
- `patch-invert.mjs` — set `image.invert` per card by centre-fill (dark line-art inverts;
  photos/coloured symbols don't). Runs over ALL packs.
- `patch-source.mjs` — backfill `source` (Combe/Sulis) on legacy packs.
- `export-catalog.mjs` — consolidate all pack manifests → `../catalog.json`.
- `apply-catalog.mjs` — write `../catalog.json` back to the packs (manifest + search + index).

## Correct data (normal path)
`../catalog.json` is the curated source of truth (includes hand + vision-certified fixes).
Edit it (or a copy) → `node apply-catalog.mjs [copy.json]` → refresh the app.

## Re-extract from scratch (rarely)
```
node build-all.mjs && node patch-source.mjs && node patch-invert.mjs && node export-catalog.mjs
```
⚠️ This regenerates from the raw .afdesign files and **overwrites all curated corrections** in
`catalog.json`. Only do this for a fresh extract (e.g. new source cards); re-apply corrections
after. For everyday edits use `apply-catalog.mjs`, not this.

## `npm run build:packs`
Now runs `apply-catalog.mjs` (safe: writes manifests/search/index from `catalog.json`, leaves
images alone). The old destructive pipeline is retired at `../build-packs.legacy.mjs` and refuses
to run without `--force`.
