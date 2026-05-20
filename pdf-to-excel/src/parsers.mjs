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

// Normalize 通り (gridline) list. Deduplicate consecutive shared gridlines.
//   ["Xd1", "Xd2", "Xd3"] → ["Xd1", "Xd2", "Xd3"]
//   start ["Xd1","Xd2","Xd3"] + end ["Xd2","Xd3","Xd4"] → 起点 = "Xd1", 終点 = "Xd4"
// (for connected spans we only keep the outermost grids)
export function normalizeGrid(startList, endList) {
  const start = startList[0] || null;
  const end = endList[endList.length - 1] || startList[startList.length - 1] || null;
  return { start, end };
}
