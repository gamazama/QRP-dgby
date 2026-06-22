import type { RenderTier } from '@/engine/constants';

// Pick a rendering quality tier from device signals so weak laptops/phones stay
// smooth. `prefers-reduced-motion` forces the lightest path. (A runtime FPS probe
// and a raster-spin Lite render path are the next step beyond this static pick.)
export function detectRenderTier(): RenderTier {
  if (typeof navigator === 'undefined') return 'high';
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) return 'lite';
  if (cores <= 4 || mem <= 4 || coarse) return 'balanced';
  return 'high';
}

let cached: RenderTier | null = null;
export function useRenderTier(): RenderTier {
  if (cached === null) cached = detectRenderTier();
  return cached;
}
