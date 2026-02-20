// CRC32 Table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

const crc32 = (buf: Uint8Array): number => {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
};

const stringToUint8 = (str: string): Uint8Array => {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
};

// Writes a tEXt chunk to the PNG
export const writePngMetadata = (pngBuffer: ArrayBuffer, key: string, value: string): Blob => {
  const uint8 = new Uint8Array(pngBuffer);
  
  // 1. Prepare Chunk Data: Keyword + Null Separator + Text
  const keyArr = stringToUint8(key);
  const valArr = stringToUint8(value);
  const chunkData = new Uint8Array(keyArr.length + 1 + valArr.length);
  chunkData.set(keyArr, 0);
  chunkData[keyArr.length] = 0; // Null separator
  chunkData.set(valArr, keyArr.length + 1);

  // 2. Prepare Full Chunk: Length (4) + Type (4) + Data + CRC (4)
  const chunkLen = chunkData.length;
  const fullChunkLen = 4 + 4 + chunkLen + 4;
  const fullChunk = new Uint8Array(fullChunkLen);

  const view = new DataView(fullChunk.buffer);
  
  // Length
  view.setUint32(0, chunkLen, false); // Big Endian
  
  // Type (tEXt)
  fullChunk.set(stringToUint8('tEXt'), 4);
  
  // Data
  fullChunk.set(chunkData, 8);
  
  // CRC (Calculated on Type + Data)
  const crcInput = fullChunk.subarray(4, 8 + chunkLen);
  const crcVal = crc32(crcInput);
  view.setUint32(8 + chunkLen, crcVal, false);

  // 3. Insert into PNG (After IHDR - usually byte 33)
  // IHDR is 13 bytes data + 12 bytes overhead = 25 bytes. 
  // Signature is 8 bytes.
  // Standard IHDR end is usually index 33 (8 + 25).
  const insertPos = 33; 

  const newPng = new Uint8Array(uint8.length + fullChunkLen);
  newPng.set(uint8.subarray(0, insertPos), 0);
  newPng.set(fullChunk, insertPos);
  newPng.set(uint8.subarray(insertPos), insertPos + fullChunkLen);

  return new Blob([newPng], { type: 'image/png' });
};

export const readPngMetadata = (pngBuffer: ArrayBuffer, key: string): string | null => {
  const data = new Uint8Array(pngBuffer);
  let offset = 8; // Skip PNG Signature

  const decoder = new TextDecoder();

  while (offset < data.length) {
    const view = new DataView(data.buffer);
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(...data.subarray(offset + 4, offset + 8));
    
    if (type === 'tEXt') {
        const chunkContent = data.subarray(offset + 8, offset + 8 + length);
        // Split by null separator
        let nullIndex = -1;
        for(let i=0; i<chunkContent.length; i++) {
            if(chunkContent[i] === 0) {
                nullIndex = i;
                break;
            }
        }

        if (nullIndex !== -1) {
            const chunkKey = String.fromCharCode(...chunkContent.subarray(0, nullIndex));
            if (chunkKey === key) {
                return String.fromCharCode(...chunkContent.subarray(nullIndex + 1));
            }
        }
    }

    // Move to next chunk: Length + Type(4) + Data(length) + CRC(4)
    offset += 12 + length;
    
    if (type === 'IEND') break;
  }

  return null;
};