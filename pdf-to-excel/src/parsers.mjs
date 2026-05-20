// Schema v1 parsers for rebar notation strings.
// All parsers return null for missing / unparsable input.

// "D25" → "D25"
// "D29" → "D29"
export function parseRebarDia(s) {
  if (!s) return null;
  const m = String(s).match(/^D(\d+)$/);
  return m ? `D${m[1]}` : null;
}

// "6"       → { s1: 6, s2: 0 }
// "6+2"     → { s1: 6, s2: 2 }
// "10+9"    → { s1: 10, s2: 9 }
// "4+2(4+4)" → { s1: 4, s2: 2, extra: "(4+4)" }  ※第3段以降は原文のみで参考
// "-"       → null
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

// "D13[2]@150" → { dia: "D13", legs: 2, pitch: 150 }
export function parseStirrup(s) {
  if (!s) return { dia: null, legs: null, pitch: null };
  const m = String(s).match(/^(D\d+)\[(\d+)\]@(\d+)$/);
  if (!m) return { dia: null, legs: null, pitch: null };
  return { dia: m[1], legs: parseInt(m[2]), pitch: parseInt(m[3]) };
}

// "6,450" → 6450 ; "-" → null ; "" → null
export function parseDim(s) {
  if (!s || s === '-') return null;
  const n = parseInt(String(s).replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

// Merge two end-gap rows (端あき1, 端あき2) into one per-position value.
// PDF convention: typically each position has one real value; the other row has '-'.
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

// Expand compound symbol like "FG17,FG18,(FG19)" → ["FG17", "FG18", "FG19"]
// The parenthesized one is conditional but we still create a row for it.
export function expandCompound(symbol) {
  if (!symbol) return [];
  const parts = String(symbol).split(',').map(p => p.trim()).filter(Boolean);
  return parts.map(p => {
    const m = p.match(/^\(?(FG\d+[A-Z]?)\)?$/);
    return m ? m[1] : p;
  });
}

// "SH-600×200×12×16" or "SH600×200×12×16" or "BH800×400×16×32"
//   → { kind: "SH", H: 600, B: 200, tw: 12, tf: 16 }
// "H-" prefix is normalized to "SH".
export function parseSection(s) {
  if (!s) return null;
  const m = String(s).match(/^(SH|BH|H)[-]?(\d+)[×x](\d+)[×x](\d+)[×x](\d+)$/);
  if (!m) return null;
  const kind = m[1] === 'H' ? 'SH' : m[1];
  return {
    kind,
    H:  parseInt(m[2]),
    B:  parseInt(m[3]),
    tw: parseInt(m[4]),
    tf: parseInt(m[5]),
  };
}

// Detect the structural category from a set of beam/column symbol prefixes.
// Returns { kind, sheetName, construction, element }.
//
// Symbol prefix conventions (Japanese structural drawings):
//   FG  → foundation girder (基礎大梁, RC)
//   G   → girder (大梁, RC)
//   B   → beam (小梁, RC)
//   CG  → cantilever girder (片持ち大梁, RC)
//   CB  → cantilever beam (片持ち小梁, RC)
//   SG  → steel girder (大梁, S)
//   SB  → steel beam (小梁, S)
//   CSG → cantilever steel girder (片持ち大梁, S)
//   C   → column (柱)
//
// "dominant prefix wins" rule: count by occurrence and pick the most common.
// Mixed prefixes (FG + CG combined into one list) → use the most common.
export function detectCategory(symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return { kind: '不明', sheetName: '未分類', construction: '?', element: '?' };
  }
  const counts = {};
  for (const s of symbols) {
    const m = String(s).match(/^([A-Z]+)/);
    if (!m) continue;
    counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  const dominant = Object.entries(counts).sort((a,b) => b[1] - a[1])[0]?.[0];
  const map = {
    FG:  { kind: 'RC基礎大梁',  sheetName: '基礎大梁',  construction: 'RC', element: '基礎大梁' },
    G:   { kind: 'RC大梁',       sheetName: '大梁',      construction: 'RC', element: '大梁'    },
    B:   { kind: 'RC小梁',       sheetName: '小梁',      construction: 'RC', element: '小梁'    },
    CG:  { kind: 'RC片持ち大梁', sheetName: '大梁',      construction: 'RC', element: '大梁'    },
    CB:  { kind: 'RC片持ち小梁', sheetName: '小梁',      construction: 'RC', element: '小梁'    },
    SG:  { kind: 'S大梁',         sheetName: 'S大梁',    construction: 'S',  element: '大梁'    },
    SB:  { kind: 'S小梁',         sheetName: 'S小梁',    construction: 'S',  element: '小梁'    },
    CSG: { kind: 'S片持ち大梁',  sheetName: 'S大梁',    construction: 'S',  element: '大梁'    },
    C:   { kind: 'RC柱',          sheetName: '柱',       construction: 'RC', element: '柱'     },
  };
  return map[dominant] || { kind: `不明(${dominant})`, sheetName: '未分類', construction: '?', element: '?' };
}

// Normalize 通り (gridline) list. Deduplicate consecutive shared gridlines.
//   ["Xd1", "Xd2", "Xd3"] → ["Xd1", "Xd2", "Xd3"]
//   start ["Xd1","Xd2","Xd3"] + end ["Xd2","Xd3","Xd4"] → 起点 = "Xd1", 終点 = "Xd4"
// (for connected spans we only keep the outermost grids)
export function normalizeGrid(startList, endList) {
  const start = startList[0] || null;
  const end = endList[endList.length - 1] || startList[startList.length - 1] || null;
  return { start, end };
}
