import type { SequenceId } from './ids';

/**
 * STUB for the future biofeedback axis — NOT implemented in milestone one.
 * Present so the playback surface and persistence don't need re-architecting
 * when probe sessions land: the playback clock becomes the master timestamp,
 * and `observations` becomes a time-series store correlated to the card shown.
 */
export interface SessionDevice {
  driverId: string;
  label: string;
}

export interface Session {
  id: string;
  sequenceId: SequenceId;
  startedAt: number;
  endedAt?: number;
  device?: SessionDevice;
  observations: never[];
}
