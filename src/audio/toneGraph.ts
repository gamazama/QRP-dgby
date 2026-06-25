import type { ToneNote } from './toneMath';

// Shared, framework-free Web Audio building blocks for the sequence tone, used
// by BOTH the realtime player (SequenceTonePlayer) and the offline renderer
// (renderSequenceTone, for MP4 export). Keeping the synthesis here means the
// exported audio sounds identical to what you hear in Build/Present mode.
//
// Everything is typed against BaseAudioContext, the common supertype of
// AudioContext (realtime) and OfflineAudioContext (faster-than-realtime render).
//
//   drone : base + sub-octave + a faintly-detuned twin (slow beating) + a slow
//           vibrato LFO — a continuous bed that WAVERS along the sequence contour.
//   note  : one soft sine voice per position, the value-th harmonic faintly
//           imbued, stereo-placed by value, soft attack / long release.
//   space : gentle low-pass + generated-impulse reverb + a soft compressor.

// Tunable character — change these to retune the whole feature by ear.
export const STEP_SECONDS = 0.78; // time between note onsets (slow, meditative)
export const NOTE_SECONDS = 1.0; // note length — overlaps the next a little
export const FADE_IN_SECONDS = 1.6;
export const FADE_OUT_SECONDS = 0.9;
export const MASTER_GAIN = 0.5;
export const WAVER_CENTS = 16; // depth of the sequence-contour waver on the drone
export const GLIDE_SECONDS = 0.4; // how smoothly the drone slides between cards
export const LOOKAHEAD_MS = 25; // realtime scheduler tick
export const SCHEDULE_AHEAD_SECONDS = 0.12; // realtime scheduler horizon

const ATTACK_SECONDS = 0.14;
const RELEASE_SECONDS = 0.55;
const NOTE_GAIN = 0.16;
const DRONE_BASE_GAIN = 0.1;
const DRONE_SUB_GAIN = 0.13; // sub-octave a touch louder for body
const DRONE_TWIN_GAIN = 0.05; // detuned twin → slow, lush beating
const TWIN_DETUNE_CENTS = 6;
const VIBRATO_HZ = 0.12; // the drone's slow "breathing"
const VIBRATO_CENTS = 5;
const WAVER_TIME_CONSTANT = 0.25; // glide of the per-step waver
const LOWPASS_HZ = 2600;
const REVERB_SECONDS = 3;
const REVERB_DECAY = 2.6;
const DRY_GAIN = 0.78;
const WET_GAIN = 0.34;

type AudioContextCtor = typeof AudioContext;

export function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** True when this environment can play tones (false in jsdom/SSR). */
export function isToneSupported(): boolean {
  return getAudioContextCtor() !== null;
}

// A short exponentially-decaying noise burst — a cheap, warm reverb impulse.
function makeImpulseResponse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(seconds * rate));
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return buffer;
}

export interface ToneChain {
  /** Connect voices here. Its gain starts at 0 — the caller owns the fade. */
  input: GainNode;
}

/** master(gain 0) → low-pass → (dry + reverb) → soft compressor → destination. */
export function createToneChain(ctx: BaseAudioContext): ToneChain {
  const master = ctx.createGain();
  master.gain.value = 0;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = LOWPASS_HZ;
  lowpass.Q.value = 0.4;

  const dry = ctx.createGain();
  dry.gain.value = DRY_GAIN;
  const wet = ctx.createGain();
  wet.gain.value = WET_GAIN;
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulseResponse(ctx, REVERB_SECONDS, REVERB_DECAY);

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  comp.attack.value = 0.02;
  comp.release.value = 0.3;

  master.connect(lowpass);
  lowpass.connect(dry);
  lowpass.connect(reverb);
  dry.connect(comp);
  reverb.connect(wet);
  wet.connect(comp);
  comp.connect(ctx.destination);

  return { input: master };
}

