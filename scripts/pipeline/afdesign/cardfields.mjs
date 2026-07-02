import path from 'node:path';
import { textRuns } from './textobjs.mjs';

// Boilerplate / template text to ignore when picking heading/subheading.
const BOILER = new Set(['QLP','NAME','Category','H E A L I N G','00','','Created with blocklayer.com','Endnotes']);
const isPunct = s => /^[^A-Za-z0-9]+$/.test(s);
const isRateType = s => /\brate\b|sulis|combe|base\s*\d/i.test(s);
// Placeholder / unfilled-template markers (case-insensitive).
const isPlaceholder = s => /^(name|category|add\s*category|add\s*name|xx+\s*xx+|0+)$/i.test((s||'').trim());

// Extract the leading numeric rate portion from a run. Separators used on cards
// include space, middle-dot (·), bullet, slash. A rate sometimes fuses with the
// next text object ("4 6 1 9 1 3CATEGORY") -> take the leading digit/sep run.
function rateStr(s){
  const norm = s.replace(/[·•/,]/g,' ');       // ·, •, /, , -> space
  const m = norm.match(/^\s*\d[\d\s]*/);                  // leading digits+spaces
  if(!m) return null;
  const t = m[0].replace(/\s+/g,' ').trim();
  const digits = t.replace(/\D/g,'');
  if(digits.length<2) return null;                        // need >=2 digits
  if(/^0+$/.test(digits)) return null;                    // "00" placeholder
  return t;
}

// base from a rateType string like "Base 9 Rate (336 - Combe)" or "Base 44 Rate (Combe)"
function baseFromText(s){ const m = s && s.match(/base\s*(\d+)/i); return m?parseInt(m[1],10):null; }
function baseFromName(name){
  if(/base\s*44|\bb\s*44\b/i.test(name)) return 44;
  if(/base\s*10|\bb\s*10\b/i.test(name)) return 10;
  if(/base\s*9|\bb\s*9\b|\(336\)/i.test(name)) return 9;
  return null;
}
function systemFromText(rt){
  if(/sulis/i.test(rt)) return 'Sulis';
  if(/combe/i.test(rt)) return 'Combe';
  return null;
}

// Parse a rate string into a value[] given the base. Rate length is VARIABLE
// (= number of ticks on the card), so we don't enforce a fixed count.
//  base 9  -> values are single digits 1..9. Tokens may be single ("4 8 5"),
//             2-digit zero-padded ("03 07"->3,7), concatenated ("871653"), or
//             merged ("4 4 58 6 9"). Rule: per token, keep if <=9 else split digits.
//  base 44 -> space-separated values 1..44 (usually 2-digit zero-padded)
//  base 10 -> space-separated single digits 0..10
function parseRate(str, base){
  const toks = str.trim().split(/\s+/).filter(Boolean);
  // base 44/10 mislabel guard: a single concatenated over-range token (e.g.
  // "35998" on a card wrongly labelled Base 44) is really a base-9 digit string.
  if((base===44||base===10) && toks.length===1 && /^\d{4,6}$/.test(toks[0]) && Number(toks[0])>maxVal(base)){
    return toks[0].split('').map(Number);
  }
  if(base===9){
    const out=[];
    for(const t of toks){
      const n = parseInt(t,10);
      if(Number.isFinite(n) && n>=0 && n<=9) out.push(n);
      else for(const d of t.replace(/\D/g,'')) out.push(Number(d)); // split merged/concatenated
    }
    return out;
  }
  return toks.map(Number).filter(n=>Number.isFinite(n));
}
function maxVal(base){ return base===44?44 : base===10?10 : base===9?9 : 99; }

