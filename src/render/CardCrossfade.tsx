import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Crossfade between cards: the incoming card sits in normal flow (sizing the
// container) and fades in over a frozen snapshot of the outgoing card, which
// fades out and is removed after `durationMs`. The removal timer is keyed ONLY
// on cardKey/durationMs (children is read from a ref at fire time), so unrelated
// re-renders while the same card is active can't clear it and strand the
// outgoing frame. durationMs <= 0 = instant cut.
export function CardCrossfade({
  cardKey,
  durationMs,
  children,
  className = '',
}: {
  cardKey: string | number;
  durationMs: number;
  children: ReactNode;
  className?: string;
}) {
  const [outgoing, setOutgoing] = useState<{ key: string; node: ReactNode } | null>(null);
  const prev = useRef<{ key: string; node: ReactNode }>({ key: String(cardKey), node: children });
  const childrenRef = useRef(children);
  childrenRef.current = children;

  // Layout effect (not effect) so the outgoing snapshot is committed BEFORE the
  // browser paints the new card — otherwise the incoming paints at full opacity
  // for one frame and the fade restarts it from 0, which reads as a flicker
  // (most visible on transition cards).
  useLayoutEffect(() => {
    const k = String(cardKey);
    if (k === prev.current.key) {
      prev.current = { key: k, node: childrenRef.current };
      return;
    }
    if (durationMs > 0) {
      setOutgoing(prev.current); // freeze the previous card
      prev.current = { key: k, node: childrenRef.current };
      const t = setTimeout(() => setOutgoing(null), durationMs);
      return () => clearTimeout(t);
    }
    setOutgoing(null);
    prev.current = { key: k, node: childrenRef.current };
    return undefined;
  }, [cardKey, durationMs]);

  // Layers are absolutely positioned within the (sized) container so the card's
  // fill sizing has a definite box — no fragile height:100% chain through flex.
  return (
    <div className={className || 'relative'}>
      {outgoing && (
        <div
          key={outgoing.key}
          className="qrp-fade-out absolute inset-0 flex items-center justify-center"
          style={{ animationDuration: `${durationMs}ms` }}
        >
          {outgoing.node}
        </div>
      )}
      <div
        key={String(cardKey)}
        className={`absolute inset-0 flex items-center justify-center ${durationMs > 0 ? 'qrp-fade-in' : ''}`}
        style={durationMs > 0 ? { animationDuration: `${durationMs}ms` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
