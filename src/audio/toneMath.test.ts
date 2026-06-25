import { describe, expect, it } from 'vitest';
import {
  buildTonePlan,
  formatHz,
  noteFrequency,
  octaveFold,
  sequenceToBaseFrequency,
  TONE_NOTE_RANGE,
} from './toneMath';

describe('sequenceToBaseFrequency', () => {
  it('reads the digits as an exact decimal in [100, 1000) — 2 7 7 3 1 → 277.31', () => {
    // Exact equality, not approximate: this is the headline precision claim.
    expect(sequenceToBaseFrequency([2, 7, 7, 3, 1])).toBe(277.31);
  });

  it('places short and long sequences with one exact power-of-ten scale', () => {
    expect(sequenceToBaseFrequency([5])).toBe(500);
    expect(sequenceToBaseFrequency([2, 7])).toBe(270); // not 269.999… (no /0.1 drift)
    expect(sequenceToBaseFrequency([9, 9, 9, 9])).toBe(999.9);
  });

  it('normalises leading zeros up into range', () => {
    expect(sequenceToBaseFrequency([0, 7, 7, 3, 1])).toBe(773.1);
  });

  it('falls back to the bottom of the range for an empty/all-zero sequence', () => {
    expect(sequenceToBaseFrequency([])).toBe(100);
    expect(sequenceToBaseFrequency([0, 0])).toBe(100);
  });
});

describe('octaveFold / noteFrequency', () => {
  it('folds a note into [200, 1500] by halving octaves', () => {
    // base 277.31 × 7 = 1941.17 → one octave down = 970.585
    expect(noteFrequency(277.31, 7)).toBeCloseTo(970.585, 4);
    const f = noteFrequency(277.31, 7);
    expect(f).toBeGreaterThanOrEqual(TONE_NOTE_RANGE.min);
    expect(f).toBeLessThanOrEqual(TONE_NOTE_RANGE.max);
  });

  it('keeps in-range multiples exact (×1, ×2, ×3)', () => {
    expect(noteFrequency(277.31, 1)).toBe(277.31);
    expect(noteFrequency(277.31, 2)).toBeCloseTo(554.62, 4);
    expect(noteFrequency(277.31, 3)).toBeCloseTo(831.93, 4);
  });

  it('treats a 0 dial position as a rest (0 Hz)', () => {
    expect(noteFrequency(277.31, 0)).toBe(0);
  });

  it('only folds when out of range', () => {
    expect(octaveFold(440, 200, 1500)).toBe(440);
  });
});

describe('buildTonePlan', () => {
  it('imbues 2 7 7 3 1 across base, sub-octave, and per-note pitches', () => {
    const plan = buildTonePlan([2, 7, 7, 3, 1]);
    expect(plan.base).toBe(277.31);
    expect(plan.sub).toBe(138.655);
    expect(plan.notes.map((n) => n.value)).toEqual([2, 7, 7, 3, 1]);
    expect(plan.notes[0]?.freq).toBeCloseTo(554.62, 4);
    expect(plan.notes[1]?.freq).toBeCloseTo(970.585, 4);
    expect(plan.notes[3]?.freq).toBeCloseTo(831.93, 4);
    expect(plan.notes[4]?.freq).toBe(277.31); // ×1 = the base note itself
  });

  it('voices a 0 as a silent rest with no harmonics', () => {
    const plan = buildTonePlan([2, 0, 7]);
    expect(plan.notes[1]).toMatchObject({ value: 0, rest: true, freq: 0, harmonics: [] });
    expect(plan.notes[0]?.rest).toBe(false);
  });

  it('encodes the dial position in each note timbre (value-th harmonic) and pan', () => {
    const plan = buildTonePlan([1, 9]);
    // value 1: just fundamental + soft octave; value 9: adds a folded 9th harmonic.
    expect(plan.notes[0]?.harmonics).toHaveLength(2);
    expect(plan.notes[1]?.harmonics.length).toBeGreaterThan(2);
    expect(plan.notes[0]?.pan).toBeLessThan(0); // 1 sits left
    expect(plan.notes[1]?.pan).toBeGreaterThan(0); // 9 sits right
  });
});

describe('formatHz', () => {
  it('shows up to 4 dp, trimming trailing zeros', () => {
    expect(formatHz(277.31)).toBe('277.31');
    expect(formatHz(970.585)).toBe('970.585');
    expect(formatHz(554.62)).toBe('554.62');
    expect(formatHz(138.655)).toBe('138.655');
  });
});
