import type { SequenceId } from '@/domain/ids';

// SEAM ONLY — not implemented in this milestone. These interfaces document how the
// biofeedback probe axis plugs in without re-architecting playback or storage.

/** A pluggable probe driver. Concrete drivers wrap Web Serial / Bluetooth / HID. */
export interface HardwareDriver {
  readonly id: string;
  readonly label: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /**
   * Subscribe to raw readings; returns an unsubscribe fn. Heavy signal
   * processing should run in a worker so the render loop stays smooth.
   */
  subscribe(onReading: (value: number, channel?: string) => void): () => void;
}

/** One time-series sample, stamped against the playback clock (the master clock). */
export interface Observation {
  /** ms since session start (from usePlaybackClock). */
  t: number;
  /** The card on screen when the sample was taken. */
  cardId: string | null;
  value: number;
  channel?: string;
}

/** A recorded session over a prescription — persisted alongside Sequences. */
export interface SessionRecord {
  id: string;
  sequenceId: SequenceId;
  startedAt: number;
  endedAt?: number;
  driverId?: string;
  observations: Observation[];
}
