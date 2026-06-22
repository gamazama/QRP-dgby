import { createContext, useContext } from 'react';

export type ToastType = 'info' | 'success' | 'error';

export interface ToastApi {
  show: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
