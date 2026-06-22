import type { SettingsRepository } from './types';

// Small UI prefs only (theme, spin, last route/sequence). Everything that grows
// lives in IndexedDB; localStorage is intentionally tiny. Ported from the
// prototype's safe try/catch storage wrapper.
export class LocalSettingsRepository implements SettingsRepository {
  private readonly prefix = 'qrp:';

  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      // quota / unavailable — settings are non-critical, swallow.
    }
  }
}
