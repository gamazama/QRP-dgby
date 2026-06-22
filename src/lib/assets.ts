// Resolve asset URLs against the deploy base path (so dev '/' and Pages
// '/QRP-dgby/' both work). Pack-relative paths are stored portably (without the
// base); data:/http(s) URLs (user uploads, future remote) pass through unchanged.

export const packAssetUrl = (relative: string): string =>
  `${import.meta.env.BASE_URL}${relative.replace(/^\//, '')}`;

/** Pack-relative path for a remedy image file (e.g. "packs/bach-flowers-v1/img/agrimony.webp"). */
export const remedyImageRel = (packId: string, file: string): string => `packs/${packId}/${file}`;

/** Resolve a card image src to a loadable URL. */
export const resolveCardImage = (src: string): string =>
  /^(https?:|data:|blob:)/.test(src) ? src : packAssetUrl(src);
