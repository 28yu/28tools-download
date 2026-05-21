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

// Normalize OCR noise where the × separator is doubled or mixed-case,
// e.g. "H-300x150xX6.5x9" / "H-346xX174xX6x9" / "H-248X124x5x8".
const normalizeSepX = s => String(s).replace(/[xX×]+/g, 'x');

export function parseSection(s) {
  if (!s) return null;
  const cleaned = normalizeSepX(s);
  const m = cleaned.match(/^(SH|BH|H|I|L|C)-?(\d+)x(\d+)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i);
  if (!m) return null;
  const prefix = m[1].toUpperCase();
  const kind = prefix === 'H' ? 'SH' : prefix;
  return {
    kind,
    H:  parseInt(m[2]),
    B:  parseInt(m[3]),
    tw: parseFloat(m[4]),
    tf: parseFloat(m[5]),
  };
}

export function parseColumnSection(s) {
  if (!s) return null;
  const cleaned = normalizeSepX(s);
  const h = cleaned.match(/^(SH|BH|H|I|L|C)-?(\d+)x(\d+)x(\d+)x(\d+)/i);
  if (h) {
    const prefix = h[1].toUpperCase();
    const kind = prefix === 'H' ? 'SH' : prefix;
    return { kind, H: parseInt(h[2]), B: parseInt(h[3]), tw: parseInt(h[4]), tf: parseInt(h[5]) };
  }
  const sq = cleaned.match(/^(?:[□ロ口])?-?(\d+)x(\d+)x(\d+)(?:\(([A-Z]+\d+)\))?/i);
  if (sq) {
    return { kind: '□', A: parseInt(sq[1]), B: parseInt(sq[2]), t: parseInt(sq[3]), grade: sq[4] || null };
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
