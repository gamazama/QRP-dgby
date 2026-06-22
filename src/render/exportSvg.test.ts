import { describe, expect, it } from 'vitest';
import type { Card } from '@/domain/card';
import { SUNFLOWER_STYLE } from '@/engine/presets';
import { cardToSvg } from './exportSvg';

describe('cardToSvg (export)', () => {
  it('emits a standalone SVG with the rate rendered as stripe lines', () => {
    const card: Card = {
      id: 'c1',
      title: 'Agrimony',
      styleId: 'preset:sunflower',
      content: { kind: 'data', sequence: [2, 12, 17, 34, 40], base: 44 },
    };
    const svg = cardToSvg(card, SUNFLOWER_STYLE, { theme: 'light' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Agrimony');
    expect(svg).toContain('<line'); // stripes present (rate, not zero-filled)
    // inline colors (no CSS classes) so it rasterizes correctly to canvas
    expect(svg).toContain('#0f172a');
  });
});
