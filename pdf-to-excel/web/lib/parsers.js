// Schema v1 parsers. Browser port of pdf-to-excel/src/parsers.mjs.

export function parseRebarDia(s) {
  if (!s) return null;
  const m = String(s).match(/^D(\d+)$/);
  return m ? `D${m[1]}` : null;
}

export function parseRebarCount(s) {
  if (!s || s === '-') return null;
  const str = String(s).trim();
  const parenIdx = str.indexOf('(');
  const mainPart = parenIdx >= 0 ? str.slice(0, parenIdx) : str;
  const extra = parenIdx >= 0 ? str.slice(parenIdx) : null;
  const parts = mainPart.split('+').map(p => parseInt(p.trim()));
  if (parts.some(p => Number.isNaN(p))) return null;
  return {
    s1: parts[0] ?? null,
    s2: parts[1] ?? 0,
    s3: parts[2] ?? 0,
    extra,
  };
}

export function parseStirrup(s) {
  if (!s) return { dia: null, legs: null, pitch: null };
  const m = String(s).match(/^(D\d+)\[(\d+)\]@(\d+)$/);
  if (!m) return { dia: null, legs: null, pitch: null };
  return { dia: m[1], legs: parseInt(m[2]), pitch: parseInt(m[3]) };
}

export function parseDim(s) {
  if (!s || s === '-') return null;
  const n = parseInt(String(s).replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

export function mergeEndgap(eg1, eg2) {
  const pick = (a, b) => {
    if (a && a !== '-') return parseDim(a);
    if (b && b !== '-') return parseDim(b);
    return null;
  };
  return {
    a: pick(eg1?.a, eg2?.a),
    c: pick(eg1?.c, eg2?.c),
    b: pick(eg1?.b, eg2?.b),
  };
}

export function expandCompound(symbol) {
  if (!symbol) return [];
  const parts = String(symbol).split(',').map(p => p.trim()).filter(Boolean);
  return parts.map(p => {
    const m = p.match(/^\(?(FG\d+[A-Z]?)\)?$/);
    return m ? m[1] : p;
  });
}

// Normalize OCR noise where the × separator is doubled, mixed-case, or
// substituted by a similar glyph. Tesseract often returns "×" as "*",
// middle-dot "·", or Japanese middle-dot "・" when font hinting is poor.
// Examples: "H-300x150xX6.5x9", "H-346xX174xX6x9", "H-248X124x5x8",
//           "H-446*199*8*12", "H-446・199・8・12".
// Also accept "=" or "|" in place of "-" (common OCR confusion).
const normalizeSepX = s =>
  String(s)
    .replace(/^([A-Za-z])\s*[=|]\s*/, '$1-')  // "SH=" / "SH |" → "SH-"
    .replace(/[xX×*·・]+/g, 'x');

// JIS G 3192 standard rolled H-section catalog. The OCR commonly
// truncates section strings to "H-200×1" or drops decimal points
// ("65" instead of "6.5"). Since rolled H-sections are off-the-shelf
// products with fixed dimensions, looking up by height H (and optionally
// flange width B) restores the standard values reliably.
//   [H, B, tw, tf]
const JIS_H_SECTIONS = [
  // Narrow-flange (常用 小梁・大梁)
  [100,  50, 5,   7   ],
  [125,  60, 6,   8   ],
  [150,  75, 5,   7   ],
  [175,  90, 5,   8   ],
  [198,  99, 4.5, 7   ],
  [200, 100, 5.5, 8   ],
  [248, 124, 5,   8   ],
  [250, 125, 6,   9   ],
  [298, 149, 5.5, 8   ],
  [300, 150, 6.5, 9   ],
  [346, 174, 6,   9   ],
  [350, 175, 7,   11  ],
  [396, 199, 7,   11  ],
  [400, 200, 8,   13  ],
  [446, 199, 8,   12  ],
  [450, 200, 9,   14  ],
  [496, 199, 9,   14  ],
  [500, 200, 10,  16  ],
  [596, 199, 10,  15  ],
  [600, 200, 11,  17  ],
  [700, 300, 13,  24  ],
  [800, 300, 14,  26  ],
  [900, 300, 16,  28  ],
  // Wide-flange (主に大梁) + extra wide-deep variants
  [148, 100, 6,   9   ],
  [194, 150, 6,   9   ],
  [200, 200, 8,   12  ],
  [244, 175, 7,   11  ],
  [250, 250, 9,   14  ],
  [294, 200, 8,   12  ],
  [300, 300, 10,  15  ],
  [340, 250, 9,   14  ],
  [350, 350, 12,  19  ],
  [390, 300, 10,  16  ],
  [394, 398, 11,  18  ],
  [400, 400, 13,  21  ],
  [440, 300, 11,  18  ],
  [482, 300, 11,  15  ],
  [488, 300, 11,  18  ],
  [582, 300, 12,  17  ],
  [588, 300, 12,  20  ],
  [606, 201, 12,  20  ],
  [612, 202, 13,  23  ],
  [692, 300, 13,  20  ],
  [792, 300, 14,  22  ],
  [890, 299, 15,  23  ],
];

// Find the standard JIS H-section that matches a given height (and
// optionally a flange width). Returns [H, B, tw, tf] or null.
//
// Important: when B is provided but does NOT match any catalog entry,
// return null rather than guessing — the section is probably a custom /
// built-up shape that happens to share an H height with a JIS rolled
// section. Substituting JIS dimensions would silently corrupt the row.
function lookupJisH(H, B) {
  const sameH = JIS_H_SECTIONS.filter(s => s[0] === H);
  if (sameH.length === 0) return null;
  if (B == null) {
    // Height-only hint (e.g. OCR truncated to "H-200"). Best guess is
    // the narrow-flange variant since that's what 小梁 uses.
    return sameH.sort((a, b) => a[1] - b[1])[0];
  }
  // Look for exact B match
  const exact = sameH.find(s => s[1] === B);
  if (exact) return exact;
  // Allow small OCR drift (e.g. 100 vs 99 from optical noise)
  const close = sameH.find(s => Math.abs(s[1] - B) <= 5);
  if (close) return close;
  // No JIS variant fits — caller should keep the OCR values as-is.
  return null;
}

export function parseSection(s) {
  if (!s) return null;
  const cleaned = normalizeSepX(s);
  // Permissive match: 1-4 dimensions accepted. Truncated OCR like
  // "H-200x1" gives us H=200 + B=1, but the JIS lookup will rebuild
  // the full set from the standard catalog.
  const m = cleaned.match(/^(SH|BH|H|I|L|C)-?(\d+)(?:x(\d+(?:\.\d+)?))?(?:x(\d+(?:\.\d+)?))?(?:x(\d+(?:\.\d+)?))?/i);
  if (!m) return null;
  const prefix = m[1].toUpperCase();
  const kind = prefix === 'H' ? 'SH' : prefix;
  let H = parseInt(m[2]);
  let B  = m[3] != null ? parseFloat(m[3]) : null;
  let tw = m[4] != null ? parseFloat(m[4]) : null;
  let tf = m[5] != null ? parseFloat(m[5]) : null;

  // Plausibility for OCR noise: real rolled H sections are 100-1000 mm.
  // If H is impossibly large (>1500) it's almost always an OCR run-on
  // like "175" + "6" → "1756". Try dropping the last digit.
  if (H > 1500) {
    const truncated = parseInt(String(H).slice(0, -1));
    if (truncated >= 100 && truncated <= 1000) H = truncated;
    else return null;
  }
  // Same problem for B: "250" + "14" can be concatenated by OCR into
  // "25014" when the visual separator wasn't recognized. Split the
  // suspect B into (B, tw) at the most plausible boundary.
  if (B != null && B > 1500) {
    const sB = String(parseInt(B));
    for (const at of [sB.length - 2, sB.length - 1]) {
      const lead = parseInt(sB.slice(0, at));
      const tail = parseInt(sB.slice(at));
      if (lead >= 50 && lead <= 1000 && tail >= 4 && tail <= 50) {
        B = lead;
        // The old tw was actually tf; the tail digits become the real tw.
        tf = tw ?? tf;
        tw = tail;
        break;
      }
    }
  }
  // tw / tf > 50 means a missing decimal (e.g. "55" → "5.5", "75" → "7.5").
  if (tw && tw > 50) tw = tw / 10;
  if (tf && tf > 50) tf = tf / 10;

  // BH (built-up) sections aren't from the standard catalog; trust the
  // OCR digits as-is rather than substituting JIS values.
  if (kind === 'BH') {
    return { kind, H, B, tw, tf };
  }

  // Detect "B is just the first digit of a truncated width" (e.g. "H-200x1"
  // where "1" is the start of "100"). Drop the suspect B and let the JIS
  // lookup pick by height alone.
  if (B != null && B < 30) {
    B = null;
  }

  const jis = lookupJisH(H, B);
  let inferred = false;

  if (jis) {
    if (B == null) { B = jis[1]; inferred = true; }
    if (tw == null) { tw = jis[2]; inferred = true; }
    if (tf == null) { tf = jis[3]; inferred = true; }
    // Decimal-loss correction: tw=65 when JIS says 6.5
    if (tw && jis[2] && Math.abs(tw - jis[2] * 10) < 0.1) { tw = jis[2]; inferred = true; }
    if (tf && jis[3] && Math.abs(tf - jis[3] * 10) < 0.1) { tf = jis[3]; inferred = true; }
  }

  return { kind, H, B, tw, tf, _推定: inferred };
}

export function parseColumnSection(s) {
  if (!s) return null;
  const cleaned = normalizeSepX(s);

  // ----- H-section column (SH, BH, H prefix) -----
  // Same permissive matching + JIS backfill as parseSection.
  const hPrefix = cleaned.match(/^(SH|BH|H|I|L|C)-?(\d+)/i);
  if (hPrefix) {
    const h = cleaned.match(/^(SH|BH|H|I|L|C)-?(\d+)(?:x(\d+(?:\.\d+)?))?(?:x(\d+(?:\.\d+)?))?(?:x(\d+(?:\.\d+)?))?/i);
    const prefix = h[1].toUpperCase();
    const kind = prefix === 'H' ? 'SH' : prefix;
    const H = parseInt(h[2]);
    let B  = h[3] != null ? parseFloat(h[3]) : null;
    let tw = h[4] != null ? parseFloat(h[4]) : null;
    let tf = h[5] != null ? parseFloat(h[5]) : null;

    if (kind === 'BH') {
      // Built-up H: not in the standard catalog, return as-is.
      return { kind, H, B, tw, tf };
    }
    if (B != null && B < 30) B = null; // OCR-truncated first-digit
    const jis = lookupJisH(H, B);
    let inferred = false;
    if (jis) {
      if (B == null) { B = jis[1]; inferred = true; }
      if (tw == null) { tw = jis[2]; inferred = true; }
      if (tf == null) { tf = jis[3]; inferred = true; }
      if (tw && jis[2] && Math.abs(tw - jis[2] * 10) < 0.1) { tw = jis[2]; inferred = true; }
      if (tf && jis[3] && Math.abs(tf - jis[3] * 10) < 0.1) { tf = jis[3]; inferred = true; }
    }
    return { kind, H, B, tw, tf, _推定: inferred };
  }

  // ----- Square hollow section (□ / no prefix or □ロ口) -----
  // Different from H-section: the same (A, B) admits multiple wall thicknesses
  // (e.g. 700×700 ships with t = 19 / 22 / 25 / 28 / 32). We can't safely
  // pick one, so we ONLY accept t as the OCR gave it. If t is missing we
  // leave it null and surface a "_推定: 't不明'" flag so the user knows.
  const sq = cleaned.match(/^(?:[□ロ口])?-?(\d+)x(\d+)(?:x(\d+))?(?:\(([A-Z]+\d+)\))?/i);
  if (sq) {
    const A = parseInt(sq[1]);
    const B = parseInt(sq[2]);
    const tRaw = sq[3] != null ? parseInt(sq[3]) : null;
    return {
      kind: '□',
      A, B,
      t: tRaw,
      grade: sq[4] || null,
      _推定: tRaw == null ? 't不明' : false,
    };
  }
  return null;
}

export function normalizeGrid(startList, endList) {
  const start = startList[0] || null;
  const end = endList[endList.length - 1] || startList[startList.length - 1] || null;
  return { start, end };
}

const CATEGORY_MAP = {
  FG:  { kind: 'RC基礎大梁',  sheetName: '基礎大梁 (RC)', construction: 'RC', element: '基礎大梁' },
  G:   { kind: 'RC大梁',       sheetName: '大梁 (RC)',     construction: 'RC', element: '大梁'    },
  B:   { kind: 'RC小梁',       sheetName: '小梁 (RC)',     construction: 'RC', element: '小梁'    },
  CG:  { kind: 'RC片持ち大梁', sheetName: '大梁 (RC)',     construction: 'RC', element: '大梁'    },
  CB:  { kind: 'RC片持ち小梁', sheetName: '小梁 (RC)',     construction: 'RC', element: '小梁'    },
  SG:  { kind: 'S大梁',         sheetName: '大梁 (S)',     construction: 'S',  element: '大梁'    },
  SB:  { kind: 'S小梁',         sheetName: '小梁 (S)',     construction: 'S',  element: '小梁'    },
  CSG: { kind: 'S片持ち大梁',  sheetName: '大梁 (S)',     construction: 'S',  element: '大梁'    },
  C:   { kind: 'RC柱',          sheetName: '柱 (RC)',      construction: 'RC', element: '柱'     },
  SC:  { kind: 'S柱',           sheetName: '柱 (S)',       construction: 'S',  element: '柱'     },
  CC:  { kind: '合成柱',        sheetName: '柱 (SRC)',     construction: '合成', element: '柱'   },
  CFT: { kind: 'CFT柱',         sheetName: '柱 (CFT)',     construction: 'CFT', element: '柱'   },
};

export function detectCategory(symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return { kind: '不明', sheetName: '未分類', construction: '?', element: '?' };
  }
  const counts = {};
  for (const s of symbols) {
    const m = String(s).match(/^([A-Z]+)/i);
    if (!m) continue;
    const p = m[1].toUpperCase();
    counts[p] = (counts[p] || 0) + 1;
  }
  const dominant = Object.entries(counts).sort((a,b) => b[1] - a[1])[0]?.[0];
  return CATEGORY_MAP[dominant] || { kind: `不明(${dominant})`, sheetName: '未分類', construction: '?', element: '?' };
}
