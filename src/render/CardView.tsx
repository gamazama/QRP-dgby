import { memo } from 'react';
import type { Card } from '@/domain/card';
import type { StyleConfig } from '@/domain/style';
import type { RenderTier } from '@/engine/constants';
import { resolveCardImage } from '@/lib/assets';
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
  fill?: 'width' | 'height';
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
  fill = 'width',
}: CardViewProps) {
  const c = card.content;
  if (c.kind === 'remedy' || c.kind === 'data') {
    return (
      <CardSurface
        style={style}
        sequence={c.sequence}
        base={c.base}
        title={card.title}
        description={card.description ?? ''}
        size={size}
        tier={tier}
        active={active}
        spin={spin}
        className={className}
        fill={fill}
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
        fill={fill}
      />
    );
  }
  // Image card: the printed card artwork (light/dark WebP layers swap by theme).
  const wrapperStyle =
    fill === 'height'
      ? { aspectRatio: '4 / 7', height: '100%', width: 'auto', maxWidth: '100%' }
      : {
          aspectRatio: '4 / 7',
          width: typeof size === 'number' ? size : '100%',
          maxWidth: typeof size === 'number' ? size : '100%',
        };
  return (
    <div className={`relative mx-auto ${className}`} style={wrapperStyle}>
      <img
        src={resolveCardImage(c.light)}
        alt={card.title}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-contain ${c.dark ? 'dark:hidden' : ''}`}
      />
      {c.dark && (
        <img
          src={resolveCardImage(c.dark)}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 hidden h-full w-full object-contain dark:block"
        />
      )}
    </div>
  );
});
