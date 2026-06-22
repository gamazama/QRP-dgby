import type { Remedy } from '@/domain/remedy';
import { packAssetUrl, remedyImageRel } from '@/lib/assets';

// Card artwork thumbnail. Swaps to the dark (white-ink) WebP layer in dark mode
// so the writing isn't black-on-dark.
export function RemedyThumb({ remedy, className = '' }: { remedy: Remedy; className?: string }) {
  if (!remedy.image) {
    return <span className={`block rounded bg-slate-100 dark:bg-slate-800 ${className}`} />;
  }
  const light = packAssetUrl(remedyImageRel(remedy.packId, remedy.image.light));
  const dark = remedy.image.dark ? packAssetUrl(remedyImageRel(remedy.packId, remedy.image.dark)) : null;
  return (
    <span className={`relative block ${className}`}>
      <img
        src={light}
        alt=""
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-contain ${dark ? 'dark:hidden' : ''}`}
      />
      {dark && (
        <img
          src={dark}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 hidden h-full w-full object-contain dark:block"
        />
      )}
    </span>
  );
}
