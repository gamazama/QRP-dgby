import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useSequencePersistence } from '@/hooks/useSequencePersistence';
import { useTheme } from '@/hooks/useTheme';
import { useSequencerStore } from '@/store/sequencerStore';

const LINKS = [
  { to: '/build', label: 'Build' },
  { to: '/library', label: 'Library' },
  { to: '/styles', label: 'Styles' },
  { to: '/present', label: 'Present' },
] as const;

export function AppLayout() {
  // App-level: load/restore the working prescription once, shared across routes.
  useSequencePersistence();
  const { theme, toggle } = useTheme();

  // Cmd/Ctrl+Z undo (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      e.preventDefault();
      useSequencerStore.getState().undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex h-14 items-center gap-4 border-b border-slate-200 px-4 dark:border-slate-800">
        <span className="font-semibold tracking-tight">QRP</span>
        <nav className="flex gap-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-slate-200 dark:bg-slate-800'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-900',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle theme"
          className="ml-auto rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
