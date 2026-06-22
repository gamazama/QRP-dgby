import { describe, expect, it } from 'vitest';
import { buildCardGeometry } from './buildCardGeometry';
import { SUNFLOWER_STYLE } from './presets';

describe('buildCardGeometry — rate flow', () => {
  it('renders one stripe line per rate unit (rate is NOT zero-filled)', () => {
    const agrimony = [2, 12, 17, 34, 40]; // real Bach base-44 rate
    const geo = buildCardGeometry({ style: SUNFLOWER_STYLE, sequence: agrimony });
    expect(geo.stripes.length).toBe(agrimony.reduce((a, b) => a + b, 0));
    expect(geo.stripes.length).toBeGreaterThan(0);
  });

  it('renders no stripes for an all-zero rate', () => {
    const geo = buildCardGeometry({ style: SUNFLOWER_STYLE, sequence: [0, 0, 0] });
    expect(geo.stripes.length).toBe(0);
  });

  it('shows the real rate system and the actual rate numbers (not repeated indices)', () => {
    const geo = buildCardGeometry({ style: SUNFLOWER_STYLE, sequence: [2, 12, 17, 34, 40], base: 44 });
    expect(geo.infoLine.baseLabel).toBe('Base 44');
    expect(geo.infoLine.seqStr).toBe('2 12 17 34 40');
  });
});
