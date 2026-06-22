import { memo, type CSSProperties } from 'react';
import type { Card } from '@/domain/card';
import type { StyleConfig } from '@/domain/style';
import type { RenderTier } from '@/engine/constants';
import { cardFrame, FULL_BLEED_VIEWBOX } from '@/engine/frame';
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
        {...(card.centerImage ? { centerImage: card.centerImage } : {})}
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
  // Rendered in the SAME coordinate frame as geometry — a full-bleed viewBox
  // inside a frame-aspect box — so it shares the exact footprint and centre and
  // never jumps/offsets when crossfading to a pattern card.
  const frame = cardFrame(style);
  const wrapperStyle: CSSProperties =
    fill === 'height'
      ? { width: '100%', height: '100%' }
      : {
          aspectRatio: `${frame.aspect}`,
          width: typeof size === 'number' ? size : '100%',
          maxWidth: typeof size === 'number' ? size : '100%',
        };
  return (
    <div className={`relative mx-auto ${className}`} style={wrapperStyle}>
      <svg
        viewBox={FULL_BLEED_VIEWBOX}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={card.title}
        xmlns="http://www.w3.org/2000/svg"
      >
        <image
          href={resolveCardImage(c.light)}
          x={0}
          y={-150}
          width={400}
          height={700}
          preserveAspectRatio="xMidYMid meet"
          className={c.dark ? 'dark:hidden' : ''}
        />
        {c.dark && (
          <image
            href={resolveCardImage(c.dark)}
            x={0}
            y={-150}
            width={400}
            height={700}
            preserveAspectRatio="xMidYMid meet"
            className="hidden dark:block"
          />
        )}
      </svg>
    </div>
  );
});
