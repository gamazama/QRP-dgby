import type { TonePlan } from './toneMath';
import {
  createDrone,
  createToneChain,
  FADE_IN_SECONDS,
  FADE_OUT_SECONDS,
  getAudioContextCtor,
  GLIDE_SECONDS,
  LOOKAHEAD_MS,
  MASTER_GAIN,
  SCHEDULE_AHEAD_SECONDS,
  scheduleNote,
  STEP_SECONDS,
  waverDroneAt,
} from './toneGraph';

export { isToneSupported } from './toneGraph';

// Realtime, looping playback of a TonePlan via a Web Audio AudioContext. The
// synthesis lives in toneGraph (shared with the MP4-export renderer); this class
// owns the live concerns: a lookahead scheduler, gliding between cards in Present
// mode (update), and click-free fades (start/stop). Nothing here invents
// frequencies — it plays exactly the Hz toneMath computed.
export class SequenceTonePlayer {
  private plan: TonePlan;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noteBus: AudioNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private droneVoices: { osc: OscillatorNode; ratio: number }[] = [];
  private waverDetune: AudioParam[] = [];
  /** True while sitting on a non-tonal card: drone holds, notes go quiet. */
  private notesMuted = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextNoteTime = 0;
  private stopping = false;

  constructor(plan: TonePlan) {
    this.plan = plan;
  }

  get isRunning(): boolean {
    return this.ctx !== null && !this.stopping;
  }

  start(): void {
    if (this.ctx) return;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    void ctx.resume();

    const { input } = createToneChain(ctx);
    const now = ctx.currentTime;
    input.gain.setValueAtTime(0, now);
    input.gain.linearRampToValueAtTime(MASTER_GAIN, now + FADE_IN_SECONDS);
    this.master = input;
    this.noteBus = input;

    const drone = createDrone(ctx, input, this.plan.base, now);
    this.droneVoices = drone.voices;
    this.waverDetune = drone.waverDetune;
    this.droneOscs = drone.oscs;

    this.step = 0;
    this.nextNoteTime = now + 0.15;
    this.timer = setInterval(() => this.scheduleAhead(), LOOKAHEAD_MS);
  }

  /**
   * Glide a running tone onto a new card's plan WITHOUT restarting — used in
   * Present mode so the drone tracks the active card continuously. A null plan
   * means the active card has no base-9 tone: notes go quiet, the drone holds.
   */
  update(plan: TonePlan | null): void {
    const ctx = this.ctx;
    if (!ctx || this.stopping) return;
    if (!plan) {
      this.notesMuted = true;
      return;
    }
    this.notesMuted = false;
    this.plan = plan;
    const now = ctx.currentTime;
    for (const { osc, ratio } of this.droneVoices) {
      osc.frequency.setTargetAtTime(plan.base * ratio, now, GLIDE_SECONDS);
    }
    this.step = 0; // sound the new card from its first note
  }

  private scheduleAhead(): void {
    const ctx = this.ctx;
    if (!ctx || this.stopping) return;
    const notes = this.plan.notes;
    if (notes.length === 0) return;
    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_SECONDS) {
      // While muted (non-tonal card) keep the cadence running but voice nothing,
      // so the drone holds and notes resume in time on the next tonal card.
      if (!this.notesMuted) {
        const note = notes[this.step % notes.length];
        if (note && this.noteBus) {
          waverDroneAt(this.waverDetune, note.value, this.nextNoteTime);
          scheduleNote(ctx, this.noteBus, note, this.nextNoteTime);
        }
      }
      this.nextNoteTime += STEP_SECONDS;
      this.step++;
    }
  }

  /** Fade out gracefully, then dispose. Safe to call more than once. */
  stop(): void {
    const ctx = this.ctx;
    if (!ctx || this.stopping) return;
    this.stopping = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const now = ctx.currentTime;
    if (this.master) {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + FADE_OUT_SECONDS);
    }
    for (const osc of this.droneOscs) {
      try {
        osc.stop(now + FADE_OUT_SECONDS + 0.05);
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => this.dispose(), (FADE_OUT_SECONDS + 0.2) * 1000);
  }

  /** Tear everything down immediately (no fade). */
  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    this.noteBus = null;
    this.droneOscs = [];
    this.droneVoices = [];
    this.waverDetune = [];
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
  }
}
