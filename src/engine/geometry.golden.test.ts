import { describe, expect, it } from 'vitest';
import * as eng from './geometry';
import cases from '../../tests/golden/geometry-cases.json';
import golden from '../../tests/golden/geometry.golden.json';

// Fidelity proof: the engine geometry must reproduce the PROTOTYPE's output
// byte-for-byte. golden.json was captured from the prototype's utils/geometry.ts
// (see scripts/capture-geometry-golden.mjs). This is the guard against visual
// regressions — the #1 rebuild risk.

type AnyFn = (...args: number[]) => unknown;

const fns: Record<string, AnyFn> = {
  polarToCartesian: eng.polarToCartesian as unknown as AnyFn,
  generateSunflowerPoints: eng.generateSunflowerPoints as unknown as AnyFn,
  generateSunflowerLobePath: eng.generateSunflowerLobePath as unknown as AnyFn,
  createScallopedHull: eng.createScallopedHull as unknown as AnyFn,
  createLotusPetals: eng.createLotusPetals as unknown as AnyFn,
  createMandalaHull: eng.createMandalaHull as unknown as AnyFn,
};

const caseMap = cases as Record<string, number[][]>;
const goldenMap = golden as Record<string, unknown[]>;

describe('engine geometry parity with prototype (golden)', () => {
  for (const name of Object.keys(goldenMap)) {
    it(`${name} matches prototype output`, () => {
      const fn = fns[name];
      const argsList = caseMap[name];
      const expected = goldenMap[name];
      expect(fn, `missing engine fn ${name}`).toBeDefined();
      expect(argsList, `missing cases for ${name}`).toBeDefined();
      const actual = argsList!.map((args) => fn!(...args));
      expect(actual).toEqual(expected);
    });
  }
});
