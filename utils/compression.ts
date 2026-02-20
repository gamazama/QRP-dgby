
import { GeoConfig, Sequence } from '../types';
import { SUNFLOWER_PRESET } from '../constants';

// Map long keys to short keys for URL minification
const GEO_KEY_MAP: Record<keyof GeoConfig, string> = {
  showFrame: 'a',
  frameDoubleTop: 'b',
  frameScale: 'c',
  frameHeaderOffset: 'd',
  frameTickLength: 'e',
  frameStrokeWidth: 'f',
  uiFontSize: 'g',
  overallScale: 'h',
  mainScale: 'M',
  petals: 'i',
  petalSize: 'j',
  petalRoundness: 'k',
  lobeCount: 'l',
  lobeRadius: 'm',
  lobeType: 'n',
  lobeDesign: 'L',
  designScale: 'S',
  designOffset: 'O',
  centerDesign: 'K', // New
  lobeOpacity: 'E',
  centerOpacity: 'F',
  geometryRotation: 'R',
  dharmaExtrusionOut: 'o',
  dharmaExtrusionSide: 'p',
  dharmaStemWidth: 'q',
  dharmaCapHeight: 'r',
  ringInnerRadius: 's',
  stripeSep: 't',
  stripeStart: 'u',
  hullValley: 'v',
  hullCoverage: 'w',
  sequenceLength: 'x',
  shellScale: 'y',
  shellStroke: 'z',
  ringStroke: 'A',
  stripeStroke: 'B',
  uiFont: 'C',
  frameSquareHeader: 'H'
};

const REV_GEO_KEY_MAP = Object.entries(GEO_KEY_MAP).reduce((acc, [k, v]) => ({...acc, [v]: k}), {} as Record<string, keyof GeoConfig>);

const smartRound = (val: any): any => {
    if (typeof val === 'number') {
        // If it's effectively an integer, return integer
        if (Math.abs(val - Math.round(val)) < 0.0001) return Math.round(val);
        // Otherwise round to 3 decimal places to save chars (e.g. 0.333333 -> 0.333)
        return parseFloat(val.toFixed(3));
    }
    return val;
};

// Returns an object containing ONLY the keys from 'target' that differ from 'baseline'
// Keys are minified. Values are rounded.
const minifyGeoDiff = (target: GeoConfig, baseline: GeoConfig) => {
    const minGeo: Record<string, any> = {};
    
    // Iterate over all known keys in GeoConfig (using the MAP as the source of truth for keys we care about)
    (Object.keys(GEO_KEY_MAP) as Array<keyof GeoConfig>).forEach(key => {
        const targetVal = target[key];
        const baseVal = baseline[key];
        
        // Loose equality check for safety, but strict is fine if types are good.
        // We smartRound for comparison to avoid floating point drift causing false diffs.
        const rTarget = smartRound(targetVal);
        const rBase = smartRound(baseVal);

        if (rTarget !== rBase) {
             minGeo[GEO_KEY_MAP[key]] = rTarget;
        }
    });

    return minGeo;
};

// Reconstructs a full GeoConfig by applying minified diffs to a baseline
const inflateGeoDiff = (minDiff: any, baseline: GeoConfig): GeoConfig => {
    const newGeo: any = { ...baseline };
    
    if (!minDiff) return newGeo;

    for (const shortKey in minDiff) {
        const fullKey = REV_GEO_KEY_MAP[shortKey];
        if (fullKey) {
            newGeo[fullKey] = minDiff[shortKey];
        }
    }
    return newGeo;
};

// Legacy Inflator for V1/V2/V3 (Non-diff based)
const inflateGeoLegacy = (minGeo: any): GeoConfig => {
    const geoConfig: any = { ...SUNFLOWER_PRESET };
    for (const key in minGeo) {
        if (REV_GEO_KEY_MAP[key]) {
            const fullKey = REV_GEO_KEY_MAP[key];
            geoConfig[fullKey] = minGeo[key];
        } else {
            geoConfig[key] = minGeo[key];
        }
    }
    return geoConfig;
};

