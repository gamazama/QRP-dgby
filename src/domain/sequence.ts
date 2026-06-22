import type { Card } from './card';
import type { SequenceId } from './ids';

export interface SequenceTiming {
  perCardMs: number;
  crossfadeMs: number;
}

/** The practitioner's saved prescription / working document. */
export interface Sequence {
  id: SequenceId;
  name: string;
  patientRef?: string;
  notes?: string;
  cards: Card[];
  timing: SequenceTiming;
  createdAt: number;
  updatedAt: number;
}
