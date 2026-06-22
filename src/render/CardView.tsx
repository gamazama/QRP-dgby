import { memo } from 'react';
import type { Card } from '@/domain/card';
import type { StyleConfig } from '@/domain/style';
import type { RenderTier } from '@/engine/constants';
import { CardSurface } from './CardSurface';
import { TransitionSurface } from './TransitionSurface';

export interface CardViewProps {
  card: Card;
  style: StyleConfig;
  size?: number | string;
  tier?: RenderTier;
  active?: boolean;
  spin?: boolean;
  className?: string;
}

// Dispatches a Card to the right renderer. Geometry (remedy/data) uses
// CardSurface; transition/image render full in Phase 6 (present/export) — shown
// as labeled placeholders in the builder for now.
export const CardView = memo(function CardView({
  card,
  style,
  size = '100%',
  tier = 'high',
  active = false,
  spin = false,
  className = '',
}: CardViewProps) {
  const c = card.content;
  if (c.kind === 'remedy' || c.kind === 'data') {
    return (
      <CardSurface
        style={style}
        sequence={c.sequence}
        title={card.title}
        description={card.description ?? ''}
        size={size}
        tier={tier}
        active={active}
        spin={spin}
        className={className}
      />
    );
  }
  if (c.kind === 'transition') {
    return (
      <TransitionSurface
        shape={c.shape}
        mode={c.spin}
        spinSeconds={c.spinSeconds}
        active={active}
        enabled={spin}
        size={size}
        className={className}
      />
    );
  }
  // Image cards render in Phase 6+ once a creation path exists.
  return (
    <div
      className={`flex aspect-[4/7] w-full items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700 ${className}`}
    >
      Image
    </div>
  );
});
