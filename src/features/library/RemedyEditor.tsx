import { useState } from 'react';
import { Copy, Trash2, X } from 'lucide-react';
import type { Remedy, RateBase } from '@/domain/remedy';
import type { RemedyRef } from '@/domain/ids';
import { useRepositories } from '@/data/repository-context';
import { useToast } from '@/components/ui/toastContext';

const BASES: RateBase[] = [9, 10, 44];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'card';

const parseRate = (s: string): number[] =>
  s
    .split(/[\s,]+/)
    .map((t) => Number(t))
    .filter((n) => Number.isFinite(n));

const field =
  'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:disabled:bg-slate-900';
const label = 'mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400';

// Create / edit a library card, or annotate a shipped one. Shipped (pack) cards
// are read-only except for the practitioner note; "Duplicate to My Cards" forks
// an editable copy. The note overlay attaches to any card by ref.
export function RemedyEditor({
  remedy,
  onClose,
  onSaved,
}: {
  remedy?: Remedy | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { remedies } = useRepositories();
  const toast = useToast();
  const isPack = !!remedy && remedy.packId !== 'user';
  const isNew = !remedy;

  const [name, setName] = useState(remedy?.name ?? '');
  const [subheading, setSubheading] = useState(remedy?.subheading ?? '');
  const [category, setCategory] = useState(remedy?.category ?? 'custom');
  const [base, setBase] = useState<RateBase>(remedy?.base ?? 44);
  const [rate, setRate] = useState((remedy?.sequence ?? []).join(' '));
  const [rateType, setRateType] = useState(remedy?.rateType ?? '');
  const [light, setLight] = useState(remedy?.image?.light ?? '');
  const [dark, setDark] = useState(remedy?.image?.dark ?? '');
  const [notes, setNotes] = useState(remedy?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const title = isNew ? 'New card' : isPack ? 'Card notes' : 'Edit card';

  const saveUser = async (id: string): Promise<RemedyRef> => {
    const image = light.trim() ? { light: light.trim(), ...(dark.trim() ? { dark: dark.trim() } : {}) } : undefined;
    const saved = await remedies.addUserRemedy({
      id,
      name: name.trim() || 'Untitled card',
      category: category.trim() || 'custom',
      base,
      sequence: parseRate(rate),
      ...(subheading.trim() ? { subheading: subheading.trim() } : {}),
      ...(rateType.trim() ? { rateType: rateType.trim() } : {}),
      ...(image ? { image } : {}),
    });
    return saved.ref;
  };

  const onSave = async () => {
    setBusy(true);
    try {
      if (isPack && remedy) {
        await remedies.setNotes(remedy.ref, notes);
      } else {
        const id = remedy && remedy.packId === 'user' ? remedy.id : `${slug(name)}-${Date.now().toString(36)}`;
        const ref = await saveUser(id);
        await remedies.setNotes(ref, notes);
      }
      toast.show(isPack ? 'Note saved' : isNew ? 'Card added' : 'Card updated', 'success');
      onSaved();
      onClose();
    } catch (err) {
      console.error('Save card failed', err);
      toast.show('Could not save card', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDuplicate = async () => {
    if (!remedy) return;
    setBusy(true);
    try {
      const id = `${slug(name)}-${Date.now().toString(36)}`;
      const ref = await saveUser(id);
      if (notes.trim()) await remedies.setNotes(ref, notes);
      toast.show('Copied to My Cards', 'success');
      onSaved();
      onClose();
    } catch (err) {
      console.error('Duplicate failed', err);
      toast.show('Could not duplicate', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!remedy || remedy.packId !== 'user') return;
    setBusy(true);
    try {
      await remedies.removeUserRemedy(remedy.ref);
      toast.show('Card deleted', 'info');
      onSaved();
      onClose();
    } catch (err) {
      console.error('Delete failed', err);
      toast.show('Could not delete', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isPack && (
          <p className="mb-3 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            This is a library card — only the note is editable. Use “Duplicate to My Cards” to make a fully editable copy.
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className={label}>Name</label>
            <input className={field} value={name} disabled={isPack} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Category</label>
              <input className={field} value={category} disabled={isPack} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <label className={label}>Base</label>
              <select className={field} value={base} disabled={isPack} onChange={(e) => setBase(Number(e.target.value) as RateBase)}>
                {BASES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Rate (space-separated)</label>
            <input className={`${field} font-mono`} value={rate} disabled={isPack} placeholder="5 10 21" onChange={(e) => setRate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Subheading</label>
              <input className={field} value={subheading} disabled={isPack} onChange={(e) => setSubheading(e.target.value)} />
            </div>
            <div>
              <label className={label}>Rate type</label>
              <input className={field} value={rateType} disabled={isPack} onChange={(e) => setRateType(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Artwork path (light)</label>
              <input className={field} value={light} disabled={isPack} placeholder="img/card.webp" onChange={(e) => setLight(e.target.value)} />
            </div>
            <div>
              <label className={label}>Artwork path (dark)</label>
              <input className={field} value={dark} disabled={isPack} placeholder="optional" onChange={(e) => setDark(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea className={`${field} resize-y`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Practitioner notes — searchable" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {remedy?.packId === 'user' && (
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={busy}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
          {isPack && (
            <button
              type="button"
              onClick={() => void onDuplicate()}
              disabled={busy}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate to My Cards
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-md px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={busy}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
