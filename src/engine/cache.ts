import {
  buildCardGeometry,
  type BuildCardGeometryInput,
  type CardGeometry,
} from './buildCardGeometry';

// Config-hash LRU. The expensive geometry is rotation-independent, so identical
// (style, sequence, title, tier) inputs across many cards reuse one computation —
// and a playback rotation tick never recomputes geometry (rotation is a transform).

const MAX_ENTRIES = 200;
const cache = new Map<string, CardGeometry>();

function keyOf(input: BuildCardGeometryInput): string {
  return JSON.stringify({
    s: input.style,
    q: input.sequence,
    b: input.base ?? null,
    t: input.title ?? '',
    d: input.description ?? '',
    r: input.tier ?? 'high',
    src: input.source ?? '',
  });
}

export function buildCardGeometryCached(input: BuildCardGeometryInput): CardGeometry {
  const key = keyOf(input);
  const hit = cache.get(key);
  if (hit) {
    // bump LRU recency
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const geo = buildCardGeometry(input);
  cache.set(key, geo);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return geo;
}

export function clearCardGeometryCache(): void {
  cache.clear();
}
