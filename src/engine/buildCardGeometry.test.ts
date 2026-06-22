import { describe, expect, it } from 'vitest';
import { buildCardGeometry } from './buildCardGeometry';
import { SUNFLOWER_STYLE } from './presets';

describe('buildCardGeometry — rate flow', () => {
  it('renders one stripe per rate number at its dial position (not value-as-count)', () => {
    const agrimony = [2, 12, 17, 34, 40]; // real Bach base-44 rate
    const geo = buildCardGeometry({ style: SUNFLOWER_STYLE, sequence: agrimony, base: 44 });
    expect(geo.stripes.length).toBe(agrimony.length); // 5 lines, not 105
  });

  it('stacks repeated positions (a number mentioned twice draws two stripes)', () => {
    const geo = buildCardGeometry({ style: SUNFLOWER_STYLE, sequence: [3, 3, 5], base: 9 });
    expect(geo.stripes.length).toBe(3); // two at position 3, one at position 5
  });

  it('renders no stripes for an all-zero rate (0 = no position)', () => {
    const geo = buildCardGeometry({ style: SUNFLOWER_STYLE, sequence: [0, 0, 0] });
    expect(geo.stripes.length).toBe(0);
  });

  it('shows the real rate system and the actual rate numbers (not repeated indices)', () => {
    const geo = buildCardGeometry({ style: SUNFLOWER_STYLE, sequence: [2, 12, 17, 34, 40], base: 44 });
    expect(geo.infoLine.baseLabel).toBe('Base 44');
    expect(geo.infoLine.seqStr).toBe('2 12 17 34 40');
  });
});
