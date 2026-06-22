import type { PointerEvent as ReactPointerEvent } from 'react';

// A thin vertical grab-bar for resizing a panel. Sits in the gutter at the left
// edge of the panel it resizes (panel must be `relative`). Drag to resize,
// double-click to reset.
export function ResizeHandle({
  onPointerDown,
  onDoubleClick,
}: {
  onPointerDown: (e: ReactPointerEvent) => void;
  onDoubleClick?: () => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      {...(onDoubleClick ? { onDoubleClick } : {})}
      className="group absolute -left-3 top-0 z-20 h-full w-3 cursor-col-resize touch-none"
    >
      <div className="mx-auto h-full w-0.5 rounded bg-slate-200 transition-colors group-hover:bg-blue-400 dark:bg-slate-700 dark:group-hover:bg-blue-500" />
    </div>
  );
}
