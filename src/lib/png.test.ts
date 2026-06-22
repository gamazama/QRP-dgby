import { describe, expect, it } from 'vitest';
import { embedJson, extractJson, readPngText } from './png';

// Minimal valid-enough PNG: signature + IHDR + IEND (CRC not validated on read).
function minimalPng(): Uint8Array {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  const ihdr = [0, 0, 0, 13, 73, 72, 68, 82, ...new Array(13).fill(0), 0, 0, 0, 0];
  const iend = [0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0];
  return new Uint8Array([...sig, ...ihdr, ...iend]);
}

describe('png tEXt codec', () => {
  it('round-trips an embedded JSON descriptor', () => {
    const png = minimalPng();
    const meta = { v: 1, title: 'Agrimony', base: 44, sequence: [2, 12, 17, 34, 40] };
    const out = embedJson(png, 'QRPCard', meta);
    expect(out.length).toBeGreaterThan(png.length);
    expect(extractJson(out, 'QRPCard')).toEqual(meta);
  });

  it('returns null for a missing keyword', () => {
    expect(readPngText(minimalPng(), 'QRPCard')).toBeNull();
  });
});
