import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      // 1. Check URL override first to prevent flashing or system override
      const params = new URLSearchParams(window.location.search);
      const themeParam = params.get('t');
      if (themeParam === 'dark') return true;
      if (themeParam === 'light') return false;

      // 2. Fallback to System Preference
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
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const setDarkMode = (isDark: boolean) => setIsDarkMode(isDark);

  return { isDarkMode, toggleTheme, setDarkMode };
};