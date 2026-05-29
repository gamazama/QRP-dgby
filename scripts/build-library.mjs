// Build the curated resource library: optimize the source rate-card JPEGs in
// ../../assets into web-friendly WebP, organize them into categories, de-dupe,
// and emit public/library/manifest.json for the in-app Library browser.
//
// Run with: npm run build:library  (regenerates public/library/** + manifest)
// Source assets live OUTSIDE the app dir and are not needed at deploy time —
// the generated public/library/** is what ships.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, '../../assets');
const OUT_DIR = path.resolve(__dirname, '../public/library');
const MAX_EDGE = 900;
const WEBP_QUALITY = 80;

// ---- Category definitions (id, label, kind). Fixed display order. ----
const CATEGORIES = [
  { id: 'bach-flowers', label: 'Bach Flowers', kind: 'card' },
  { id: 'astrological', label: 'Astrological', kind: 'card' },
  { id: 'chakras', label: 'Chakras', kind: 'card' },
  { id: 'chakra-mandalas', label: 'Chakra Mandalas', kind: 'center' },
  { id: 'gems', label: 'Gems', kind: 'card' },
  { id: 'homeopathic', label: 'Homeopathic', kind: 'card' },
  { id: 'other', label: 'Other', kind: 'card' },
];

// Decide a card's category from its folder + filename.
function classify(relPath, base) {
  const p = relPath.toLowerCase();
  const b = base.toLowerCase();
  if (/chakramandala/i.test(base)) return 'chakra-mandalas';
  if (b.includes('chakra')) return 'chakras';
  if (b.includes('bach') || /f\.e\s*\(flowers\)/i.test(base)) return 'bach-flowers';
  if (b.includes('septenate') || b.includes('astrological')) return 'astrological';
  if (p.includes('gems.jpeg') || /\bgem(stone)?\b/i.test(base) || /gem b1?0/i.test(base))
    return 'gems';
  if (b.includes('homeopathic') || /arsen\s*iod/i.test(base)) return 'homeopathic';
  return 'other';
}

// Title-case each word (capitalize the first letter, including after "("),
// lowercasing the rest. Good enough for these card names.
function titleCase(s) {
  return s
    .toLowerCase()
    .replace(/(^|[\s(])([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());
}

// Turn a raw filename (no extension) into a clean display name.
function cleanName(base, categoryId) {
  if (categoryId === 'chakra-mandalas') {
    // "ChakraMandala_1-Muladhara copy" -> "Muladhara"
    let n = base.replace(/^chakramandala[_\s]*\d*\s*[-_]?\s*/i, '');
    n = n.replace(/\s*copy\s*\d*$/i, '');
    return titleCase(n.trim());
  }

  const isSulis = /sulis/i.test(base);

  // Take the part before the first " - " (the real name in almost every file),
  // then strip residual noise tokens / rate codes anywhere in it.
  let name = base.split(' - ')[0];
  name = name
    .replace(/septenate_?/gi, '')
    .replace(/astrological sign( elements)?/gi, '')
    .replace(/subtle body/gi, '')
    .replace(/homeopathic/gi, '')
    .replace(/bach(\s+flowers?)?/gi, '')
    .replace(/f\.e\.?\s*\(flowers\)/gi, '')
    .replace(/gemstone|gem/gi, '')
    .replace(/\bsulis\b/gi, '')
    .replace(/\bmix\b/gi, '')
    .replace(/\belements\b/gi, '')
    .replace(/\(336\)/g, '')
    .replace(/base\s*\d+/gi, '')
    .replace(/\bb\s*\d+\b/gi, '') // B44 / B10 / B9 / b44
    .replace(/chakra-\s*[a-z]+/gi, 'Chakra') // "Chakra- FIRE" (glued element) -> "Chakra"
    .replace(/\bjpe?g\b/gi, '')
    .replace(/\bcard\b/gi, '')
    .replace(/\bcopy\b\s*\d*/gi, '')
    .replace(/[_]+/g, ' ')
    .replace(/[-\s]+$/g, '') // trailing dashes/space
    .replace(/^[-\s]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!name) name = base.replace(/[_-]+/g, ' ').trim();
  name = titleCase(name);

  // Disambiguate same-named chakras across rate systems.
  if (categoryId === 'chakras' && isSulis && !/sulis/i.test(name)) {
    name += ' (SULIS)';
  }
  return name;
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// ---- Line-art layer baking (card kind) -------------------------------------
// Rate cards are black line art on white, with a photo. We bake two transparent
// layers so the app can drop the white paper, invert the line art per theme, and
// keep the photo opaque + in colour:
//   light: black ink (alpha = darkness) for paper/lines, photo region as-is
//   dark : white ink (alpha = darkness) for paper/lines, photo region as-is
// The photo is detected as a REGION, not by colour: it's the only THICK solid
// non-white area. Opening erodes thin lines/text/rings away but keeps the solid
// photo; a close unifies any pieces split by light areas; then we fill the
// blob's CONVEX HULL. The hull is the key trick: for a photo that fills its
// circular frame the hull ≈ that circle (so ragged light edges are rescued
// cleanly), while for a small floating object (e.g. a gem on white) the hull
// hugs the object (no white disc), and an empty card yields no blob at all.

const PAPER_L = 224;        // luminance at/above this is white paper
const CHROMA_THRESH = 28;   // coloured pixels are non-paper even when light
const OPEN_R = 4;           // opening radius: erodes thin strokes, keeps the photo
const CLOSE_R = 14;         // close radius: reunify photo pieces split by light areas
const CIRCLE_PAD = 3;       // grow the circle slightly past the content extent
const MIN_PHOTO_FRAC = 0.004; // ignore solid blobs smaller than 0.4% of the image

function dilate(src, w, h, r) {
  const tmp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx >= 0 && xx < w && src[row + xx]) { v = 1; break; } }
      tmp[row + x] = v;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dy = -r; dy <= r; dy++) { const yy = y + dy; if (yy >= 0 && yy < h && tmp[yy * w + x]) { v = 1; break; } }
      out[y * w + x] = v;
    }
  }
  return out;
}

