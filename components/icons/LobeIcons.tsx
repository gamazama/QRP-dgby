import React from 'react';
import { GeoConfig } from '../../types';

// Lightweight, lucide-style SVG glyphs (currentColor stroke, 24 viewBox) that
// echo the actual pattern each lobe type produces, so the mode is recognizable
// at a glance in the preset switcher and the card list:
//   sunflower → ring of round seed-lobes around a central seed-head
//   lotus     → radial ring of pointed petals
//   dharma    → square "gate" frame around a central disc

interface IconProps {
  size?: number;
  className?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

const svgProps = (size: number, className?: string) => ({
  viewBox: '0 0 24 24',
  width: size,
  height: size,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
});

// Ring of round seed-lobes around concentric center rings — the phyllotaxis
// sunflower hull.
export const SunflowerIcon: React.FC<IconProps> = ({ size = 24, className }) => {
  const lobes = Array.from({ length: 9 }).map((_, i) => {
    const a = (i * 40 * Math.PI) / 180;
    return <circle key={i} cx={r2(12 + 7.6 * Math.cos(a))} cy={r2(12 + 7.6 * Math.sin(a))} r="1.7" />;
  });
  return (
    <svg {...svgProps(size, className)}>
      {lobes}
      <circle cx="12" cy="12" r="3.3" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
};

// Radial ring of pointed petals — the lotus bloom.
export const LotusIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg {...svgProps(size, className)}>
    {Array.from({ length: 8 }).map((_, i) => (
      <path
        key={i}
        d="M12 12 C 10.2 8.5 10.6 4.3 12 3 C 13.4 4.3 13.8 8.5 12 12 Z"
        transform={`rotate(${i * 45} 12 12)`}
      />
    ))}
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

// Square frame with a gate on each side around a central disc — the angular
// "dharma gate" mandala.
export const DharmaIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg {...svgProps(size, className)}>
    {/* outer gated frame */}
    <rect x="5" y="5" width="14" height="14" rx="0.5" />
    {/* gates protruding from each side */}
    <rect x="9.5" y="2.5" width="5" height="2.5" rx="0.4" />
    <rect x="9.5" y="19" width="5" height="2.5" rx="0.4" />
    <rect x="2.5" y="9.5" width="2.5" height="5" rx="0.4" />
    <rect x="19" y="9.5" width="2.5" height="5" rx="0.4" />
    {/* inner disc */}
    <circle cx="12" cy="12" r="4.3" />
  </svg>
);

export type LobeType = GeoConfig['lobeType'];

// The icon component for a given lobe type (defaults to sunflower).
export const lobeIcon = (type: LobeType): React.FC<IconProps> =>
  type === 'lotus' ? LotusIcon : type === 'dharma' ? DharmaIcon : SunflowerIcon;

// A subtle accent color per type, matching the preset switcher's tints.
export const lobeColorClass = (type: LobeType): string =>
  type === 'lotus' ? 'text-emerald-500' : type === 'dharma' ? 'text-blue-500' : 'text-amber-500';
