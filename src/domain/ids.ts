/** Stable, namespaced identifiers used across the domain. */
export type StyleId = string; // "preset:sunflower" | "style_<nanoid>"
export type PackId = string; // "bach-flowers-v1"
export type RemedyRef = `${PackId}:${string}`; // packId + cardId — NOT a folder path
export type CardId = string; // "card_<nanoid>" — instance id within a sequence
export type SequenceId = string; // "seq_<nanoid>"
