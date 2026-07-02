// ⚠️ RETIRED / DESTRUCTIVE — do not use. Superseded by afdesign/apply-catalog.mjs
// (which `npm run build:packs` now runs). This legacy script WIPES public/packs/
// (rmSync) and rebuilds ONLY the old QRP-dgby prototype packs, destroying the
// afdesign v2 catalog. Kept for reference only; it refuses to run without --force.
if (!process.argv.includes('--force')) {
  console.error('build-packs.legacy.mjs is retired and destructive. It would WIPE public/packs/.\n' +
    'Use `npm run build:packs` (apply-catalog) instead. Pass --force only if you truly mean to rebuild the old prototype packs.');
  process.exit(1);
}

// Card-pack build pipeline.
//
// For the first packs we REUSE the prototype's already-baked light/dark WebP and
// OCR-extracted rates (../../../QRP-dgby/public/library), converting each
// card-kind category into a versioned per-pack bundle in public/packs/:
//
//   public/packs/index.json                      (PackIndex — tiny, loaded at startup)
//   public/packs/<pack>-v1/manifest.json         (PackManifest — fetched on demand)
//   public/packs/<pack>-v1/search.json           (prebuilt MiniSearch index)
//   public/packs/<pack>-v1/img/<slug>.webp(.dark)
//
// Output is gitignored and rebuilt here (or in CI before deploy). A future
// from-raw-JPEG path (sharp WebP bake + tesseract OCR) plugs in alongside this
// converter without changing the output format.
//
//   node scripts/pipeline/build-packs.mjs
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import MiniSearch from 'minisearch';

const here = dirname(fileURLToPath(import.meta.url));
const SRC_LIBRARY = resolve(here, '../../../QRP-dgby/public/library');
const OUT_PACKS = resolve(here, '../../public/packs');

const RATE_BASES = new Set([9, 10, 44]);
const coerceBase = (b) => (RATE_BASES.has(b) ? b : 44);
const slugOf = (cardId) => cardId.split('/').slice(1).join('/') || cardId;

function buildSearchIndex(remedies) {
  const ms = new MiniSearch({
    idField: 'id',
    fields: ['name', 'subheading', 'category', 'rateType'],
    storeFields: ['name', 'category'],
  });
  ms.addAll(remedies);
  return JSON.stringify(ms);
}

function main() {
  if (!existsSync(SRC_LIBRARY)) {
    throw new Error(`Source library not found at ${SRC_LIBRARY} (prototype baked assets).`);
  }
  const manifest = JSON.parse(readFileSync(resolve(SRC_LIBRARY, 'manifest.json'), 'utf8'));

  rmSync(OUT_PACKS, { recursive: true, force: true });
  mkdirSync(OUT_PACKS, { recursive: true });

  const summaries = [];

  for (const category of manifest.categories) {
    if (category.kind !== 'card') continue; // center mandalas handled as style assets later
    const packId = `${category.id}-v1`;
    const packDir = resolve(OUT_PACKS, packId);
    const imgDir = resolve(packDir, 'img');
    mkdirSync(imgDir, { recursive: true });

    const remedies = [];
    for (const card of category.cards) {
      const slug = slugOf(card.id);
      // Copy baked WebP layers into the pack.
      const lightSrc = resolve(SRC_LIBRARY, '..', card.file);
      const lightOut = `img/${slug}.webp`;
      if (existsSync(lightSrc)) copyFileSync(lightSrc, resolve(packDir, lightOut));
      let darkOut;
      if (card.fileDark) {
        const darkSrc = resolve(SRC_LIBRARY, '..', card.fileDark);
        if (existsSync(darkSrc)) {
          darkOut = `img/${slug}.dark.webp`;
          copyFileSync(darkSrc, resolve(packDir, darkOut));
        }
      }

      const remedy = {
        id: slug,
        name: card.name,
        category: category.id,
        base: coerceBase(card.base),
        sequence: Array.isArray(card.sequence) ? card.sequence : [],
      };
      if (card.subheading) remedy.subheading = card.subheading;
      if (card.rateType) remedy.rateType = card.rateType;
      if (existsSync(resolve(packDir, lightOut))) {
        remedy.image = darkOut ? { light: lightOut, dark: darkOut } : { light: lightOut };
      }
      remedies.push(remedy);
    }

    const packManifest = {
      id: packId,
      name: category.label,
      version: '1',
      taxonomy: [{ id: category.id, label: category.label }],
      remedies,
    };
    writeFileSync(resolve(packDir, 'manifest.json'), JSON.stringify(packManifest, null, 2) + '\n');

    // Prebuilt search index (search.json). Runtime can loadJSON it for scale.
    const indexable = remedies.map((r) => ({ ...r, id: `${packId}:${r.id}` }));
    writeFileSync(resolve(packDir, 'search.json'), buildSearchIndex(indexable) + '\n');

    summaries.push({
      id: packId,
      name: category.label,
      version: '1',
      count: remedies.length,
      categories: [category.id],
      manifestUrl: `packs/${packId}/manifest.json`,
      searchIndexUrl: `packs/${packId}/search.json`,
    });
    console.log(`  ${packId}: ${remedies.length} remedies`);
  }

  const index = { generatedAt: new Date().toISOString(), packs: summaries };
  writeFileSync(resolve(OUT_PACKS, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  console.log(`Built ${summaries.length} packs -> ${OUT_PACKS}`);
}

main();
