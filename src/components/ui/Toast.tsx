import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastType } from './toastContext';
import { cn } from '@/lib/cn';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const typeClass = (t: ToastType): string =>
  t === 'error'
    ? 'bg-red-600 text-white'
    : t === 'success'
      ? 'bg-emerald-600 text-white'
      : 'bg-slate-800 text-white dark:bg-slate-700';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = (idRef.current += 1);
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn('pointer-events-auto max-w-sm rounded-md px-3 py-2 text-sm shadow-lg', typeClass(t.type))}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
