# Cards Batch 2 — openability & conversion assessment

Source: `H:\QRP-Digby\assets\Cards Batch 2\2026 Radionic Cards`
Origin: macOS ("Quantum Light Pattern" / "QLP" project, Christene's drive). All the
`._*` and `.DS_Store` files are Mac metadata junk — ignore/strip them.

## What's in the batch
| Type | Count | Openable? |
|---|---|---|
| `.jpg` | 741 | ✅ trivially. Rasterized card exports, ~756×886 px |
| `.png` | 37 | ✅ trivially |
| `.afdesign` | 391 | ❌ not by normal tools — Affinity Designer native format |
| `.xlsx` | 1 | ✅ master rate table (Command set only) |
| `.pages` | 1 | Apple Pages doc (Human Physiology) |

Normalized (dedup " copy N", punctuation, case):
- **368** unique afdesign cards, **703** unique raster cards.
- **109** afdesign have a JPG/PNG twin; **259 afdesign have NO raster twin** → those
  only exist as Affinity source.

## The `.afdesign` format (cracked)
- Magic `00 FF 4B 41`; body is a chunk container with **Zstandard-compressed** chunks
  (`28 B5 2F FD`). Node 24 has built-in zstd (`zlib.zstdDecompressSync`), so **no
  Affinity install and no third-party lib is needed** to read them.
- Per file we can extract, programmatically:
  1. **Live text — accurately, no OCR:** heading (e.g. `ANGER`), category (`Emotions`),
     rate label (`Base 9 Rate (336 - Combe)`). Also the original Mac file paths.
  2. **Embedded raster assets** as PNG/JPEG at full res: the frame border (1414×2000),
     logos (BC/QLP), any placed images.
  3. A **436×512 composite preview** — confirmed too small for OCR; not needed.
- The center **mandala + radionic ticks are vector geometry**, not a raster. So there is
  no "centre PNG" to lift for ring-type cards — that art is *regenerated from the rate*.

## The card data model (from the Command xlsx)
Each card row: `NAME | base-9/10 (5 ring vals) | base-44 (5 vals 1–44) | GPR (6 digits)`
e.g. `GIVE BIRTH FULL TERM | 1 2 2 3 3 | 03 06 09 12 12 | 5 7 8 2 4 8`

Same substance, three rate encodings → matches the folder split (Base 9 (336) / Base 10
/ Base 44 / Number-GPR). On the ring-design ("BC"/Combe) cards the rate is drawn as tick
marks on 9 concentric rings — **not printed as digits**.

**Filenames already encode name + category + design + base**, e.g.
`Anger - Emotions - BC - Base 9 (336)`. A few even embed the rate
(`ajna chakra 9 2 9 4 9 6 base 9 336`). So metadata is nearly free; the only genuinely
hard-to-recover field is the **numeric rate sequence** for non-Command ring cards.

## Where the rate sequence can come from (reliability order)
1. **xlsx / source rate tables** — exact, trivial. Present for Command only today.
2. **Parse afdesign vector ticks** — exact, but real reverse-engineering of Affinity's
   object model.
3. **CV tick-detection on the JPGs** — works everywhere, but noisy/approximate.

## CONFIRMED by the user
- No more rate tables — cards were traced from the printed book *Combe Radionic Rates*.
- **On every card, the rate drawn in vector is ALSO present as text** → extractable
  directly, no tick-geometry parsing / no CV. VERIFIED: `find-rate.mjs` pulls a clean
  rate per card; on `HEART - Chakra - Base 44` it gives `05 29 33 44 44` = exactly the 5
  visible tick positions on the 44-division ring.
- The centre mandala is already regenerated in the app → we do NOT extract it.
- Goal: add all cards to **QRP v2** (`H:\QRP-Digby\qrp`) library, natively (as data) +
  a small reference image to eyeball against.

## Target = QRP v2 pack manifest (exact schema)
`qrp/public/packs/<pack-id>/manifest.json`:
```json
{ "id":"chakras-v1","name":"Chakras","version":"1",
  "taxonomy":[{"id":"chakras","label":"Chakras"}],
  "remedies":[{ "id":"ajna-chakra","name":"Ajna Chakra","category":"chakras",
    "base":44,"sequence":[5,25,33,44],"subheading":"Chakra",
    "rateType":"Base 44 Rate (Combe)",
    "image":{"light":"img/ajna-chakra.webp","dark":"img/ajna-chakra.dark.webp"} }] }
```
Every field maps 1:1 to what we can extract:
| manifest field | source |
|---|---|
| name / category / base | filename (`Anger - Emotions - BC - Base 9 (336)`) + folder |
| subheading / rateType | afdesign text (`Base 9 Rate (336 - Combe)`) |
| sequence | afdesign rate text, validated vs base (44→vals≤44, etc.) |
| image.light | JPG twin (756×886) if present, else embedded 436×512 preview → webp |
| image.dark | generated (invert line art) |

Existing packs already use `rateType:"Base 44 Rate (Combe)"` / `"Sulis Rates"` — same
strings we extract → this batch is more of the same library. Existing chakras/gems packs
give a **gold cross-check**: re-extract those same cards and diff sequences.

## Recommended build (Node utility, no deps beyond sharp already in QRP-dgby)
Probe scripts already here: `scan-af.mjs`, `extract-imgs.mjs`, `decomp2/3.mjs`,
`find-rate.mjs`, `batch-probe.mjs`. Fold into one `af-to-pack.mjs` that per card emits
the remedy record + reference webp, groups into packs, and writes a **review CSV**
flagging: empty rate (template/symbol cards), multi-run ambiguity, out-of-range values,
missing JPG twin. (Mirrors batch-1's `extract-card-data.mjs` flag-for-hand-check flow.)

## Open decisions (need user input)
1. **Pack mapping.** Folders like `Subtle Bodies`, `Emotions`, `Mind`, `Sacred
   Geometry`, `Body/Physiology` — new packs, or fold into existing
   (chakras/gems/other)? And the `…to sort` folders (`All subtle to sort`,
   `Mind All to sort`) — real cards or staging bins?
2. **Dedup.** 259 afdesign lack a raster twin; many `copy N` duplicates. Keep one per
   normalized name? Prefer afdesign (has rate text) over JPG-only?
3. **Reference image.** Confirm: JPG twin where present (sharper) else embedded preview,
   both → webp light + generated dark.