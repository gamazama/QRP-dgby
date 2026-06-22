import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Share2, X } from 'lucide-react';
import type { Sequence } from '@/domain/sequence';
import type { Style } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { useToast } from '@/components/ui/toastContext';
import { buildShareUrl, referencedStyles } from './shareLink';

// "Share" produces a self-contained, playback-only patient link (the whole
// prescription + its styles ride in the URL hash). Shown in a dialog so the
// doctor can copy it or open a preview.
export function SharePrescription({
  sequence,
  stylesById,
}: {
  sequence: Sequence;
  stylesById: Map<StyleId, Style>;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const empty = sequence.cards.length === 0;

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setBuilding(true);
    setUrl('');
    let cancelled = false;
    buildShareUrl(sequence, referencedStyles(sequence, stylesById))
      .then((u) => !cancelled && setUrl(u))
      .catch((err) => {
        console.error('Share link build failed', err);
        if (!cancelled) {
          toast.show('Could not build share link', 'error');
          setOpen(false);
        }
      })
      .finally(() => !cancelled && setBuilding(false));
    return () => {
      cancelled = true;
    };
    // Rebuild only when the dialog opens (the doctor opens it after editing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.show('Patient link copied', 'success');
    } catch {
      toast.show('Copy failed — select the link and copy manually', 'error');
    }
  };

  const iconBtn =
    'rounded-md border border-slate-300 p-1.5 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-900';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={empty}
        title="Share a playback-only patient link"
        aria-label="Share"
        className={iconBtn}
      >
        <Share2 className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Share patient link"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <Share2 className="h-4 w-4" /> Patient link
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              A view-only playback link. The whole prescription travels in the link itself — the
              patient can watch it but not edit, and no account or internet upload is needed.
            </p>

            <div className="flex items-center gap-2">
              <input
                readOnly
                value={building ? 'Building link…' : url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              />
              <button
                type="button"
                onClick={() => void copy()}
                disabled={building || !url}
                className="flex shrink-0 items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {url ? `${Math.round(url.length / 1024)} KB link` : ''}
              </span>
              <a
                href={url || undefined}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-1 text-xs ${
                  url ? 'text-blue-600 hover:underline dark:text-blue-400' : 'pointer-events-none text-slate-300'
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open preview
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
