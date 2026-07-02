// Build QRP v2 library packs from Affinity .afdesign radionic cards.
// Exports buildPack()/rebuildIndex() for build-all.mjs; also runnable as a CLI:
//   node af-to-pack.mjs <sourceDir|match:substr[,!excl]> <packId> <packName> <catId> <catLabel>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { extractCard } from './cardfields.mjs';
const require = createRequire('H:/QRP-Digby/QRP-dgby/');
const sharp = require('sharp');
const MiniSearch = createRequire('H:/QRP-Digby/qrp/')('minisearch');

export const BATCH = 'H:/QRP-Digby/assets/Cards Batch 2/2026 Radionic Cards';
export const QRP_PACKS = 'H:/QRP-Digby/qrp/public/packs';

// ---- helpers ----
export function walk(dir, pred, out=[]){ for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name);
  if(e.isDirectory()) walk(p,pred,out); else if(pred(e.name)) out.push(p);} return out; }
export const walkAfdesign = () => walk(BATCH, n=>n.endsWith('.afdesign')&&!n.startsWith('._'));
const norm = s => s.replace(/\.(afdesign|jpe?g|png)$/i,'').toLowerCase()
  .replace(/\s*copy(\s*\d+)?\s*$/,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60);

// ---- JPG twin index (built once, lazily) ----
let rasterIdx = null;
function jpgIndex(){
  if(rasterIdx) return rasterIdx;
  rasterIdx = new Map();
  for(const p of walk(path.join(BATCH,'JPG'), n=>/\.(jpe?g|png)$/i.test(n)&&!n.startsWith('._'))){
    const k = norm(path.basename(p)); if(!rasterIdx.has(k)) rasterIdx.set(k, p);
  }
  return rasterIdx;
}

// ---- embedded preview (largest portrait PNG = composite card render) ----
function embeddedPreview(afPath){
  const buf = fs.readFileSync(afPath); const hits=[];
  for(let i=0;i+8<=buf.length;i++){ if(buf[i]===0x89&&buf[i+1]===0x50&&buf[i+2]===0x4e&&buf[i+3]===0x47){
    let p=i+8,end=-1; while(p+8<=buf.length){ const len=buf.readUInt32BE(p); const t=buf.toString('ascii',p+4,p+8); p+=12+len; if(t==='IEND'){end=p;break;} if(len>buf.length)break; }
    if(end>0){ const w=buf.readUInt32BE(i+16),h=buf.readUInt32BE(i+20); hits.push({off:i,end,w,h}); i=end-1; }
  }}
  const cand = hits.filter(x=>x.h>x.w && x.w>=200).sort((a,b)=>a.off-b.off).pop() || hits.sort((a,b)=>a.off-b.off).pop();
  return cand ? buf.slice(cand.off, cand.end) : null;
}

// All embedded PNG + JPEG image blobs in an afdesign.
function embeddedImages(buf){
  const out=[];
  for(let i=0;i+8<=buf.length;i++){ if(buf[i]===0x89&&buf[i+1]===0x50&&buf[i+2]===0x4e&&buf[i+3]===0x47){
    let p=i+8,end=-1; while(p+8<=buf.length){ const len=buf.readUInt32BE(p); const t=buf.toString('ascii',p+4,p+8); p+=12+len; if(t==='IEND'){end=p;break;} if(len>buf.length)break; }
    if(end>0){ out.push(buf.slice(i,end)); i=end-1; }
  }}
  for(let i=0;i+3<buf.length;i++){ if(buf[i]===0xff&&buf[i+1]===0xd8&&buf[i+2]===0xff){
    let end=-1; for(let k=i+3;k+1<buf.length;k++){ if(buf[k]===0xff&&buf[k+1]===0xd9){ end=k+2; break; } }
    if(end>0){ out.push(buf.slice(i,end)); i=end-1; }
  }}
  return out;
}

// Find the isolated COLOURED centre symbol (e.g. a chakra glyph): a square-ish,
// reasonably-large, high-saturation placed image. Frames/logos are monochrome
// (low saturation) and the composite preview is mostly white → both rejected.
async function findColourSymbol(afPath){
  let best=null;
  for(const b of embeddedImages(fs.readFileSync(afPath))){
    let meta; try{ meta = await sharp(b).metadata(); }catch{ continue; }
    const w=meta.width, h=meta.height; if(!w||!h) continue;
    if(Math.min(w,h)<120) continue;
    const ar=w/h; if(ar<0.6||ar>1.6) continue;
    let sat=0; try{
      const { data, info } = await sharp(b).resize(24,24,{fit:'fill'}).removeAlpha().raw().toBuffer({ resolveWithObject:true });
      let s=0; const n=info.width*info.height;
      for(let i=0;i<n;i++){ const o=i*info.channels; s += Math.max(data[o],data[o+1],data[o+2]) - Math.min(data[o],data[o+1],data[o+2]); }
      sat = s/n;
    }catch{ continue; }
    if(sat<40) continue;
    if(!best || sat>best.sat || (Math.abs(sat-best.sat)<5 && Math.min(w,h)>Math.min(best.w,best.h))) best={ buf:b, w, h, sat };
  }
  return best;
}