export interface DroneHandle {
  /** Drone oscillators with their pitch ratio to the base — retune to glide. */
  voices: { osc: OscillatorNode; ratio: number }[];
  /** Detune params of the base + sub oscillators — wavered along the sequence. */
  waverDetune: AudioParam[];
  /** Every oscillator (incl. the vibrato LFO) — for stopping. */
  oscs: OscillatorNode[];
}

/** The continuous drone bed: sub-octave + base + detuned twin + vibrato LFO. */
export function createDrone(
  ctx: BaseAudioContext,
  dest: AudioNode,
  base: number,
  startAt: number,
): DroneHandle {
  const panner = ctx.createStereoPanner();
  panner.pan.value = -0.12; // bed sits a touch left of the notes
  panner.connect(dest);

  const voices: { osc: OscillatorNode; ratio: number }[] = [];
  const waverDetune: AudioParam[] = [];
  const oscs: OscillatorNode[] = [];

  // ratio is the oscillator's pitch relative to the base, so a glide retunes
  // every drone voice to a new card's base by targeting base × ratio.
  const addOsc = (ratio: number, gain: number, detuneCents: number, waver: boolean): void => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = base * ratio;
    osc.detune.value = detuneCents;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, startAt);
    g.gain.linearRampToValueAtTime(gain, startAt + FADE_IN_SECONDS);
    osc.connect(g);
    g.connect(panner);
    osc.start(startAt);
    oscs.push(osc);
    voices.push({ osc, ratio });
    if (waver) waverDetune.push(osc.detune);
  };

  addOsc(0.5, DRONE_SUB_GAIN, 0, true); // sub-octave
  addOsc(1, DRONE_BASE_GAIN, 0, true);
  addOsc(1, DRONE_TWIN_GAIN, TWIN_DETUNE_CENTS, false); // constant beating

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = VIBRATO_HZ;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = VIBRATO_CENTS;
  lfo.connect(lfoGain);
  for (const detune of waverDetune) lfoGain.connect(detune);
  lfo.start(startAt);
  oscs.push(lfo);

  return { voices, waverDetune, oscs };
}

/** Bend the drone toward a step's dial value — the sequence contour, heard. */
export function waverDroneAt(waverDetune: AudioParam[], value: number, t: number): void {
  const target = ((value - 5) / 4) * WAVER_CENTS;
  for (const detune of waverDetune) detune.setTargetAtTime(target, t, WAVER_TIME_CONSTANT);
}

/** Schedule one note voice at time t: soft attack/release + imbued harmonics. */
export function scheduleNote(ctx: BaseAudioContext, bus: AudioNode, note: ToneNote, t: number): void {
  if (note.rest || note.freq <= 0) return;

  const panner = ctx.createStereoPanner();
  panner.pan.value = note.pan;
  const voice = ctx.createGain();
  voice.connect(panner);
  panner.connect(bus);

  const end = t + NOTE_SECONDS;
  voice.gain.setValueAtTime(0, t);
  voice.gain.linearRampToValueAtTime(NOTE_GAIN, t + ATTACK_SECONDS);
  voice.gain.setValueAtTime(NOTE_GAIN, end - RELEASE_SECONDS);
  voice.gain.linearRampToValueAtTime(0, end);

  const teardown: AudioNode[] = [voice, panner];
  const oscs: OscillatorNode[] = [];
  for (const harmonic of note.harmonics) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = note.freq * harmonic.ratio;
    const hg = ctx.createGain();
    hg.gain.value = harmonic.gain;
    osc.connect(hg);
    hg.connect(voice);
    osc.start(t);
    osc.stop(end + 0.05);
    oscs.push(osc);
    teardown.push(osc, hg);
  }
  // The voices all end together; release the nodes when the first one ends.
  if (oscs[0]) {
    oscs[0].onended = () => {
      for (const node of teardown) {
        try {
          node.disconnect();
        } catch {
          /* node already disconnected */
        }
      }
    };
  }
}
