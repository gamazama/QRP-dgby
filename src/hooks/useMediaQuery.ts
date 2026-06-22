import { useEffect, useState } from 'react';

// Reactive CSS media-query match. SSR/headless-safe (falls back to false when
// matchMedia is unavailable).
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mql = matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
