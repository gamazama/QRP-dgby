import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { StyleConfig } from '@/domain/style';
import { DHARMA_STYLE, LOTUS_STYLE, SUNFLOWER_STYLE } from '@/engine/presets';
import { CardSurface } from './CardSurface';

const SAMPLE_RATE = [0, 1, 0, 3, 0, 1, 0, 2, 0, 0];

const cases: Array<[string, StyleConfig]> = [
  ['sunflower', SUNFLOWER_STYLE],
  ['lotus', LOTUS_STYLE],
  ['dharma', DHARMA_STYLE],
];

describe('CardSurface', () => {
  it.each(cases)('renders the %s preset to stable SVG', (name, style) => {
    const { container } = render(
      <CardSurface style={style} sequence={SAMPLE_RATE} title={name} />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('renders one stripe per non-zero rate number (dial positions)', () => {
    const { container } = render(<CardSurface style={SUNFLOWER_STYLE} sequence={[0, 2, 0, 1]} base={9} />);
    // positions 2 and 1 -> 2 stripes (0s are skipped).
    const stripeGroup = container.querySelector('.text-slate-900');
    expect(stripeGroup?.querySelectorAll('line').length).toBe(2);
  });
});
