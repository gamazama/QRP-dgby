import fs from 'node:fs';
import zlib from 'node:zlib';

export function zstdFrameEnd(b, off){
  if(!(b[off]===0x28&&b[off+1]===0xb5&&b[off+2]===0x2f&&b[off+3]===0xfd))return -1;
  let p=off+4; if(p>=b.length)return -1; const fhd=b[p++];
  const fcsFlag=fhd>>6, singleSeg=(fhd>>5)&1, checksum=(fhd>>2)&1, didFlag=fhd&3;
  if(!singleSeg)p+=1; p+=[0,1,2,4][didFlag];
  let fcsSize; if(fcsFlag===0)fcsSize=singleSeg?1:0; else fcsSize=[0,2,4,8][fcsFlag]; p+=fcsSize;
  while(true){ if(p+3>b.length)return -1; const bh=b[p]|(b[p+1]<<8)|(b[p+2]<<16); p+=3;
    const last=bh&1, bt=(bh>>1)&3, bs=bh>>3;
    if(bt===0||bt===2)p+=bs; else if(bt===1)p+=1; else return -1;
    if(p>b.length)return -1; if(last)break; }
  if(checksum)p+=4; return p;
}
export function decompAll(buf){
  const magic=[0x28,0xb5,0x2f,0xfd]; const chunks=[]; let i=0;
  while(i+4<=buf.length){
    if(buf[i]===magic[0]&&buf[i+1]===magic[1]&&buf[i+2]===magic[2]&&buf[i+3]===magic[3]){
      const end=zstdFrameEnd(buf,i);
      if(end>i){ try{ chunks.push(zlib.zstdDecompressSync(buf.slice(i,end))); i=end; continue;}catch(_){}} }
    i++; }
  return chunks;
}

// Affinity text runs: marker "+8ftU" (0x2b 38 66 74 55) + uint32LE len + UTF-8 bytes
const MARK = Buffer.from([0x2b,0x38,0x66,0x74,0x55]);
const SEP = new RegExp('[\u2028\u2029\u0000]', 'g'); // para/line separators + NUL
export function textRuns(file){
  const chunks = decompAll(fs.readFileSync(file));
  const out = [];
  for(const c of chunks){
    let idx = c.indexOf(MARK, 0);
    while(idx>=0){
      const lenPos = idx+5;
      if(lenPos+4<=c.length){
        const len = c.readUInt32LE(lenPos);
        if(len>0 && len<100000 && lenPos+4+len<=c.length){
          const raw = c.slice(lenPos+4, lenPos+4+len);
          let s = raw.toString('utf8').replace(SEP,' ').replace(/\s+/g,' ').trim();
          if(s) out.push(s);
        }
      }
      idx = c.indexOf(MARK, idx+1);
    }
  }
  const seen=new Set(); const uniq=[];
  for(const s of out){ if(!seen.has(s)){seen.add(s);uniq.push(s);} }
  return uniq;
}

if(process.argv[1] && process.argv[1].endsWith('textobjs.mjs') && process.argv[2]){
  for(const f of process.argv.slice(2)){
    console.log('\n### '+f.split(/[\\/]/).pop());
    for(const s of textRuns(f)) console.log('  ',JSON.stringify(s));
  }
}