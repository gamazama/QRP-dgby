import { z } from 'zod';
import type { Sequence } from '@/domain/sequence';
import type { Style } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { SequenceSchema, StyleSchema } from '@/domain/schemas';

// A patient share link is fully self-contained: it embeds the prescription AND
// the styles its cards reference, so the recipient renders identically without
// access to the doctor's library/IndexedDB. Payload = JSON -> gzip (when the
// platform supports CompressionStream) -> base64url, prefixed with a 1-char
// codec marker ('z' gzip / 'r' raw). It rides in the hash, never hitting a
// server. Versioned so a future format can be detected and rejected cleanly.
const SharePayloadSchema = z.object({
  v: z.literal(1),
  seq: SequenceSchema,
  styles: z.array(StyleSchema),
});
export interface SharePayload {
  v: 1;
  seq: Sequence;
  styles: Style[];
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: ReadableWritablePair): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  return pipe(bytes, new CompressionStream('gzip'));
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('Decompression unsupported');
  return pipe(bytes, new DecompressionStream('gzip'));
}

/** Styles referenced by the sequence's cards (deduped) — what the link must carry. */
export function referencedStyles(seq: Sequence, stylesById: Map<StyleId, Style>): Style[] {
  const ids = new Set(seq.cards.map((c) => c.styleId));
  return [...ids].map((id) => stylesById.get(id)).filter((s): s is Style => Boolean(s));
}

/** Encode a prescription + its styles to a compact, URL-safe payload string. */
export async function encodeShare(seq: Sequence, styles: Style[]): Promise<string> {
  const json = JSON.stringify({ v: 1, seq, styles } satisfies SharePayload);
  const raw = new TextEncoder().encode(json);
  const zipped = await gzip(raw);
  return zipped && zipped.length < raw.length ? `z${bytesToB64url(zipped)}` : `r${bytesToB64url(raw)}`;
}

/** Decode + validate a payload string back into a prescription + styles. */
export async function decodeShare(code: string): Promise<SharePayload> {
  const marker = code[0];
  let bytes = b64urlToBytes(code.slice(1));
  if (marker === 'z') bytes = await gunzip(bytes);
  else if (marker !== 'r') throw new Error('Unknown share codec');
  const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
  return SharePayloadSchema.parse(data) as SharePayload;
}

/** Full shareable URL (hash route) for the current document base. */
export async function buildShareUrl(seq: Sequence, styles: Style[]): Promise<string> {
  const code = await encodeShare(seq, styles);
  const base = window.location.href.split('#')[0];
  return `${base}#/view?d=${code}`;
}
