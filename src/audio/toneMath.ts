// Maps a base-9 rate sequence (dial positions 1–9, with 0 = a beat of silence)
// to a gentle, meditative tone. The sequence is imbued faithfully at every
// layer the ear can hear it:
//   • the whole sequence sets the drone's BASE pitch (its digits, read as one
//     decimal number, placed into the 100–1000 Hz range),
//   • each position sets the PITCH of a sequenced note (base × value, folded
//     into the 200–1500 Hz range),
//   • each note carries its value as a faint HARMONIC (the value-th partial),
//   • each note's STEREO position traces its value,
//   • and the drone WAVERS along the sequence contour (see SequenceTonePlayer).
//
// Everything here is pure and deterministic so the mapping can be tested by ear
// AND by assertion; the Web Audio side (SequenceTonePlayer) just renders a plan.

/** The base/drone frequency is normalised into this window. */
export const TONE_BASE_RANGE = { min: 100, max: 1000 } as const;
/** Each sequenced note is octave-folded into this window. */
export const TONE_NOTE_RANGE = { min: 200, max: 1500 } as const;

export interface ToneHarmonic {
  /** Frequency multiple of the note's fundamental (1 = the fundamental). */
  ratio: number;
  /** Relative gain, with the fundamental at 1. */
  gain: number;
}

export interface ToneNote {
  /** The dial position this note encodes (0–9). */
  value: number;
  /** Octave-folded pitch in TONE_NOTE_RANGE, or 0 when this is a rest. */
  freq: number;
  /** A 0 dial position plays as a beat of silence. */
  rest: boolean;
  /** Fundamental + gentle partials; includes the value-th harmonic. */
  harmonics: ToneHarmonic[];
  /** Stereo position in [-1, 1], traced from the dial position. */
  pan: number;
}

export interface TonePlan {
  /** Drone fundamental, within TONE_BASE_RANGE. */
  base: number;
  /** Sub-octave (base / 2) that gives the drone its depth. */
  sub: number;
  /** One entry per sequence position, played in order and looped. */
  notes: ToneNote[];
}

/**
 * Read the sequence's digits as one decimal number placed into [100, 1000):
 *
 *   [2, 7, 7, 3, 1] → 27731 → 277.31 Hz
 *
 * Every digit informs the pitch (later digits ever more faintly), so the whole
 * sequence is faithfully present in the base tone. Leading zeros are normalised
 * up into range; an all-zero sequence falls back to the bottom of the range.
 *
 * Precision matters here (the practitioner reads the exact Hz to ~4 dp), so we
 * concatenate the digits into one integer and apply a SINGLE power-of-ten scale.
 * That rounds exactly once — `27731 / 100` is the nearest double to 277.31, bit
 * for bit. A positional sum (… + 3·0.1 + 1·0.01) instead drifts to
 * 277.31000000000006 by compounding the inexact 0.1/0.01 terms.
 */
export function sequenceToBaseFrequency(sequence: number[]): number {
  let n = 0;
  for (const raw of sequence) n = n * 10 + Math.max(0, Math.min(9, Math.round(raw)));
  if (n <= 0) return TONE_BASE_RANGE.min;
  // Find the single power of ten that lands n in range, then apply it once.
  let v = n;
  let k = 0; // k > 0 → divide by 10^k; k < 0 → multiply by 10^-k
  while (v >= TONE_BASE_RANGE.max) {
    v /= 10;
    k++;
  }
  while (v < TONE_BASE_RANGE.min) {
    v *= 10;
    k--;
  }
  return k >= 0 ? n / 10 ** k : n * 10 ** -k;
}

/**
 * Format a frequency for display to ~4 decimal places, trimming trailing zeros
 * (277.31 → "277.31", 970.585 → "970.585"). The practitioner verifies the exact
 * Hz against the sequence, so this is the precision they read.
 */
export function formatHz(freq: number): string {
  return `${Number(freq.toFixed(4))}`;
}

/** Halve/double a frequency until it sits inside [min, max] — octave folding. */
export function octaveFold(freq: number, min: number, max: number): number {
  if (!(freq > 0)) return 0;
  let f = freq;
  while (f > max) f /= 2;
  while (f < min) f *= 2;
  return f;
}

/** The pitch for dial position `value`: base × value, folded into note range. */
export function noteFrequency(base: number, value: number): number {
  if (value <= 0) return 0;
  return octaveFold(base * value, TONE_NOTE_RANGE.min, TONE_NOTE_RANGE.max);
}

/**
 * Gentle partials for a note. Always the fundamental plus a soft octave for
 * warmth; for values ≥ 3 we also voice the value-th harmonic — folded down into
 * a 2–4× window so a high number colours the timbre without piercing — so the
 * dial position is imbued in the note's harmonics, not only its pitch.
 */
export function noteHarmonics(value: number): ToneHarmonic[] {
  const harmonics: ToneHarmonic[] = [
    { ratio: 1, gain: 1 },
    { ratio: 2, gain: 0.2 },
  ];
  if (value >= 3) {
    let ratio = value;
    while (ratio > 4) ratio /= 2;
    harmonics.push({ ratio, gain: 0.12 });
  }
  return harmonics;
}

/** Stereo placement traced from the dial position (5 ≈ centre, 1 left, 9 right). */
export function panForValue(value: number): number {
  return Math.max(-1, Math.min(1, ((value - 5) / 4) * 0.6));
}

/** Turn a base-9 sequence into a fully-specified, renderable tone plan. */
export function buildTonePlan(sequence: number[]): TonePlan {
  const base = sequenceToBaseFrequency(sequence);
  const notes: ToneNote[] = sequence.map((raw) => {
    const value = Math.max(0, Math.min(9, Math.round(raw)));
    const rest = value <= 0;
    return {
      value,
      freq: noteFrequency(base, value),
      rest,
      harmonics: rest ? [] : noteHarmonics(value),
      pan: panForValue(value),
    };
  });
  return { base, sub: base / 2, notes };
}
