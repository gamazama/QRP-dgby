// Apply the master catalog back to the shipped packs: rewrites each pack's
// manifest.json from catalog.json, rebuilds search.json + index.json. Images in
// img/ are left untouched (regenerate them from afdesign via build-all if needed).
//   node apply-catalog.mjs [path-to-catalog.json]
import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));      // scripts/pipeline/afdesign
const QRP = path.resolve(HERE, '../../..');                     // qrp/
const MiniSearch = createRequire(path.join(QRP, 'package.json'))('minisearch');
const PACKS = path.join(QRP, 'public/packs');
const CAT = process.argv[2] || path.join(HERE, '..', 'catalog.json');
const cat=JSON.parse(fs.readFileSync(CAT,'utf8'));
const clean=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined&&v!==null&&v!==''));
const summaries=[];
for(const p of cat.packs){
  const dir=path.join(PACKS,p.id); fs.mkdirSync(dir,{recursive:true});
  const remedies=p.remedies.map(r=>clean({ id:r.id, name:r.name, category:r.category, base:r.base,
    sequence:r.sequence, subheading:r.subheading, rateType:r.rateType, source:r.source, image:r.image }));
  fs.writeFileSync(path.join(dir,'manifest.json'),
    JSON.stringify({ id:p.id, name:p.name, version:p.version||'1', taxonomy:p.taxonomy, remedies },null,2)+'\n');
  const ms=new MiniSearch({ idField:'id', fields:['name','subheading','category','rateType'], storeFields:['name','category'] });
  ms.addAll(remedies.map(r=>({ ...r, id:`${p.id}:${r.id}` })));
  fs.writeFileSync(path.join(dir,'search.json'), JSON.stringify(ms)+'\n');
  summaries.push({ id:p.id, name:p.name, version:p.version||'1', count:remedies.length,
    categories:(p.taxonomy||[]).map(t=>t.id), manifestUrl:`packs/${p.id}/manifest.json`, searchIndexUrl:`packs/${p.id}/search.json` });
}
summaries.sort((a,b)=>a.id.localeCompare(b.id));
fs.writeFileSync(path.join(PACKS,'index.json'), JSON.stringify({ generatedAt:'2026-07-02T00:00:00.000Z', packs:summaries },null,2)+'\n');
console.log(`applied catalog: ${summaries.length} packs, ${summaries.reduce((a,p)=>a+p.count,0)} remedies`);