// Title-case, keeping small connective words lowercase (not first word). Also
// fixes "phys.etheric" -> "Phys. Etheric" and capitalizes inside parens "(brow)".
const SMALL = new Set(['of','the','to','a','an','and','or','for','in','on','at','by','with','from']);
function titleCase(s){
  return s.toLowerCase()
    .replace(/\.([a-z])/g,'. $1')            // dotted run -> spaced
    .replace(/\s+/g,' ').trim()
    .split(' ')
    .map((w,i)=> (i>0 && SMALL.has(w)) ? w : w.replace(/(^|\()([a-z])/,(m,p,c)=>p+c.toUpperCase()))
    .join(' ');
}
// Strip a trailing rate leak (3+ space-separated 1-2 digit groups) from a name.
function cleanName(n){ return n.replace(/\s+\d{1,2}( \d{1,2}){2,}\s*$/,'').replace(/\s*-\s*$/,'').trim(); }

// Segments in a filename that are metadata (category / design / base / element),
// not part of the card's actual name. Used to trim the " - "-delimited tail.
const META_SEG = /^(sb|qrp|bc|ayur|soham|sulis|chakra|subtle body|sublte body|emotions?|emotions?\/?fear|mind|mind states?|mind all( to sort)?|body|physical( etheric)?|astral|etheric|ether|mental|base\s*\d.*|b\s*\d+|\(336\)|fear|feer|love|uplift|recieve|receive|divine|peace|spiritual|soul|life|command|remove|balance|yin|yan|air|earth|water|fire|spirit|am|combe|gi|br\.?\s*\d*\.?|template card|f\.?\s*e\.?.*|flowers?|ayur|tridosha|t\.?c\.?.*)$/i;
// Leading category prefixes like "BODY- ", "CHAKRA- ", "Mind - ".
const LEAD_PREFIX = /^(body|chakra|mind|emotions?|soham|subtle body)\s*[-:]\s*/i;

// Category-ish text: a subheading/category rather than a specific card name.
// Matches a leading category word (prefix, no \b so plurals like "Emotions"
// match) OR anything containing "/" (e.g. "Soul/Uplift", "Subtle Body / Chakra").
// A category word, matched WHOLE (so "Emotions"/"Body" match but "BODY PHYSICAL
// ETHERIC HEART" does not).
const CATEGORY_WORD = /^(subtle body|sublte body|mental|emotions?|chakra|body|mind|mind states?|soham|soul|spirit|uplift|fear|feer|love|peace|divine|receive|recieve|ayur|ayurvedic|physical|astral|etheric|ether|command|mantra|patholog\w*|constitution|tridosha|attitude|principle|stress|confidence|sacred geometry)$/i;
// A subheading is EITHER exactly a category word, OR "Category / something"
// (category before the slash). A bare "/" alone is NOT enough — a NAME can carry
// one, e.g. "ALIGN ASTRAL BODY / PHYSICAL BODY".
function isSubheadingish(s){
  const t=(s||'').trim();
  if(t.includes('/')) return CATEGORY_WORD.test(t.split('/')[0].trim());
  return CATEGORY_WORD.test(t);
}

// Trim a name string (filename OR heading) down to the specific card name:
// drop the metadata / category / base tail and any leading category prefix.
function trimName(s){
  let n = s.replace(/\.(afdesign|jpe?g|png)$/i,'')
    .replace(/\s*copy(\s*\d+)?\s*$/i,'');  // "copy", "copy 3"
  // NB: do NOT strip a trailing bare number here — potencies like "Blood Pressure
  // 200" / "Diabetes 30" are part of the name. Copy-index " 2" lives in the dropped
  // base segment (e.g. "Base 9 (336) 2"), so it's removed by the meta-tail trim.
  const parts = n.split(/\s*-\s*/).map(s=>s.trim());
  const keep=[];
  for(let i=0;i<parts.length;i++){
    if(i>0 && (isSubheadingish(parts[i]) || META_SEG.test(parts[i]) || /base\s*\d|\(336\)/i.test(parts[i]))) break;
    keep.push(parts[i]);
  }
  n = keep.join(' - ').replace(LEAD_PREFIX,'').trim();
  return n.replace(/\s*-\s*$/,'').trim();
}
const GENERIC_NAME = /^(subtle body|sublte body|chakra|emotions?|mind|body|base|name|category|soham|sacred geometry|uplift|mental)$/i;

export function extractCard(afPath){
  const fnBase = path.basename(afPath).replace(/\.afdesign$/i,'');
  let runs = [];
  try { runs = textRuns(afPath); } catch(e){ return { file: afPath, error: e.message, flags:['decompress-error'] }; }
  // Apple Pages appends a big TOC/endnotes boilerplate block (multilingual
  // "See"/"above"/… ) after an "Endnotes" marker — cut it off.
  const endIdx = runs.indexOf('Endnotes');
  if(endIdx>=0) runs = runs.slice(0,endIdx);

  // Template-duplicate cards keep MORE THAN ONE rate label (a default "…Combe"
  // plus the real "…Sulis"). Detect the system from the filename OR any label
  // (Sulis wins), then use the matching label as the canonical rateType.
  const rateLabels = runs.filter(isRateType);
  const system = (/sulis/i.test(fnBase) || rateLabels.some(r=>/sulis/i.test(r))) ? 'Sulis'
    : (rateLabels.some(r=>/combe/i.test(r)) || /combe/i.test(fnBase)) ? 'Combe'
    : (/soham/i.test(fnBase) ? 'Soham' : null);
  const rateTypeRun = (system && rateLabels.find(r=>new RegExp(system,'i').test(r))) || rateLabels[0] || '';
  const base = baseFromText(rateTypeRun) ?? baseFromName(fnBase);

  // candidate rate runs (exclude ALL rate labels — Combe AND Sulis)
  const rateCands = runs.filter(s => !isRateType(s)).map(rateStr).filter(Boolean);
  const mx = maxVal(base);
  let chosen=null, sequence=[];
  const scored = rateCands.map(s=>{ const seq=parseRate(s,base); return {s,seq}; });
  // prefer in-range with a plausible count (>=2); else longest; else first
  chosen = scored.filter(c=> c.seq.length>=2 && c.seq.every(v=>v>=0&&v<=mx))
                 .sort((a,b)=>b.seq.length-a.seq.length)[0]
        || scored.sort((a,b)=>b.seq.length-a.seq.length)[0] || null;
  if(chosen){ sequence = chosen.seq; }

  // heading / subheading: non-boilerplate, non-rate, non-rateType text.
  // The card prints BOTH a category (subheading) and the specific name (heading),
  // sometimes both ALL-CAPS. Pick the category-ish run as subheading; the other
  // is the heading. Category-ish = a known category word or contains "/".
  const textish = runs.filter(s => !BOILER.has(s) && !isPlaceholder(s) && !isPunct(s)
                                   && !isRateType(s) && !rateStr(s));
  const isAllCaps = s => /[A-Z]/.test(s) && s===s.toUpperCase() && /[A-Z]{2,}/.test(s);
  // subheading = the category run. Prefer the composite "Subtle Body / X" (has "/"),
  // then a "Subtle Body…" run, then a non-ALLCAPS category (names are usually caps).
  const subCands = textish.filter(s => isSubheadingish(s) && s.length<=34);
  const subheadingRaw = subCands.find(s=>s.includes('/'))
    || subCands.find(s=>/^s(?:u|ub)?[a-z]* body/i.test(s))
    || subCands.find(s=>!isAllCaps(s)) || subCands[0] || '';
  const subheadingText = subheadingRaw.replace(/sublte body/ig,'Subtle Body'); // source typo
  // heading = the specific name. Prefer an ALL-CAPS non-subheading run, else the
  // longest remaining textish run.
  const nameCands = textish.filter(s => s!==subheadingRaw);
  // Prefer the LONGEST ALL-CAPS run (real names beat stray fragments like "UTLE
  // BODY"); else the longest remaining run.
  const capsCands = nameCands.filter(isAllCaps).sort((a,b)=>b.length-a.length);
  const headingText = capsCands[0] || nameCands.slice().sort((a,b)=>b.length-a.length)[0] || '';

  // is this an unfilled template? (placeholder name/rate, no real content)
  const hasPlaceholder = runs.some(s=>isPlaceholder(s) || /^x+ x+$/i.test(s));
  const isSymbol = /sacred geometry|merkaba|metatron|vesica|torus|tree of life|flower of life|seed of life|egg of life|fruit of life|grid of life|germ of life|star of david|vector equilibrium|unn?amed/i.test(fnBase);

  // name: prefer the card's own heading (the specific title). Fall back to the
  // filename when the heading is generic/placeholder (e.g. SULIS cards whose
  // heading is just "Subtle Body"). trimName drops category/design/base tails.
  const headClean = trimName(headingText);
  const headOk = headClean && !isPlaceholder(headingText) && !GENERIC_NAME.test(headClean) && /[A-Za-z]/.test(headClean);
  const fileName = trimName(fnBase);
  const src = headOk ? headClean : (fileName && !GENERIC_NAME.test(fileName) ? fileName : (fileName || headClean));
  let name = cleanName(titleCase(src));
  // flags
  const flags=[];
  if(!base && !isSymbol) flags.push('no-base');
  if(!chosen || !sequence.length){
    if(isSymbol) flags.push('symbol-card');
    else if(hasPlaceholder || !headingText) flags.push('blank-template');
    else flags.push('no-rate');
  } else {
    if(sequence.length<2) flags.push(`short(${sequence.length})`);
    if(sequence.some(v=>v<0||v>mx)) flags.push('value-out-of-range');
    if(rateCands.length>1) flags.push(`multi-rate(${rateCands.length})`);
  }

  return {
    file: afPath, fnBase, name, fileName, headingText, subheadingText,
    base, system, rateType: rateTypeRun,
    rateRaw: chosen?chosen.s:'', sequence, flags,
  };
}

// CLI: print a few
if(process.argv[1] && process.argv[1].endsWith('cardfields.mjs') && process.argv[2]){
  for(const f of process.argv.slice(2)){
    const r = extractCard(f);
    console.log(JSON.stringify(r));
  }
}