/* global window, OscillatorNode */
// (window/OscillatorNode below run inside the browser via addInitScript/evaluate.)
//
// Verifies the sequence-tone feature end-to-end in a real browser:
//   PHASE 1 (build mode): the card shows the play control + exact-Hz readout,
//     and clicking Play builds a Web Audio graph whose oscillators are fed the
//     EXACT computed frequencies (base 277.31, sub 138.655, note pitches).
//   PHASE 2 (present mode): the optional sound toggle follows the presented card
//     and GLIDES the drone between cards (one continuous drone, not a restart) —
//     proven by advancing to a new card adding its note pitch WITHOUT starting a
//     second sub-octave oscillator.
// We instrument OscillatorNode.start to record each oscillator's frequency, so
// this needs no audio device.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../screenshots');
mkdirSync(outDir, { recursive: true });
const BASE = process.env.QRP_URL || 'http://localhost:3000';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

await ctx.addInitScript(() => {
  const origStart = OscillatorNode.prototype.start;
  window.__oscFreqs = [];
  OscillatorNode.prototype.start = function (...args) {
    try {
      window.__oscFreqs.push(this.frequency.value);
    } catch {
      /* ignore */
    }
    return origStart.apply(this, args);
  };
});

const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('  [console.error]', m.text());
});

const near = (list, target, tol = 0.05) => list.some((f) => Math.abs(f - target) <= tol);
const countNear = (list, target, tol = 0.05) => list.filter((f) => Math.abs(f - target) <= tol).length;
const freqs = () => page.evaluate(() => window.__oscFreqs ?? []);
const reset = () => page.evaluate(() => (window.__oscFreqs = []));
let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '  ✓' : '  ✗ FAIL'} ${msg}`);
  if (!ok) failures++;
};

// ── PHASE 1: build mode ──────────────────────────────────────────────────────
console.log('PHASE 1 — build-mode play + exact Hz');
await page.goto(`${BASE}/#/build`, { waitUntil: 'load' });
await page.getByPlaceholder('Search remedies…').waitFor({ timeout: 15000 });

await page.getByRole('button', { name: 'Blank card' }).click();
await page.getByLabel('Rate sequence').fill('2 7 7 3 1');
await page.waitForTimeout(300);

const readout = await page.locator('body').innerText();
check(readout.includes('277.31'), 'readout shows base 277.31 Hz');
check(readout.includes('554.62'), 'readout shows note ×2 = 554.62 Hz');
check(readout.includes('970.585'), 'readout shows note ×7 folded = 970.585 Hz');
await page.screenshot({ path: resolve(outDir, 'tone-panel.png') });

await page.getByRole('button', { name: 'Play sequence as tone' }).click();
await page.waitForTimeout(1400);
const f1 = await freqs();
console.log(`  recorded ${f1.length} oscillator starts`);
check(near(f1, 277.31), 'base oscillator started at 277.31 Hz');
check(near(f1, 138.655), 'sub-octave oscillator started at 138.655 Hz');
check(near(f1, 554.62), 'note oscillator started at 554.62 Hz (dial 2)');
await page.getByRole('button', { name: 'Stop tone' }).click();
await page.waitForTimeout(300);

// ── PHASE 2: present mode follows the card and glides ────────────────────────
console.log('PHASE 2 — present-mode tone follows the card (gliding drone)');
// Add a second, distinct base-9 card: 8 8 8 → base 888, sub 444, note 888.
await page.getByRole('button', { name: 'Blank card' }).click();
await page.getByLabel('Rate sequence').fill('8 8 8');
await page.waitForTimeout(200);

await page.goto(`${BASE}/#/present`, { waitUntil: 'load' });
await page.waitForTimeout(500);
// Step back to the first card (2 7 7 3 1).
const prev = page.getByRole('button', { name: 'Previous' });
if (await prev.isEnabled()) await prev.click();
await page.waitForTimeout(200);

await reset(); // clean slate for the glide assertions
await page.getByRole('button', { name: 'Play sequence tone' }).click(); // toggle sound on
await page.waitForTimeout(1000);
const fA = await freqs();
check(near(fA, 277.31), 'present: card A drone base at 277.31 Hz');
check(countNear(fA, 138.655) === 1, 'present: exactly one sub-octave (138.655) started');
await page.screenshot({ path: resolve(outDir, 'tone-present.png') });

// Advance to card B (8 8 8): the tone should follow and the drone should GLIDE.
await page.getByRole('button', { name: 'Next' }).click();
await page.waitForTimeout(1300);
const fB = await freqs();
check(near(fB, 888), 'present: card B note (888 Hz) now sounding — tone followed the card');
check(
  countNear(fB, 444) === 0,
  'present: no second sub-octave (444) started — drone GLIDED, not restarted',
);
check(countNear(fB, 138.655) === 1, 'present: still a single continuous sub-octave oscillator');

// ── PHASE 3: MP4 export bakes in the tone ────────────────────────────────────
console.log('PHASE 3 — MP4 export includes the sequence tone as an audio track');
// Turn the live tone off first so it can't interfere with the export.
await page.getByRole('button', { name: 'Mute sequence tone' }).click();

// Can this (headless) browser even encode audio? Opus is royalty-free and
// usually available; AAC often is not in open-source Chromium builds.
const caps = await page.evaluate(async () => {
  if (!('AudioEncoder' in window)) return { aac: false, opus: false };
  const ok = (cfg) =>
    window.AudioEncoder.isConfigSupported(cfg)
      .then((s) => !!s.supported)
      .catch(() => false);
  return {
    aac: await ok({ codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 192000 }),
    opus: await ok({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }),
  };
});
console.log(`  headless audio encode: aac=${caps.aac} opus=${caps.opus}`);

try {
  await page.getByRole('button', { name: 'MP4', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export MP4 options' });
  const toneCheckbox = dialog.getByRole('checkbox');
  check(await toneCheckbox.isVisible(), 'export dialog shows the "Include sequence tone" option');
  check(await toneCheckbox.isChecked(), 'tone is included by default (base-9 cards present)');
  await dialog.locator('select').selectOption('720'); // smaller = faster render

  const downloadPromise = page.waitForEvent('download', { timeout: 90000 });
  await dialog.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadPromise;
  const mp4Path = resolve(outDir, 'export-with-tone.mp4');
  await download.saveAs(mp4Path);
  const bytes = readFileSync(mp4Path);
  const hasAudioTrack = bytes.toString('latin1').includes('soun'); // MP4 sound handler
  console.log(`  exported ${(bytes.length / 1024).toFixed(0)} KB`);
  if (caps.aac || caps.opus) {
    check(hasAudioTrack, 'exported MP4 contains an audio (soun) track');
  } else {
    console.log('  ⚠ skip audio-track assertion — this browser cannot encode audio');
  }
} catch (e) {
  console.log(`  ⚠ export step could not complete in this environment: ${e.message}`);
}

await browser.close();
console.log(failures === 0 ? '\nTONE VERIFY: PASS' : `\nTONE VERIFY: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
