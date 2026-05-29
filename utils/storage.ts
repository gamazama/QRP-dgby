// Safe localStorage helpers for persisting settings/parameters across sessions.
//
// Everything is wrapped in try/catch: localStorage can throw when disabled
// (private browsing, blocked cookies) or when the quota is exceeded (image
// cards store data URLs, which are large). Persistence failing must never
// break the app — it just falls back to in-memory defaults.

const PREFIX = 'qrp:';

// Shared links (?c=...) open the app in view-only mode. While viewing someone
// else's pattern we must NOT read the user's saved deck (it would override the
// shared one) nor write the shared deck back (it would clobber the user's work).
export const isPersistenceEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return !new URLSearchParams(window.location.search).has('c');
  } catch {
    return false;
  }
};

export const loadStored = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const saveStored = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    // Quota exceeded (commonly large image cards) or storage disabled.
    console.warn(`Could not persist "${key}" to localStorage`, err);
  }
};

// Storage keys (centralised so the hooks agree on names).
export const STORAGE_KEYS = {
  sequences: 'sequences',
  activeIndex: 'activeIndex',
  timingMs: 'timingMs',
  theme: 'theme',
} as const;