function erode(src, w, h, r) {
  const inv = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) inv[i] = src[i] ? 0 : 1;
  const d = dilate(inv, w, h, r);
  for (let i = 0; i < d.length; i++) d[i] = d[i] ? 0 : 1;
  return d;
}

const close = (src, w, h, r) => erode(dilate(src, w, h, r), w, h, r);

function fillHoles(mask, w, h) {
  const seen = new Uint8Array(mask.length);
  const st = [];
  const push = (idx) => { if (!mask[idx] && !seen[idx]) { seen[idx] = 1; st.push(idx); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (st.length) {
    const i = st.pop();
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  for (let i = 0; i < mask.length; i++) if (!mask[i] && !seen[i]) mask[i] = 1;
}

function removeSmallComponents(mask, w, h, minArea) {
  const seen = new Uint8Array(mask.length);
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || seen[s]) continue;
    const comp = [s];
    const st = [s];
    seen[s] = 1;
    while (st.length) {
      const i = st.pop();
      const x = i % w, y = (i / w) | 0;
      const nb = [];
      if (x > 0) nb.push(i - 1);
      if (x < w - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - w);
      if (y < h - 1) nb.push(i + w);
      for (const j of nb) if (mask[j] && !seen[j]) { seen[j] = 1; st.push(j); comp.push(j); }
    }
    if (comp.length < minArea) for (const i of comp) mask[i] = 0;
  }
}

// Rasterize a filled circle into `out` (Uint8Array, set to 1 inside).
function fillCircle(out, w, h, cx, cy, r) {
  const r2 = r * r;
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(h - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy;
    const span = Math.sqrt(Math.max(0, r2 - dy * dy));
    const x0 = Math.max(0, Math.ceil(cx - span));
    const x1 = Math.min(w - 1, Math.floor(cx + span));
    for (let x = x0; x <= x1; x++) out[y * w + x] = 1;
  }
}

async function buildCardLayers(srcPath, outLight, outDark) {
  const { data, info } = await sharp(srcPath)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h } = info;
  const n = w * h;
  const darkness = new Uint8Array(n);
  const nonPaper = new Uint8Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    darkness[i] = Math.max(0, Math.min(255, Math.round(255 - L)));
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    // Anything that isn't near-white paper: dark ink, photo content, colour.
    nonPaper[i] = (L < PAPER_L || mx - mn > CHROMA_THRESH) ? 1 : 0;
  }

  // Isolate the photo region:
  //  1. open  (erode→dilate): removes thin strokes (frame, rings, text)
  //  2. close (dilate→erode): reunify photo pieces split by light areas
  //  3. drop sub-photo blobs (frame nubs, noise)
  //  4. cut a CIRCLE sized to the content's bounding box — the centre photo is
  //     always a clean disc (radius from the content extent), which rescues
  //     photos with light/white areas (Holly's cream flowers) that a tight
  //     content trace would leave wonky. Empty cards yield no content → no disc.
  let blob = dilate(erode(nonPaper, w, h, OPEN_R), w, h, OPEN_R);
  blob = erode(dilate(blob, w, h, CLOSE_R), w, h, CLOSE_R);
  removeSmallComponents(blob, w, h, Math.round(n * MIN_PHOTO_FRAC));

  let minX = w, maxX = -1, minY = h, maxY = -1, count = 0;
  for (let i = 0; i < n; i++) {
    if (!blob[i]) continue;
    const x = i % w, y = (i / w) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    count++;
  }

  const photo = new Uint8Array(n);
  if (count >= Math.round(n * MIN_PHOTO_FRAC)) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const r = Math.max(maxX - minX, maxY - minY) / 2 + CIRCLE_PAD;
    fillCircle(photo, w, h, cx, cy, r);
  }

  const light = Buffer.alloc(n * 4);
  const dark = Buffer.alloc(n * 4);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    if (photo[i]) {
      // Photo region: original colour, fully opaque, identical in both themes.
      light[p] = dark[p] = data[p];
      light[p + 1] = dark[p + 1] = data[p + 1];
      light[p + 2] = dark[p + 2] = data[p + 2];
      light[p + 3] = dark[p + 3] = 255;
    } else {
      // Paper/ink: uniform ink colour at alpha = darkness → matte-free edges.
      const a = darkness[i];
      light[p] = light[p + 1] = light[p + 2] = 0;     // black ink (light theme)
      dark[p] = dark[p + 1] = dark[p + 2] = 255;       // white ink (dark theme)
      light[p + 3] = dark[p + 3] = a;
    }
  }

  const opts = { quality: WEBP_QUALITY, alphaQuality: 92 };
  await sharp(light, { raw: { width: w, height: h, channels: 4 } }).webp(opts).toFile(outLight);
  await sharp(dark, { raw: { width: w, height: h, channels: 4 } }).webp(opts).toFile(outDark);
}