// Key a source image's white background to transparent, preserving colour.
async function keyToTransparent(srcBuf, width){
  const { data, info } = await sharp(srcBuf).flatten({ background:'#ffffff' })
    .resize({ width }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width:W, height:H, channels } = info, n = W*H;
  const light = Buffer.alloc(n*4), dark = Buffer.alloc(n*4);
  for(let i=0;i<n;i++){
    const o=i*channels, r=data[o], g=data[o+1], b=data[o+2];
    const mn=Math.min(r,g,b), sat=Math.max(r,g,b)-mn, a=255-mn;
    light[i*4]=r; light[i*4+1]=g; light[i*4+2]=b; light[i*4+3]=a;
    if(sat<40){ dark[i*4]=255; dark[i*4+1]=255; dark[i*4+2]=255; } else { dark[i*4]=r; dark[i*4+1]=g; dark[i*4+2]=b; }
    dark[i*4+3]=a;
  }
  return { light, dark, raw:{ width:W, height:H, channels:4 } };
}

// Should the centre invert in dark mode? Only when it's sparse DARK line-art on a
// mostly white/transparent centre. NOT when it's a filled image — a coloured symbol
// (chakra) or a light photo (e.g. a diamond) — inverting those looks wrong.
function centreShouldInvert(buf, W, H){
  const R=Math.round(0.15*W), cx=Math.round(0.505*W), cy=Math.round(0.582*H);
  let total=0, col=0, fillLight=0;
  for(let y=cy-R;y<cy+R;y++){ if(y<0||y>=H)continue;
    for(let x=cx-R;x<cx+R;x++){ if(x<0||x>=W)continue;
      total++; const o=(y*W+x)*4, a=buf[o+3]; if(a<60) continue; // transparent = empty
      const r=buf[o],g=buf[o+1],b=buf[o+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b);
      if(mx-mn>50) col++;                              // coloured fill
      else if(0.3*r+0.59*g+0.11*b>=90) fillLight++;    // light/grey fill (photo)
      // else: dark opaque ink (line art)
    }}
  if(!total) return true;
  return (100*col/total < 8) && (100*fillLight/total < 12);
}

// ---- reference image -> webp light+dark, plus optional isolated centre symbol ----
async function writeRefImages(rec, imgDir, id){
  const jpg = jpgIndex().get(norm(rec.fnBase));
  const srcBuf = jpg ? fs.readFileSync(jpg) : embeddedPreview(rec.file);
  const srcKind = jpg ? 'jpg-twin' : (srcBuf ? 'embedded-preview' : 'none');
  if(!srcBuf) return { srcKind, invert:true };
  const full = await keyToTransparent(srcBuf, 756);
  await sharp(full.light, { raw:full.raw }).webp({ quality:82 }).toFile(path.join(imgDir, `${id}.webp`));
  await sharp(full.dark, { raw:full.raw }).webp({ quality:82 }).toFile(path.join(imgDir, `${id}.dark.webp`));
  // isolated coloured centre symbol (crisper than cropping the composite)
  const sym = await findColourSymbol(rec.file);
  let hasCenter=false;
  if(sym){
    const c = await keyToTransparent(sym.buf, 320);
    await sharp(c.light, { raw:c.raw }).webp({ quality:88 }).toFile(path.join(imgDir, `${id}.center.webp`));
    hasCenter=true;
  }
  // invert the cropped centre in dark mode only when it's sparse dark line-art on
  // a white/transparent centre (not a filled photo/symbol).
  const invert = hasCenter ? false : centreShouldInvert(full.light, full.raw.width, full.raw.height);
  return { srcKind, hasCenter, invert };
}

function buildSearch(packId, rems){
  const ms = new MiniSearch({ idField:'id', fields:['name','subheading','category','rateType'], storeFields:['name','category'] });
  ms.addAll(rems.map(r=>({ ...r, id:`${packId}:${r.id}` })));
  return JSON.stringify(ms);
}

