import { useEffect, useRef, useState, type ReactNode } from 'react';

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
}: {
  cardKey: string | number;
  durationMs: number;
  children: ReactNode;
}) {
  const [outgoing, setOutgoing] = useState<{ key: string; node: ReactNode } | null>(null);
  const prev = useRef<{ key: string; node: ReactNode }>({ key: String(cardKey), node: children });
  const childrenRef = useRef(children);
  childrenRef.current = children;

  useEffect(() => {
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

  return (
    <div className="relative">
      {outgoing && (
        <div
          key={outgoing.key}
          className="qrp-fade-out absolute inset-0"
          style={{ animationDuration: `${durationMs}ms` }}
        >
          {outgoing.node}
        </div>
      )}
      <div
        key={String(cardKey)}
        className={outgoing ? 'qrp-fade-in' : undefined}
        style={outgoing ? { animationDuration: `${durationMs}ms` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
