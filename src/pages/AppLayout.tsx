import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/cn';

const LINKS = [
  { to: '/build', label: 'Build' },
  { to: '/library', label: 'Library' },
  { to: '/styles', label: 'Styles' },
  { to: '/present', label: 'Present' },
] as const;

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
