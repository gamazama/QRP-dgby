import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  type?: ToastType;
  action?: ToastAction;
  duration?: number; // ms; 0 = sticky until dismissed
}

interface ToastItem extends Required<Pick<ToastOptions, 'type'>> {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// No-ops gracefully if used outside a provider, so components stay decoupled.
export const useToast = (): ToastContextValue =>
  useContext(ToastContext) ?? { showToast: () => {} };

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = ++idRef.current;
    const type = opts.type ?? 'info';
    // Give actionable toasts (e.g. Undo) longer to live.
    const duration = opts.duration ?? (opts.action ? 6000 : 3500);
    setToasts(prev => [...prev, { id, message, type, action: opts.action }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-4 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
        aria-live="polite"
        role="status"
      >
        {toasts.map(t => {
          const Icon = t.type === 'success' ? CheckCircle : t.type === 'error' ? AlertCircle : Info;
          const accent = t.type === 'success' ? 'text-green-500' : t.type === 'error' ? 'text-red-500' : 'text-blue-500';
          return (
            <div
              key={t.id}
              className="animate-in pointer-events-auto flex items-center gap-3 max-w-sm w-full sm:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-4 py-3"
            >
              <Icon size={18} className={`flex-shrink-0 ${accent}`} />
              <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
