// Generate ALL batch-2 afdesign packs in one pass, each card in exactly one pack.
import fs from 'node:fs';
import path from 'node:path';
import { buildPack, rebuildIndex, walkAfdesign, BATCH, QRP_PACKS } from './af-to-pack.mjs';

const PACKS = {
  'chakras':         { packId:'chakras-v2',          packName:'Chakras (v2)',         catId:'chakras',         catLabel:'Chakras' },
  'emotions':        { packId:'emotions-v2',         packName:'Emotions (v2)',        catId:'emotions',        catLabel:'Emotions' },
  'subtle-bodies':   { packId:'subtle-bodies-v2',    packName:'Subtle Bodies (v2)',   catId:'subtle-bodies',   catLabel:'Subtle Bodies' },
  'body':            { packId:'body-v2',             packName:'Body (v2)',            catId:'body',            catLabel:'Body' },
  'mind':            { packId:'mind-v2',             packName:'Mind (v2)',            catId:'mind',            catLabel:'Mind' },
  'soham':           { packId:'soham-v2',            packName:'Soham (v2)',           catId:'soham',           catLabel:'Soham' },
  'sacred-geometry': { packId:'sacred-geometry-v2',  packName:'Sacred Geometry (v2)', catId:'sacred-geometry', catLabel:'Sacred Geometry' },
  'misc':            { packId:'misc-v2',             packName:'Miscellaneous (v2)',   catId:'misc',            catLabel:'Miscellaneous' },
};

// Assign one afdesign to a pack key, by path. Chakra wins wherever it lives.
function classify(f){
  const rel = path.relative(BATCH, f).toLowerCase().replace(/\\/g,'/');
  if(rel.includes('chakra')) return 'chakras';
  const parts = rel.split('/');
  const cat = (parts[0]==='affinity' ? parts[1] : parts[0]) || '';
  if(cat.includes('ancient sacred symbol')) return 'sacred-geometry';
  if(cat.includes('body mental astral'))     return 'body';
  if(cat.startsWith('mind all'))             return 'mind';
  if(cat.includes('soham berkeleys'))        return 'soham';
  if(cat === 'emotions')                     return 'emotions';
  if(cat.includes('subtle bodies'))          return 'subtle-bodies';
  return 'misc'; // mantra, pathology, physical-constitutions, t.c field, human physiology, anything else
}

const groups = {};
for(const f of walkAfdesign()) (groups[classify(f)] ??= []).push(f);

// drop the stale pilot dir (superseded by emotions-v2)
fs.rmSync(path.join(QRP_PACKS,'emotions-v1'),{recursive:true,force:true});

console.log('Building packs...\n');
for(const [key,cfg] of Object.entries(PACKS)){
  const files = groups[key]||[];
  const res = await buildPack(files, cfg);
  console.log(`  ${cfg.packId.padEnd(20)} ${String(res.count).padStart(3)} remedies  (${res.held} held/dup, ${files.length} files)`);
}
const all = rebuildIndex();
const total = walkAfdesign().length;
const assigned = Object.values(groups).reduce((a,g)=>a+g.length,0);
console.log(`\nCoverage: ${assigned}/${total} afdesign assigned`);
console.log('index.json packs:', all.map(p=>`${p.id}(${p.count})`).join(', '));
