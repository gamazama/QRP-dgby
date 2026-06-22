// One-off: capture the PROTOTYPE's geometry output as a golden fixture, so the
// engine's golden test can assert byte-for-byte parity without pulling the
// prototype into the TypeScript program. Re-run only if the case set changes.
//
//   node scripts/capture-geometry-golden.mjs
//
// Relies on Node 23.6+ type stripping to import the prototype's .ts directly.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as proto from '../../QRP-dgby/utils/geometry.ts';

const here = dirname(fileURLToPath(import.meta.url));
const casesPath = resolve(here, '../tests/golden/geometry-cases.json');
const outPath = resolve(here, '../tests/golden/geometry.golden.json');

const cases = JSON.parse(readFileSync(casesPath, 'utf8'));

const fns = {
  polarToCartesian: proto.polarToCartesian,
  generateSunflowerPoints: proto.generateSunflowerPoints,
  generateSunflowerLobePath: proto.generateSunflowerLobePath,
  createScallopedHull: proto.createScallopedHull,
  createLotusPetals: proto.createLotusPetals,
  createMandalaHull: proto.createMandalaHull,
};

const golden = {};
for (const [name, argsList] of Object.entries(cases)) {
  const fn = fns[name];
  if (!fn) throw new Error(`No prototype function named ${name}`);
  golden[name] = argsList.map((args) => fn(...args));
}

writeFileSync(outPath, JSON.stringify(golden, null, 2) + '\n');
console.log(`Wrote ${golden ? Object.keys(golden).length : 0} function groups -> ${outPath}`);