export const compressConfig = (geoConfig: GeoConfig, sequences: Sequence[], timingMs: number = 1500) => {
    // V4 Strategy:
    // 1. Establish a "Global Geometry" based on the ACTIVE (passed in) geoConfig (or the first sequence).
    //    We diff this against the SUNFLOWER_PRESET to minimize it.
    // 2. For each sequence, we diff its geoConfig against this "Global Geometry".
    //    In 99% of cases, they are identical, resulting in an empty object (which we can omit or make null).
    
    // The 'geoConfig' arg passed here is usually the active one. Let's use that as the Global Base.
    const globalBase = geoConfig;
    const minGlobalGeo = minifyGeoDiff(globalBase, SUNFLOWER_PRESET);

    const minSequences = sequences.map(s => {
        // Diff this sequence's geo against the global base
        const seqDiff = minifyGeoDiff(s.geoConfig, globalBase);
        
        const seqObj: any = {
            i: s.id,
            n: s.name,
            D: s.data.join('') // Minify array "0103"
        };

        // Only add description if it exists and is not empty
        if (s.description) seqObj.d = s.description;

        // Only add geometry diff if there ARE differences
        if (Object.keys(seqDiff).length > 0) {
            seqObj.g = seqDiff;
        }

        return seqObj;
    });

    const payload = {
        v: 4, 
        t: timingMs,
        G: minGlobalGeo, // Global Geo Diff (vs Preset)
        s: minSequences
    };

    const jsonStr = JSON.stringify(payload);
    // Use standard base64 but URI encoded to be URL safe
    return btoa(unescape(encodeURIComponent(jsonStr)));
};

export const decompressConfig = (encoded: string): { geoConfig: Partial<GeoConfig>, sequences: Sequence[], timingMs?: number } | null => {
    try {
        const jsonStr = decodeURIComponent(escape(atob(encoded)));
        const payload = JSON.parse(jsonStr);
        
        let sequences: Sequence[] = [];
        const timingMs = payload.t;

        // --- VERSION 4 (Diff Inheritance) ---
        if (payload.v === 4) {
             // 1. Reconstruct Global Base from Preset + Diff
             const globalBase = inflateGeoDiff(payload.G, SUNFLOWER_PRESET);

             sequences = payload.s.map((s: any) => {
                // 2. Reconstruct Sequence Geo from Global Base + Seq Diff
                const seqGeo = s.g ? inflateGeoDiff(s.g, globalBase) : { ...globalBase };

                let data: number[] = [];
                if (typeof s.D === 'string') {
                    data = s.D.split('').map((c: string) => parseInt(c, 10));
                } else if (Array.isArray(s.D)) {
                    data = s.D;
                }

                return {
                    id: s.i || Math.random(),
                    name: s.n || "Sequence",
                    description: s.d || "",
                    data: data,
                    geoConfig: seqGeo
                };
             });

             return { geoConfig: globalBase, sequences, timingMs };
        }

        // --- VERSION 3/2 (Embedded Geo, No inheritance) ---
        if ((payload.v === 3 || payload.v === 2) && Array.isArray(payload.s)) {
            sequences = payload.s.map((s: any) => {
                let data: number[] = [];
                if (typeof s.D === 'string') {
                    data = s.D.split('').map((c: string) => parseInt(c, 10));
                } else if (Array.isArray(s.D)) {
                    data = s.D;
                }

                return {
                    id: s.i || Math.random(),
                    name: s.n || "Sequence",
                    description: s.d || "",
                    data: data,
                    geoConfig: inflateGeoLegacy(s.g)
                };
            });
            
            return { geoConfig: sequences[0]?.geoConfig || {}, sequences, timingMs };
        }

        // --- VERSION 1 (Global Geo) ---
        if (payload.g) {
            const globalGeo = inflateGeoLegacy(payload.g);
            
            if (payload.s && Array.isArray(payload.s)) {
                sequences = payload.s.map((s: any) => {
                    let data: number[] = [];
                    if (Array.isArray(s.D)) data = s.D;
                    else if (typeof s.D === 'string') data = s.D.split('').map(Number);

                    return {
                        id: s.i || Math.random(),
                        name: s.n || "Sequence",
                        description: s.d || "",
                        data: data,
                        geoConfig: { ...globalGeo }
                    };
                });
            }
            return { geoConfig: globalGeo, sequences, timingMs };
        }

        return null;
    } catch (e) {
        console.error("Failed to decompress URL config", e);
        return null;
    }
};