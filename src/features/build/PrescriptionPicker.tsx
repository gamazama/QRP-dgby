import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2 } from 'lucide-react';
import { useRepositories } from '@/data/repository-context';
import { useSequencerStore } from '@/store/sequencerStore';

// Switch between saved prescriptions (kept in IndexedDB) or start a new one.
// "New" no longer erases the current deck — the previous prescription stays in
// the dropdown. Switching saves the current deck first so nothing is lost.
export function PrescriptionPicker() {
  const { sequences, settings } = useRepositories();
  const qc = useQueryClient();
  const currentId = useSequencerStore((s) => s.sequence.id);
  const currentName = useSequencerStore((s) => s.sequence.name);
  const { data } = useQuery({ queryKey: ['sequences'], queryFn: () => sequences.list() });

  // De-dupe (the working deck may not be persisted yet) and show the live name
  // for the current one so renames reflect immediately.
  const seen = new Set<string>();
  const options: { id: string; name: string }[] = [];
  for (const s of [{ id: currentId, name: currentName }, ...(data ?? [])]) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    options.push({ id: s.id, name: s.id === currentId ? currentName : s.name });
  }

  const saveCurrent = () => sequences.save(useSequencerStore.getState().sequence);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['sequences'] });

  const switchTo = async (id: string) => {
    if (id === currentId) return;
    await saveCurrent();
    const target = await sequences.getById(id);
    if (target) {
      useSequencerStore.getState().loadSequence(target);
      await settings.set('lastSequenceId', id);
    }
    refresh();
  };

  const onNew = async () => {
    await saveCurrent();
    useSequencerStore.getState().newSequence();
    const seq = useSequencerStore.getState().sequence;
    await sequences.save(seq);
    await settings.set('lastSequenceId', seq.id);
    refresh();
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={currentId}
        onChange={(e) => void switchTo(e.target.value)}
        aria-label="Prescription"
        title="Switch prescription"
        className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name || 'Untitled prescription'}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void onNew()}
        title="New prescription (keeps the current one)"
        className="flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
      >
        <FilePlus2 className="h-3.5 w-3.5" /> New
      </button>
    </div>
  );
}
