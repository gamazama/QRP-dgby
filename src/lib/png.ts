// Minimal PNG tEXt-chunk read/write to embed/extract a card descriptor in an
// exported PNG (so it can be re-imported). Ported concept from the prototype:
// CRC32 (poly 0xEDB88320) + a standard tEXt chunk inserted after IHDR. The
// reader WALKS chunks (doesn't assume a byte offset) so it reads PNGs from any
// encoder. Text payloads are base64 so they stay ASCII-safe inside Latin-1 tEXt.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = (CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

const b64encode = (s: string): string => btoa(unescape(encodeURIComponent(s)));
const b64decode = (s: string): string => decodeURIComponent(escape(atob(s)));

const u32 = (n: number): Uint8Array =>
  new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
const readU32 = (b: Uint8Array, o: number): number =>
  ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;

const ascii = (s: string): Uint8Array => Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);

/** Insert a tEXt chunk (keyword + base64 text) right after IHDR. */
export function writePngText(png: Uint8Array, keyword: string, text: string): Uint8Array {
  const data = new Uint8Array([...ascii(keyword), 0, ...ascii(b64encode(text))]);
  const typed = new Uint8Array([...ascii('tEXt'), ...data]);
  const chunk = new Uint8Array([...u32(data.length), ...typed, ...u32(crc32(typed))]);
  const insertAt = 33; // 8-byte signature + 25-byte IHDR chunk
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(png.subarray(insertAt), insertAt + chunk.length);
  return out;
}

/** Find a tEXt chunk by keyword and return its decoded text, or null. */
export function readPngText(png: Uint8Array, keyword: string): string | null {
  let o = 8; // past signature
  while (o + 8 <= png.length) {
    const len = readU32(png, o);
    const type = String.fromCharCode(png[o + 4]!, png[o + 5]!, png[o + 6]!, png[o + 7]!);
    const dataStart = o + 8;
    if (type === 'tEXt') {
      const data = png.subarray(dataStart, dataStart + len);
      const sep = data.indexOf(0);
      if (sep !== -1) {
        const kw = String.fromCharCode(...data.subarray(0, sep));
        if (kw === keyword) return b64decode(String.fromCharCode(...data.subarray(sep + 1)));
      }
    }
    if (type === 'IEND') break;
    o = dataStart + len + 4; // skip data + crc
  }
  return null;
}

export const embedJson = (png: Uint8Array, keyword: string, value: unknown): Uint8Array =>
  writePngText(png, keyword, JSON.stringify(value));

export const extractJson = <T>(png: Uint8Array, keyword: string): T | null => {
  const text = readPngText(png, keyword);
  return text ? (JSON.parse(text) as T) : null;
};
