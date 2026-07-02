// Consolidate all pack manifests into one committed master catalog (the durable,
// hand-refined source of truth). Edit this (or a copy) + run apply-catalog.mjs.
import fs from 'node:fs'; import path from 'node:path';
const PACKS='H:/QRP-Digby/qrp/public/packs';
const OUT='H:/QRP-Digby/qrp/scripts/pipeline/catalog.json';
const packs=[];
for(const d of fs.readdirSync(PACKS,{withFileTypes:true})){
  if(!d.isDirectory()) continue;
  const mfp=path.join(PACKS,d.name,'manifest.json'); if(!fs.existsSync(mfp)) continue;
  const mf=JSON.parse(fs.readFileSync(mfp,'utf8'));
  const origin = /-v2$/.test(mf.id) ? 'afdesign' : 'legacy-batch1';
  packs.push({ id:mf.id, name:mf.name, version:mf.version, origin, taxonomy:mf.taxonomy,
    remedies: mf.remedies.map(r=>({ id:r.id, name:r.name, subheading:r.subheading, category:r.category,
      base:r.base, sequence:r.sequence, source:r.source, rateType:r.rateType, image:r.image })) });
}
const total=packs.reduce((a,p)=>a+p.remedies.length,0);
fs.writeFileSync(OUT, JSON.stringify({ generatedAt:'2026-07-02', totalRemedies:total, packs }, null, 2)+'\n');
console.log(`catalog.json: ${packs.length} packs, ${total} remedies -> ${OUT}`);
