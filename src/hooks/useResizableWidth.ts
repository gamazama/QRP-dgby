import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

// A drag-to-resize width for a right-hand panel, persisted to localStorage so it
// sticks across sessions. The panel hugs the right edge, so the dragged width is
// just (panel's right edge − pointer X), clamped to [min, max]. Attach `paneRef`
// to the panel and wire `startDrag` to a handle on its left edge; double-click
// the handle to `reset`.
export function useResizableWidth<T extends HTMLElement = HTMLElement>(
  key: string,
  initial: number,
  min: number,
  max: number,
) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const [width, setWidth] = useState<number>(() => {
    if (typeof localStorage === 'undefined') return initial;
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? clamp(v) : initial;
  });
  const paneRef = useRef<T | null>(null);
  const widthRef = useRef(width);
  widthRef.current = width;
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !paneRef.current) return;
      const right = paneRef.current.getBoundingClientRect().right;
      setWidth(clamp(right - e.clientX));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem(key, String(Math.round(widthRef.current)));
      } catch {
        /* storage may be unavailable (private mode) — width still works for the session */
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // min/max are stable per call site; clamp closes over them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const startDrag = useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const reset = useCallback(() => {
    setWidth(initial);
    try {
      localStorage.setItem(key, String(initial));
    } catch {
      /* ignore */
    }
  }, [initial, key]);

  return { width, paneRef, startDrag, reset };
}
