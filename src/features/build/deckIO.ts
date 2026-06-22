import type { Sequence } from '@/domain/sequence';
import { SequenceSchema } from '@/domain/schemas';

const fileName = (name: string) =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'prescription'}.json`;

/** Download the working prescription as a JSON file. */
export function exportSequenceJson(seq: Sequence): void {
  const blob = new Blob([JSON.stringify(seq, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName(seq.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse + validate a prescription JSON file (throws on invalid shape). */
export async function importSequenceJson(file: File): Promise<Sequence> {
  const text = await file.text();
  return SequenceSchema.parse(JSON.parse(text)) as Sequence;
}