async function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`Source assets not found at ${ASSETS_DIR}`);
    process.exit(1);
  }

  const files = walk(ASSETS_DIR).filter((f) => /\.jpe?g$/i.test(f));

  // De-dupe by category+slug; keep the largest source file on collision.
  const picked = new Map(); // key -> { src, size, name, categoryId, slug }
  for (const src of files) {
    const rel = path.relative(ASSETS_DIR, src);
    const base = path.basename(src).replace(/\.[^.]+$/, '');
    const categoryId = classify(rel, base);
    const name = cleanName(base, categoryId);
    const slug = slugify(name);
    if (!slug) continue;
    const key = `${categoryId}/${slug}`;
    const size = fs.statSync(src).size;
    const prev = picked.get(key);
    if (!prev || size > prev.size) picked.set(key, { src, size, name, categoryId, slug });
  }

  // Fresh output dir.
  await fsp.rm(OUT_DIR, { recursive: true, force: true });
  await fsp.mkdir(OUT_DIR, { recursive: true });

  const kindOf = new Map(CATEGORIES.map((c) => [c.id, c.kind]));
  const byCat = new Map(CATEGORIES.map((c) => [c.id, []]));
  let count = 0;

  for (const { src, name, categoryId, slug } of picked.values()) {
    const catDir = path.join(OUT_DIR, categoryId);
    await fsp.mkdir(catDir, { recursive: true });
    const rel = (suffix) => `library/${categoryId}/${slug}${suffix}.webp`;

    if (kindOf.get(categoryId) === 'center') {
      // Center mandalas: keep a single opaque image (the app circular-crops it).
      await sharp(src)
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(path.join(catDir, `${slug}.webp`));
      byCat.get(categoryId).push({ id: `${categoryId}/${slug}`, name, file: rel('') });
    } else {
      // Cards: bake transparent light + dark line-art layers (photo preserved).
      await buildCardLayers(
        src,
        path.join(catDir, `${slug}.webp`),
        path.join(catDir, `${slug}.dark.webp`)
      );
      byCat.get(categoryId).push({
        id: `${categoryId}/${slug}`,
        name,
        file: rel(''),        // light layer (also used for the browser thumbnail)
        fileDark: rel('.dark'),
      });
    }
    count++;
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    categories: CATEGORIES.filter((c) => byCat.get(c.id).length > 0).map((c) => ({
      id: c.id,
      label: c.label,
      kind: c.kind,
      cards: byCat.get(c.id).sort((a, b) => a.name.localeCompare(b.name)),
    })),
  };

  await fsp.writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`Library built: ${count} cards across ${manifest.categories.length} categories`);
  for (const c of manifest.categories) console.log(`  ${c.label} (${c.kind}): ${c.cards.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
