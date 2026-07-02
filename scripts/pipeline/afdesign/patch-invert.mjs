// Set image.invert per-card across ALL packs, based on whether the card's centre
// region is monochrome line-art (invert in dark) or coloured (leave). Cards that
// already have an isolated colour centre symbol (image.center) are left as-is.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire('H:/QRP-Digby/QRP-dgby/')('sharp');
const PACKS = 'H:/QRP-Digby/qrp/public/packs';

// Centre crop geometry (matches CardSurface photo-circle): centre (0.505w, 0.582h), radius 0.15w.
// Invert only when the centre is sparse DARK line-art on a white/transparent centre
// — NOT a coloured symbol or a light photo (e.g. a diamond).
async function centreShouldInvert(file){
  const meta = await sharp(file).metadata();
  const W = meta.width, H = meta.height;
  const R = Math.round(0.15 * W);
  const left = Math.max(0, Math.round(0.505*W - R));
  const top  = Math.max(0, Math.round(0.582*H - R));
  const w = Math.min(W-left, 2*R), h = Math.min(H-top, 2*R);
  const { data, info } = await sharp(file).extract({ left, top, width:w, height:h })
    .resize(40,40,{fit:'fill'}).ensureAlpha().raw().toBuffer({ resolveWithObject:true });
  let total=0, col=0, fillLight=0; const n=info.width*info.height;
  for(let i=0;i<n;i++){ const o=i*info.channels, a=data[o+3]; total++; if(a<60) continue;
    const r=data[o],g=data[o+1],b=data[o+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b);
    if(mx-mn>50) col++; else if(0.3*r+0.59*g+0.11*b>=90) fillLight++; }
  if(!total) return true;
  return (100*col/total < 8) && (100*fillLight/total < 12);
}

const only = process.argv.slice(2); // optional list of pack ids; default all
let changed=0, skipped=0;
for(const d of fs.readdirSync(PACKS,{withFileTypes:true})){
  if(!d.isDirectory()) continue;
  if(only.length && !only.includes(d.name)) continue;
  const mfp = path.join(PACKS,d.name,'manifest.json'); if(!fs.existsSync(mfp)) continue;
  const mf = JSON.parse(fs.readFileSync(mfp,'utf8'));
  let packChanged=0;
  for(const r of mf.remedies){
    if(!r.image) continue;
    if(r.image.center){ if(r.image.invert){ delete r.image.invert; packChanged++; } continue; } // coloured symbol -> never invert
    const file = path.join(PACKS,d.name,r.image.light);
    if(!fs.existsSync(file)) continue;
    let inv=false; try{ inv = await centreShouldInvert(file); }catch{ continue; }
    if(inv && !r.image.invert){ r.image.invert=true; packChanged++; }
    else if(!inv && r.image.invert){ delete r.image.invert; packChanged++; }
  }
  if(packChanged){ fs.writeFileSync(mfp, JSON.stringify(mf,null,2)+'\n'); changed+=packChanged; console.log(`${d.name}: ${packChanged} updated`); }
  else skipped++;
}
console.log(`\nTotal invert flags updated: ${changed}; packs unchanged: ${skipped}`);
