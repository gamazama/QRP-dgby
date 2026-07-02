import fs from 'node:fs';
import path from 'node:path';
const PACKS='H:/QRP-Digby/qrp/public/packs';
const src = rt => !rt?undefined : /sulis/i.test(rt)?'Sulis' : /combe/i.test(rt)?'Combe' : undefined;
let changed=0;
for(const d of fs.readdirSync(PACKS,{withFileTypes:true})){
  if(!d.isDirectory()) continue;
  const mfp=path.join(PACKS,d.name,'manifest.json'); if(!fs.existsSync(mfp)) continue;
  const mf=JSON.parse(fs.readFileSync(mfp,'utf8')); let c=0;
  for(const r of mf.remedies){ if(!r.source){ const s=src(r.rateType); if(s){ r.source=s; c++; } } }
  if(c){ fs.writeFileSync(mfp, JSON.stringify(mf,null,2)+'\n'); changed+=c; console.log(`${d.name}: +${c} source`); }
}
console.log('total source set:',changed);
