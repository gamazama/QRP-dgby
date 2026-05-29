import { useState, useEffect } from 'react';
import { isPersistenceEnabled, loadStored, saveStored, STORAGE_KEYS } from '../utils/storage';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      // 1. Check URL override first to prevent flashing or system override
      const params = new URLSearchParams(window.location.search);
      const themeParam = params.get('t');
      if (themeParam === 'dark') return true;
      if (themeParam === 'light') return false;

      // 2. Restore the user's saved preference (skipped for shared ?c= links)
      if (isPersistenceEnabled()) {
        const stored = loadStored<string | null>(STORAGE_KEYS.theme, null);
        if (stored === 'dark') return true;
        if (stored === 'light') return false;
      }

      // 3. Fallback to System Preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (isPersistenceEnabled()) {
      saveStored(STORAGE_KEYS.theme, isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const setDarkMode = (isDark: boolean) => setIsDarkMode(isDark);

  return { isDarkMode, toggleTheme, setDarkMode };
};