export function rebuildIndex(){
  const packs=[];
  for(const d of fs.readdirSync(QRP_PACKS,{withFileTypes:true})){
    if(!d.isDirectory()) continue;
    const mfp = path.join(QRP_PACKS,d.name,'manifest.json'); if(!fs.existsSync(mfp)) continue;
    const mf = JSON.parse(fs.readFileSync(mfp,'utf8'));
    packs.push({ id:mf.id, name:mf.name, version:mf.version||'1', count:mf.remedies.length,
      categories:(mf.taxonomy||[]).map(t=>t.id),
      manifestUrl:`packs/${mf.id}/manifest.json`, searchIndexUrl:`packs/${mf.id}/search.json` });
  }
  packs.sort((a,b)=>a.id.localeCompare(b.id));
  fs.writeFileSync(path.join(QRP_PACKS,'index.json'),
    JSON.stringify({ generatedAt:'2026-07-02T00:00:00.000Z', packs }, null, 2)+'\n');
  return packs;
}

// Build ONE pack from an explicit file list. Returns { count, held, review }.
export async function buildPack(files, { packId, packName, catId, catLabel }){
  const outDir = path.join(QRP_PACKS, packId), imgDir = path.join(outDir,'img');
  fs.rmSync(outDir,{recursive:true,force:true}); fs.mkdirSync(imgDir,{recursive:true});
  const remedies=[], review=[], usedIds=new Set(), seenKey=new Set();
  for(const f of files){
    const r = extractCard(f);
    const held = (r.flags||[]).find(x=>['symbol-card','blank-template','no-rate','decompress-error'].includes(x));
    const dedupKey = norm(r.fnBase)+'|b'+r.base;
    const dup = seenKey.has(dedupKey);
    if(!held && !dup) seenKey.add(dedupKey);
    const row = { name:r.name, base:r.base, seq:(r.sequence||[]).join(' '), system:r.system,
      sub:r.subheadingText, rateType:r.rateType, flags:(r.flags||[]).join('|'),
      heldOrDup: held||(dup?'duplicate':''), file: path.relative(BATCH,f) };
    review.push(row);
    if(held || dup) continue;
    let id = slugify(r.name) || 'card';
    if(usedIds.has(id)) id = `${id}-b${r.base}`;
    let k=2; while(usedIds.has(id)){ id = `${slugify(r.name)}-${k++}`; }
    usedIds.add(id);
    const img = await writeRefImages(r, imgDir, id);
    row.image = img.srcKind + (img.hasCenter?'+sym':'');
    const image = { light:`img/${id}.webp`, dark:`img/${id}.dark.webp` };
    if(img.hasCenter) image.center = `img/${id}.center.webp`;
    if(img.invert) image.invert = true;
    remedies.push({ id, name:r.name, category:catId, base:r.base, sequence:r.sequence,
      subheading:r.subheadingText||undefined, rateType:r.rateType||undefined,
      source:r.system||undefined, image });
  }
  const manifest = { id:packId, name:packName, version:'1', taxonomy:[{id:catId,label:catLabel}], remedies };
  fs.writeFileSync(path.join(outDir,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'search.json'), buildSearch(packId, remedies)+'\n');
  const cols=['name','base','seq','system','sub','rateType','image','flags','heldOrDup','file'];
  const csv=[cols.join(',')].concat(review.map(r=>cols.map(c=>{ const v=String(r[c]??''); return /[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v; }).join(','))).join('\n');
  fs.writeFileSync(path.join('H:/QRP-Digby/tmp', `review-${packId}.csv`), csv);
  return { count:remedies.length, held:review.filter(r=>r.heldOrDup).length, review };
}

// ---- CLI ----
if(process.argv[1] && process.argv[1].endsWith('af-to-pack.mjs') && process.argv[2]){
  const [,, srcDir, packId, packName, catId, catLabel] = process.argv;
  let files;
  if(srcDir.startsWith('match:')){
    const terms = srcDir.slice(6).split(',').map(t=>t.trim().toLowerCase());
    const inc = terms.filter(t=>!t.startsWith('!')), exc = terms.filter(t=>t.startsWith('!')).map(t=>t.slice(1));
    files = walkAfdesign().filter(f=>{ const lp=f.toLowerCase(); return inc.some(t=>lp.includes(t)) && !exc.some(t=>lp.includes(t)); });
  } else files = walk(path.join(BATCH, srcDir), n=>n.endsWith('.afdesign')&&!n.startsWith('._'));
  const res = await buildPack(files, { packId, packName, catId, catLabel });
  const allPacks = rebuildIndex();
  console.log(`Pack ${packId}: ${res.count} remedies (${res.held} held/dup) from ${files.length} files`);
  console.log(`index.json lists ${allPacks.length} packs: ${allPacks.map(p=>p.id).join(', ')}`);
}
