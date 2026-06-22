// Stable, namespaced id generation (crypto UUID with a safe fallback).
const uid = (): string => {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
};

export const newStyleId = (): string => `style_${uid()}`;
export const newCardId = (): string => `card_${uid()}`;
export const newSequenceId = (): string => `seq_${uid()}`;
export const newUserRemedyId = (): string => `r_${uid()}`;
