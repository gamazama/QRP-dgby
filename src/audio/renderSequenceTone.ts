import type { TonePlan } from './toneMath';
import {
  createDrone,
  createToneChain,
  FADE_IN_SECONDS,
  FADE_OUT_SECONDS,
  GLIDE_SECONDS,
  MASTER_GAIN,
  NOTE_SECONDS,
  scheduleNote,
  STEP_SECONDS,
  waverDroneAt,
} from './toneGraph';

export interface ToneSegment {
  /** The card's tone, or null for a non-tonal card (drone holds, no notes). */
  plan: TonePlan | null;
  /** How long the card is shown, in seconds (matches the video timeline). */
  durationSec: number;
}

const SAMPLE_RATE = 44100;

function getOfflineCtor(): typeof OfflineAudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    OfflineAudioContext?: typeof OfflineAudioContext;
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
  };
  return w.OfflineAudioContext ?? w.webkitOfflineAudioContext ?? null;
}

/** True when this environment can render tone offline (false in jsdom/SSR). */
export function isToneRenderSupported(): boolean {
  return getOfflineCtor() !== null;
}

/**
 * Render the whole sequence's tone to an AudioBuffer offline (faster than
 * realtime), synchronised to the card timeline so it lines up with the exported
 * video. The drone runs continuously and GLIDES between cards (exactly like
 * Present mode); each tonal card's notes fill its window from the first note;
 * non-tonal cards hold the drone as an ambient pad. Returns null when there is
 * no tonal content or offline audio isn't supported.
 */
export async function renderSequenceTone(segments: ToneSegment[]): Promise<AudioBuffer | null> {
  const Ctor = getOfflineCtor();
  if (!Ctor) return null;

  const firstPlan = segments.find((s) => s.plan)?.plan ?? null;
  if (!firstPlan) return null; // nothing tonal to sound

  const totalSec = segments.reduce((a, s) => a + Math.max(0, s.durationSec), 0);
  if (totalSec <= 0) return null;

  // A tail so the last note's release + reverb aren't clipped.
  const tailSec = NOTE_SECONDS + 0.6;
  const length = Math.ceil((totalSec + tailSec) * SAMPLE_RATE);
  const ctx = new Ctor(2, length, SAMPLE_RATE);

  const { input } = createToneChain(ctx);
  // Master fades in at the start and out into the tail (click-free).
  input.gain.setValueAtTime(0, 0);
  input.gain.linearRampToValueAtTime(MASTER_GAIN, Math.min(FADE_IN_SECONDS, totalSec));
  input.gain.setValueAtTime(MASTER_GAIN, Math.max(0, totalSec - FADE_OUT_SECONDS));
  input.gain.linearRampToValueAtTime(0, totalSec);

  const drone = createDrone(ctx, input, firstPlan.base, 0);

  let cardStart = 0;
  let lastBase = firstPlan.base;
  for (const seg of segments) {
    const t0 = cardStart;
    const t1 = cardStart + Math.max(0, seg.durationSec);
    if (seg.plan) {
      if (seg.plan.base !== lastBase) {
        for (const { osc, ratio } of drone.voices) {
          osc.frequency.setTargetAtTime(seg.plan.base * ratio, t0, GLIDE_SECONDS);
        }
        lastBase = seg.plan.base;
      }
      const notes = seg.plan.notes;
      if (notes.length > 0) {
        let i = 0;
        for (let t = t0; t < t1 - 1e-6; t += STEP_SECONDS) {
          const note = notes[i % notes.length]!;
          waverDroneAt(drone.waverDetune, note.value, t);
          scheduleNote(ctx, input, note, t);
          i++;
        }
      }
    }
    cardStart = t1;
  }

  return ctx.startRendering();
}
