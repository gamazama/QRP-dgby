// Visual QA driver: drives the running app with a headless browser and captures
// screenshots of each screen (light + dark, populated states) into screenshots/.
//   node scripts/screenshots.mjs            (expects dev server on :3000)
//   QRP_URL=http://localhost:4173 node scripts/screenshots.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../screenshots');
mkdirSync(outDir, { recursive: true });
const BASE = process.env.QRP_URL || 'http://localhost:3000';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') console.log('  [console.error]', m.text());
});
page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

const shot = async (name) => {
  await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage: false });
  console.log('shot', name);
};
const goto = async (hash) => {
  await page.goto(`${BASE}/#/${hash}`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
};

await goto('build');
await page.getByPlaceholder('Search remedies…').waitFor({ timeout: 15000 });
await page.waitForTimeout(800);
await shot('01-build-empty');

// Add a few rate cards.
await page.getByPlaceholder('Search remedies…').fill('a');
await page.waitForTimeout(700);
const results = page.locator('button[data-remedy]');
const count = Math.min(4, await results.count());
for (let i = 0; i < count; i++) {
  await results.nth(i).click();
  await page.waitForTimeout(150);
}
await page.waitForTimeout(600);
await shot('02-build-with-cards');

// Add an image card (toggle to Image then add one).
try {
  await page.getByRole('button', { name: 'Artwork', exact: true }).click();
  await page.waitForTimeout(200);
  await results.first().click();
  await page.waitForTimeout(900);
  await shot('03-build-image-card');
} catch (e) {
  console.log('  image-card step skipped:', e.message);
}

// Blank data card (shows base/steps + rate editor).
try {
  await page.getByRole('button', { name: 'Blank card' }).click();
  await page.waitForTimeout(500);
  await shot('09-data-card-editor');
} catch (e) {
  console.log('  data-card step skipped:', e.message);
}
// Transition card (shows transition editor).
try {
  await page.getByRole('button', { name: 'Transition' }).click();
  await page.waitForTimeout(500);
  await shot('10-transition-editor');
} catch (e) {
  console.log('  transition step skipped:', e.message);
}

await goto('library');
await page.waitForTimeout(1200);
await shot('04-library');

await goto('styles');
await page.waitForTimeout(1000);
await shot('05-styles');

await goto('present');
await page.waitForTimeout(1500);
await shot('06-present');

// Dark mode.
try {
  await page.getByLabel('Toggle theme').click();
  await page.waitForTimeout(700);
  await shot('07-present-dark');
  await goto('build');
  await page.waitForTimeout(800);
  await shot('08-build-dark');
} catch (e) {
  console.log('  dark-mode step skipped:', e.message);
}

await browser.close();
console.log('done ->', outDir);
