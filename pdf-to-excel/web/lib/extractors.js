// Browser-side extraction logic. Inputs are already-loaded pdf.js
// text content + viewport (text path) or Tesseract.js word arrays (OCR path).

import { parseColumnSection } from './parsers.js';

// ============================================================
// Shared utilities (exported for app-level use)
// ============================================================

const applyT = (m, x, y) => [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]];
export const cleanStr = s => (s || '').replace(/[\x00-\x1F\x7F]/g, '').trim();

export function toItems(tcItems, viewport) {
  const VPX = viewport.transform;
  return tcItems
    .filter(it => it.str && cleanStr(it.str))
    .map(it => {
      const [dx, dy] = applyT(VPX, it.transform[4], it.transform[5]);
      return {
        str: cleanStr(it.str),
        x: dx,
        y: dy,
        w: it.width || 0,
        h: it.height || 0,
      };
    });
}

// Cluster a set of {x} anchors by x position (tolerance 50px) and assign
// each anchor a leftBound / rightBound based on midpoints between
// adjacent cluster centers. Works for multi-band tables where the same
// x position can carry multiple anchors at different y values.
function assignXCardBounds(anchors) {
  if (anchors.length === 0) return;
  const sorted = [...anchors].sort((a, b) => a.x - b.x);
  const clusters = [];
  for (const a of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(a.x - last.cx) < 50) {
      last.members.push(a);
      last.cx = last.members.reduce((s, m) => s + m.x, 0) / last.members.length;
    } else {
      clusters.push({ cx: a.x, members: [a] });
    }
  }
  const meanGap = clusters.length > 1
    ? (clusters[clusters.length-1].cx - clusters[0].cx) / (clusters.length - 1)
    : 800;
  const cardHalfW = meanGap / 2;
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    const left  = i === 0 ? c.cx - cardHalfW : (clusters[i-1].cx + c.cx) / 2;
    const right = i === clusters.length-1 ? c.cx + cardHalfW : (c.cx + clusters[i+1].cx) / 2;
    for (const m of c.members) {
      m.leftBound = left;
      m.rightBound = right;
    }
  }
}

// Detect glyph-obfuscated PDFs by ratio of code points in
// suspicious ranges (General Punctuation, PUA, etc.). >30% = obfuscated.
export function isObfuscated(tcItems) {
  let total = 0, garbled = 0;
  for (const it of tcItems) {
    for (const ch of it.str || '') {
      total++;
      const cp = ch.codePointAt(0);
      if ((cp >= 0x2000 && cp <= 0x2FFF) ||
          (cp >= 0xE000 && cp <= 0xF8FF) ||
          (cp >= 0x4000 && cp <= 0x4FFF && cp !== 0x4E00)) {
        garbled++;
      }
    }
  }
  if (total < 30) return false;
  return garbled / total > 0.3;
}

// Detect what's on a non-obfuscated page from its anchor patterns.
export function detectPageCategory(tcItems, viewport) {
  const items = toItems(tcItems, viewport);
  const fg = items.filter(it => /^FG\d+/.test(it.str)).length;
  const fgCompound = items.filter(it => /^FG\d+,FG\d+/.test(it.str)).length;
  const sg = items.filter(it => /^SG\d+[A-Z]?$/.test(it.str)).length;
  const csg = items.filter(it => /^CSG\d+/.test(it.str)).length;
  if (fg + fgCompound * 3 >= 5) return 'rc-beam';
  if (sg + csg >= 5) return 's-beam';
  return 'unknown';
}

// Detect material grade strings on a page. Returns the dominant material
// from each family (concrete / steel / rebar).
//
// Steel / concrete / rebar grade tokens have STRICT digit-count rules:
//   - Steel: prefix + 3-4 digits + optional A/B/C only (SS400, SN490B, BCP325)
//   - Concrete: Fc + 2-3 digits (Fc24, Fc100)
//   - Rebar: SD + 3 digits + optional A-D (SD345, SD390)
//
// Allowing only A/B/C as suffix rejects OCR noise like "SS400H", "STKR400S".
// Negative lookahead (?!\d) refuses extra trailing digits so concatenated
// junk like "SS400400166060" doesn't match. Negative lookbehind
// (?<![A-Za-z0-9]) refuses matches mid-identifier.
const MATERIAL_PATTERNS = {
  concrete: /(?<![A-Za-z0-9])Fc\d{2,3}(?!\d)/g,
  rebar:    /(?<![A-Za-z0-9])SD\d{3}[A-D]?(?!\d)/g,
  steel:    /(?<![A-Za-z0-9])(?:SS|SN|SM|BCP|BCR|STKR|STK)\d{3,4}[ABC]?(?!\d)/g,
};

// JIS preference order — structural-grade comes before general-grade.
// When multiple steel grades co-exist on a page, pick the structural one
// (which is what specifications actually use as primary material).
const STEEL_PRIORITY = ['SN', 'SM', 'BCP', 'BCR', 'STKR', 'STK', 'SS'];
function dominant(strs) {
  if (!strs.length) return null;
  const counts = {};
  for (const s of strs) counts[s] = (counts[s] || 0) + 1;
  // Sort by priority bucket first, then by frequency within bucket.
  const sorted = Object.keys(counts).sort((a, b) => {
    const ia = STEEL_PRIORITY.findIndex(p => a.startsWith(p));
    const ib = STEEL_PRIORITY.findIndex(p => b.startsWith(p));
    const pa = ia === -1 ? 999 : ia;
    const pb = ib === -1 ? 999 : ib;
    if (pa !== pb) return pa - pb;
    return counts[b] - counts[a];
  });
  return sorted[0];
}
export function detectMaterials(items) {
  const out = { 構造マテリアル: null, 主筋材質: null, _all: [] };
  if (!items.length) return out;

  // Build tokens (visual words). Two items belong to the same token only
  // if they are on the same y AND the x gap between them is smaller than
  // a "same-word" threshold. This prevents merging adjacent cell values
  // (the previous bug where "SS400" + "400" became "SS400400").
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const maxY = Math.max(0, ...sorted.map(it => it.y));
  const ocrScale = maxY > 1000; // pixel coords vs PDF-point coords
  const tolY = ocrScale ? 15 : 4;
  const tolXSameWord = ocrScale ? 10 : 2;

  const tokens = [];
  for (const it of sorted) {
    const last = tokens[tokens.length - 1];
    const sameLine = last && Math.abs(it.y - last.y) <= tolY;
    const closeX = last && (it.x - last.endX) <= tolXSameWord;
    if (sameLine && closeX) {
      last.text += it.str;
      last.endX = it.x + (it.w || (ocrScale ? 20 : 4));
    } else {
      tokens.push({
        text: it.str,
        y: it.y,
        endX: it.x + (it.w || (ocrScale ? 20 : 4)),
      });
    }
  }

  const concrete = [], rebar = [], steel = [];
  for (const tok of tokens) {
    for (const m of tok.text.matchAll(MATERIAL_PATTERNS.concrete)) concrete.push(m[0]);
    for (const m of tok.text.matchAll(MATERIAL_PATTERNS.rebar))    rebar.push(m[0]);
    for (const m of tok.text.matchAll(MATERIAL_PATTERNS.steel))    steel.push(m[0]);
  }
  out._all = [...new Set([...concrete, ...rebar, ...steel])];
  out.構造マテリアル = dominant(steel) || dominant(concrete);
  out.主筋材質 = dominant(rebar);
  return out;
}



const RC_OFFSETS = {
  span:     { dy: 12  },
  sectionH: { dy: 75, dxFromCenter: 89 },
  sectionW: { dy: 101 },
  rebarDia: { dy: 131 },
  rebarTop: { dy: 141 },
  rebarBot: { dy: 151 },
  endgap1:  { dy: 161 },
  endgap2:  { dy: 171 },
  stirrup:  { dy: 181 },
};
const RC_SUB_DX = 62;
const RC_TOL_X = 18;
const RC_TOL_Y = 4;

function findAt(items, x, y, tolX = RC_TOL_X, tolY = RC_TOL_Y, filter = null) {
  let best = null, bestD = Infinity;
  for (const it of items) {
    if (Math.abs(it.y - y) > tolY) continue;
    if (Math.abs(it.x - x) > tolX) continue;
    if (filter && !filter(it.str)) continue;
    const d = Math.abs(it.x - x) + Math.abs(it.y - y);
    if (d < bestD) { bestD = d; best = it; }
  }
  return best ? best.str : null;
}

export function extractRcBeams(tcItems, viewport) {
  const items = toItems(tcItems, viewport);
  const mats = detectMaterials(items);
  const fgRe = /^FG\d+[A-Z]?$/;
  const fgCompoundRe = /^FG\d+(,FG\d+)+(,\(FG\d+\))?$/;
  const fgItems = items.filter(it => fgRe.test(it.str) || fgCompoundRe.test(it.str));

  // Group by Y → bands
  fgItems.sort((a,b) => a.y - b.y);
  const bands = [];
  for (const a of fgItems) {
    const last = bands[bands.length - 1];
    if (last && Math.abs(a.y - last.y) <= 5) {
      last.anchors.push(a);
      last.y = (last.y * (last.anchors.length - 1) + a.y) / last.anchors.length;
    } else bands.push({ y: a.y, anchors: [a] });
  }
  bands.forEach(b => b.anchors.sort((a,b) => a.x - b.x));

  const beams = [];
  for (let bi = 0; bi < bands.length; bi++) {
    for (const fg of bands[bi].anchors) {
      const cx = fg.x;
      const beam = {
        band: bi + 1,
        符号: fg.str,
        anchor: { x: cx, y: fg.y },
        原文: {},
      };
      beam.原文.スパン = findAt(items, cx, fg.y + RC_OFFSETS.span.dy, 30, RC_TOL_Y,
        s => !/^スパン$/.test(s));
      beam.原文.成D = findAt(items, cx + RC_OFFSETS.sectionH.dxFromCenter, fg.y + RC_OFFSETS.sectionH.dy);
      beam.原文.幅B = {
        a: findAt(items, cx - RC_SUB_DX, fg.y + RC_OFFSETS.sectionW.dy),
        c: findAt(items, cx,              fg.y + RC_OFFSETS.sectionW.dy),
        b: findAt(items, cx + RC_SUB_DX, fg.y + RC_OFFSETS.sectionW.dy),
      };
      beam.原文.主筋径 = findAt(items, cx, fg.y + RC_OFFSETS.rebarDia.dy);
      beam.原文.主筋上 = {
        a: findAt(items, cx - RC_SUB_DX, fg.y + RC_OFFSETS.rebarTop.dy),
        c: findAt(items, cx,              fg.y + RC_OFFSETS.rebarTop.dy),
        b: findAt(items, cx + RC_SUB_DX, fg.y + RC_OFFSETS.rebarTop.dy),
      };
      beam.原文.主筋下 = {
        a: findAt(items, cx - RC_SUB_DX, fg.y + RC_OFFSETS.rebarBot.dy),
        c: findAt(items, cx,              fg.y + RC_OFFSETS.rebarBot.dy),
        b: findAt(items, cx + RC_SUB_DX, fg.y + RC_OFFSETS.rebarBot.dy),
      };
      beam.原文.端あき1 = {
        a: findAt(items, cx - RC_SUB_DX, fg.y + RC_OFFSETS.endgap1.dy),
        c: findAt(items, cx,              fg.y + RC_OFFSETS.endgap1.dy),
        b: findAt(items, cx + RC_SUB_DX, fg.y + RC_OFFSETS.endgap1.dy),
      };
      beam.原文.端あき2 = {
        a: findAt(items, cx - RC_SUB_DX, fg.y + RC_OFFSETS.endgap2.dy),
        c: findAt(items, cx,              fg.y + RC_OFFSETS.endgap2.dy),
        b: findAt(items, cx + RC_SUB_DX, fg.y + RC_OFFSETS.endgap2.dy),
      };
      beam.原文.あばら筋 = findAt(items, cx, fg.y + RC_OFFSETS.stirrup.dy, 40, RC_TOL_Y);
      beam.原文.構造マテリアル = mats.構造マテリアル;
      beam.原文.主筋材質 = mats.主筋材質;
      beams.push(beam);
    }
  }
  return beams;
}

// ============================================================
// S beam extractor (port of extract-s-beam.mjs)
// ============================================================

const S_OFFS = {
  span:   66,
  span2:  73,
  gridStart: 78,
  gridEnd:   90,
  section: 112,
};
const S_TOL_Y = 5;

function gather(items, x, y, tolX, tolY = S_TOL_Y) {
  return items.filter(it =>
    Math.abs(it.y - y) <= tolY &&
    Math.abs(it.x - x) <= tolX);
}

export function extractSBeams(tcItems, viewport) {
  const items = toItems(tcItems, viewport);
  const mats = detectMaterials(items);
  const sgRe = /^C?SG\d+[A-Z]?$/;
  const sgItems = items.filter(it => sgRe.test(it.str));

  sgItems.sort((a,b) => a.y - b.y);
  const bands = [];
  for (const a of sgItems) {
    const last = bands[bands.length - 1];
    if (last && Math.abs(a.y - last.y) <= 5) {
      last.anchors.push(a);
      last.y = (last.y * (last.anchors.length - 1) + a.y) / last.anchors.length;
    } else bands.push({ y: a.y, anchors: [a] });
  }
  bands.forEach(b => b.anchors.sort((a,b) => a.x - b.x));

  const cardHalfW = 80;
  const beams = [];
  for (let bi = 0; bi < bands.length; bi++) {
    for (const sg of bands[bi].anchors) {
      const cx = sg.x;
      const spanRow1 = gather(items, cx, sg.y + S_OFFS.span, cardHalfW);
      const spanRow2 = gather(items, cx, sg.y + S_OFFS.span2, cardHalfW);
      const orderRow = row => [...row]
        .filter(it => /^[,\d]/.test(it.str))
        .sort((a,b) => a.x - b.x)
        .map(it => it.str);
      const spanRaw = [...orderRow(spanRow1), ...orderRow(spanRow2)].join('');
      const spans = [...spanRaw.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)/g)].map(m => m[1]);

      const gStart = gather(items, cx, sg.y + S_OFFS.gridStart, cardHalfW)
        .filter(it => /^X[de]?\d/i.test(it.str) || /^Y[de]?\d/i.test(it.str))
        .sort((a,b) => a.x - b.x);
      const gEnd = gather(items, cx, sg.y + S_OFFS.gridEnd, cardHalfW)
        .filter(it => /^X[de]?\d/i.test(it.str) || /^Y[de]?\d/i.test(it.str))
        .sort((a,b) => a.x - b.x);

      const sectionRow = gather(items, cx, sg.y + S_OFFS.section, cardHalfW + 30)
        .filter(it => /^(SH|BH|H)[-]?\d/.test(it.str));
      const section = sectionRow.length > 0 ? sectionRow[0].str : null;

      beams.push({
        band: bi + 1,
        符号: sg.str,
        anchor: { x: cx, y: sg.y },
        原文: {
          スパン_列: spans,
          通り起点_列: gStart.map(it => it.str),
          通り終点_列: gEnd.map(it => it.str),
          断面型: section,
          構造マテリアル: mats.構造マテリアル,
        },
      });
    }
  }
  return beams;
}

// ============================================================
// Column extractor from OCR words (port of extract-column-ocr.mjs)
// Input: OCR words array with pixel coords. Output: column list.
// ============================================================

export function extractColumnsFromOcr(words) {
  const pageMats = detectMaterials(words);
  // Anchor patterns we accept:
  //   SC1, SC101    (Steel Column)
  //   CC1           (Composite Column)
  //   CFT1          (CFT column)
  //   C101, C1      (plain Column — common in grid-based naming)
  // The plain "C" branch is the one used by many drawings, so we must
  // accept it — but only when followed by digits and bounded by a non-
  // alphanumeric character on both sides so we don't match things like
  // "BCR295" or "STC123".
  const colRe = /(SC|CC|CFT|C)(\d+)([A-Z]?)/i;
  const rawAnchors = [];
  for (const w of words) {
    const m = w.str.match(colRe);
    if (!m) continue;
    const idx = m.index;
    const before = idx > 0 ? w.str[idx - 1] : '';
    const afterIdx = idx + m[0].length;
    const after = afterIdx < w.str.length ? w.str[afterIdx] : '';
    if (/[A-Za-z0-9]/.test(before)) continue;
    if (/[A-Za-z0-9]/.test(after)) continue;
    rawAnchors.push({
      str: m[0].toUpperCase(),
      x: w.x,
      y: w.y,
      w: w.w,
    });
  }
  if (rawAnchors.length === 0) return [];

  // Diagnostic: dump every anchor position so we can see exactly what
  // Tesseract.js returned for this page. Visible via F12 → Console.
  console.log('[extractColumnsFromOcr] rawAnchors =', rawAnchors.map(a =>
    `${a.str}@(${a.x.toFixed(0)},${a.y.toFixed(0)})`
  ).join(' | '));

  // OCR may give us each SC symbol multiple times (heading, page label,
  // canonical row, footer). Group by symbol name and pick the single
  // position with the most "section-like" content below it — that's the
  // canonical row position even when OCR scatters anchors vertically.
  const bySymbol = new Map();
  for (const a of rawAnchors) {
    if (!bySymbol.has(a.str)) bySymbol.set(a.str, []);
    bySymbol.get(a.str).push(a);
  }
  console.log('[extractColumnsFromOcr] unique symbols =',
    [...bySymbol.entries()].map(([k, v]) => `${k}×${v.length}`).join(', '));

  // Helper to count how much section-like content sits below a position
  // within a generous x band (we don't know the real card width yet).
  const sectionStartRe = /[-=]?\d{2,4}[xX×]+\d{2,4}(?:[xX×]+\d{1,3})?/i;
  const sectionShRe    = /(?:SH|BH|H)[-=]?\d{2,4}(?:[xX×]+\d+(?:\.\d+)?){0,3}/i;
  const scoreBelow = (pos, xHalf) =>
    words.filter(w =>
      w.y > pos.y + 5 &&
      Math.abs(w.x - pos.x) <= xHalf &&
      (sectionStartRe.test(w.str) || sectionShRe.test(w.str))
    ).length;

  const columnAnchors = [];
  for (const [sym, positions] of bySymbol) {
    // Pick the position with the highest below-content score.
    // Tie-break with the smallest y (highest on page = real header row).
    positions.sort((a, b) => {
      const sb = scoreBelow(b, 250) - scoreBelow(a, 250);
      if (sb !== 0) return sb;
      return a.y - b.y;
    });
    columnAnchors.push({ str: sym, x: positions[0].x, y: positions[0].y });
  }
  // Sort columns left-to-right.
  columnAnchors.sort((a, b) => a.x - b.x);

  // Card boundaries via x-clustered midpoints (same anchors at the same x
  // — e.g. multi-band tables — must share one boundary, not produce
  // zero-width cards).
  assignXCardBounds(columnAnchors);

  const gradeRe    = /^(BCP|BCR|SN|SS|SM|TMC|STKR)\d{3,4}[A-Z]?$/;
  const pageBottom = Math.max(0, ...words.map(w => w.y)) + 100;

  // Sanity-filter implausible dimensions (OCR garbage).
  function plausible(p) {
    if (!p) return false;
    const A = p.A ?? p.H;
    if (!A || A < 100 || A > 1500) return false;
    if (p.B != null && (p.B < 50 || p.B > 1500)) return false;
    if (p.kind === '□') {
      if (p.t != null && (p.t < 5 || p.t > 60)) return false;
    } else {
      if (p.tw != null && (p.tw < 4 || p.tw > 50)) return false;
      if (p.tf != null && (p.tf < 4 || p.tf > 50)) return false;
    }
    return true;
  }

  const cols = [];
  for (const anchor of columnAnchors) {
    const below = words.filter(w =>
      w.y > anchor.y + 5 &&
      w.y < pageBottom &&
      w.x >= anchor.leftBound &&
      w.x <= anchor.rightBound
    );

    const rawSections = below
      .filter(w => sectionStartRe.test(w.str) || sectionShRe.test(w.str))
      .map(w => ({ str: w.str, y: w.y }));

    // Row-level concat fallback for fragmented OCR.
    const TOL_Y_ROW = 30;
    const byRow = new Map();
    for (const w of below) {
      const rowKey = Math.round(w.y / TOL_Y_ROW);
      if (!byRow.has(rowKey)) byRow.set(rowKey, []);
      byRow.get(rowKey).push(w);
    }
    const directMatchedRows = new Set(rawSections.map(s => Math.round(s.y / TOL_Y_ROW)));
    for (const [rowKey, row] of byRow) {
      if (directMatchedRows.has(rowKey)) continue;
      row.sort((a, b) => a.x - b.x);
      const joined = row.map(t => t.str).join('');
      const m = joined.match(sectionStartRe) || joined.match(sectionShRe);
      if (m) rawSections.push({ str: m[0], y: row[0].y });
    }

    // Dedup by (kind, A/H, B).
    const dedup = new Map();
    for (const s of rawSections) {
      const p = parseColumnSection(s.str);
      if (!plausible(p)) continue;
      const A = p.A ?? p.H;
      const key = `${p.kind}/${A}/${p.B}`;
      const tNow = p.t ?? p.tw ?? null;
      const existing = dedup.get(key);
      if (!existing) { dedup.set(key, { s, t: tNow, y: s.y }); continue; }
      if (tNow != null && existing.t == null) dedup.set(key, { s, t: tNow, y: s.y });
    }
    const sections = [...dedup.values()].sort((a, b) => a.y - b.y).map(d => d.s);

    const grades = below.filter(w => gradeRe.test(w.str)).map(w => ({ str: w.str }));
    const uniq = (arr, key) => {
      const seen = new Set();
      return arr.filter(it => {
        const k = key(it);
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
    };
    const colGrades = uniq(grades, s => s.str).map(s => s.str);
    cols.push({
      符号: anchor.str,
      anchor: { x: anchor.x, y: anchor.y },
      原文: {
        断面型_列: uniq(sections, s => `${s.str}@${(s.y/10)|0}`).map(s => s.str),
        鋼材グレード_列: colGrades,
        構造マテリアル: colGrades[0] || pageMats.構造マテリアル,
      },
    });
  }
  return cols;
}

// ============================================================
// Small beam (S) extractor from OCR words
// (port of extract-small-beam-ocr.mjs)
// ============================================================

export function extractSmallBeamsFromOcr(words) {
  const pageMats = detectMaterials(words);
  // Diagnostic: dump first ~30 OCR words so we can see what Tesseract
  // returned. Useful when "X% of beams missing section" — visible in
  // F12 console.
  console.log('[extractSmallBeamsFromOcr] OCR sample (first 30):',
    words.slice(0, 30).map(w => `"${w.str}"`).join(' '));
  // Case-insensitive: OCR may return "sb14m" (all lower), "SB14M", "Sb14M" etc.
  // Suffix can also be lowercase (m/w/h) — we uppercase before storing.
  const anchorRe = /^[csCS]?[sS][bB]\d+[A-Za-z]{0,3}(?:[.,][csCS][sS][bB]\d+[A-Za-z]{0,3})?$/;
  const anchors = words.filter(w => anchorRe.test(w.str)).map(w => ({
    symbols: w.str.toUpperCase().split(/[.,]/).map(s => s.trim()).filter(Boolean),
    y: w.y,
    x: w.x,
    raw: w.str,
  }));
  if (anchors.length === 0) return [];

  // Flexible section pattern:
  //   - Prefix BH / SH / H / I / L / C (case-insensitive)
  //   - Hyphen optional
  //   - First dim (3-4 digits)
  //   - 1-3 more dims, each separated by ONE OR MORE × markers
  //     (handles OCR duplicates like "300x150xX6.5x9" or "346xX174xX6x9")
  //   - Each dim can be integer or decimal (4.5, 6.5, 11.0)
  //   - No ^ anchor — match can appear inside a longer word
  const secRe = /(?:BH|SH|H|I|L|C)-?\d{2,4}(?:[xX×]+\d+(?:\.\d+)?){1,3}/i;
  const matRe = /^(SS|SN|SM)\d{3,4}[ABC]?$/;
  const mats = words.filter(w => matRe.test(w.str));

  const TOL_Y = 20;

  // For each anchor, find its section by scanning all words on the same y
  // row to its right. Try matching each word individually first (catches
  // the common case where Tesseract gives us "H-198x99x4.5x7" as one
  // word), then try joining consecutive words (catches the case where
  // best-model output splits a section across multiple words).
  function sectionForAnchor(anchor) {
    const sameRow = words.filter(w =>
      Math.abs(w.y - anchor.y) <= TOL_Y && w.x > anchor.x
    ).sort((a, b) => a.x - b.x);

    for (const w of sameRow) {
      const m = w.str.match(secRe);
      if (m) return m[0];
    }
    // Concatenation fallback for split sections
    for (let i = 0; i < sameRow.length; i++) {
      let joined = sameRow[i].str;
      for (let j = i + 1; j < Math.min(i + 5, sameRow.length); j++) {
        joined += sameRow[j].str;
        const m = joined.match(secRe);
        if (m) return m[0];
      }
    }
    return null;
  }

  function findOnRow(list, anchor) {
    const cands = list.filter(w => Math.abs(w.y - anchor.y) <= TOL_Y);
    cands.sort((a,b) => Math.abs(a.x - anchor.x) - Math.abs(b.x - anchor.x));
    const right = cands.filter(w => w.x > anchor.x);
    return right[0] || cands[0] || null;
  }

  const beams = [];
  for (const a of anchors) {
    const sec = sectionForAnchor(a);   // robust row-scan + concat fallback
    const mat = findOnRow(mats, a);
    for (const sym of a.symbols) {
      beams.push({
        符号: sym,
        anchor: { x: a.x, y: a.y },
        原文: {
          断面型: sec,
          鋼材グレード: mat?.str ?? null,
          構造マテリアル: mat?.str ?? pageMats.構造マテリアル,
          raw符号: a.raw,
        },
      });
    }
  }
  return beams;
}

// ============================================================
// Large beam (大梁 / S大梁) extractor from OCR words
// ============================================================
//
// Image-only drawings (test_梁リスト系) use G101 / G101A / G102 / SG1
// style anchors. This extractor mirrors the small-beam logic but tunes
// the anchor regex for the G-prefix conventions and uses the JIS catalog
// inferred by parseSection for backfill.

export function extractLargeBeamsFromOcr(words) {
  const pageMats = detectMaterials(words);
  console.log('[extractLargeBeamsFromOcr] OCR sample (first 30):',
    words.slice(0, 30).map(w => `"${w.str}"`).join(' '));

  // Anchor patterns: SG / CSG / FG / BG / G with digit suffix.
  // Bare G is allowed but guarded by word boundaries (don't grab "G" out
  // of grade names like "BCR295G" etc.).
  const anchorRe = /(CSG|SG|FG|BG|G)(\d+)([A-Za-z]?)/i;
  const rawAnchors = [];
  for (const w of words) {
    const m = w.str.match(anchorRe);
    if (!m) continue;
    const idx = m.index;
    const before = idx > 0 ? w.str[idx - 1] : '';
    const after = w.str[idx + m[0].length] ?? '';
    if (/[A-Za-z0-9]/.test(before)) continue;
    if (/[A-Za-z0-9]/.test(after)) continue;
    rawAnchors.push({
      str: m[0].toUpperCase(),
      x: w.x,
      y: w.y,
      w: w.w,
    });
  }
  if (rawAnchors.length === 0) return [];

  console.log('[extractLargeBeamsFromOcr] rawAnchors =', rawAnchors.map(a =>
    `${a.str}@(${a.x.toFixed(0)},${a.y.toFixed(0)})`).slice(0, 20).join(' | '));

  // Group by symbol name (heading / canonical-row dups all collapse).
  const bySymbol = new Map();
  for (const a of rawAnchors) {
    if (!bySymbol.has(a.str)) bySymbol.set(a.str, []);
    bySymbol.get(a.str).push(a);
  }

  // Section pattern — same as small-beam (BH / SH / H- prefix with 1-3
  // × dimensions, including duplicates/decimal).
  const secRe = /(?:BH|SH|H)[-=]?\d{2,4}(?:[xX×]+\d+(?:\.\d+)?){1,3}/i;
  const scoreBelow = (pos, xHalf) =>
    words.filter(w =>
      w.y > pos.y + 5 &&
      Math.abs(w.x - pos.x) <= xHalf &&
      secRe.test(w.str)
    ).length;

  const beamAnchors = [];
  for (const [sym, positions] of bySymbol) {
    positions.sort((a, b) => {
      const sb = scoreBelow(b, 300) - scoreBelow(a, 300);
      if (sb !== 0) return sb;
      return a.y - b.y;
    });
    beamAnchors.push({ str: sym, x: positions[0].x, y: positions[0].y });
  }
  beamAnchors.sort((a, b) => a.x - b.x);

  // Card boundaries via midpoints. Multi-band tables share the same x for
  // multiple anchors (G101 + G104 both at x=1469), so cluster anchors by
  // x before computing the bounds — otherwise the right-bound for the
  // first becomes equal to the left-bound for the second and we get
  // zero-width cards.
  assignXCardBounds(beamAnchors);

  const TOL_Y_ROW = 30;
  const pageBottom = Math.max(0, ...words.map(w => w.y)) + 100;

  const beams = [];
  for (const anchor of beamAnchors) {
    // Search only BELOW this specific anchor — important for multi-band
    // tables (e.g. G101-G103 at y=805 + G104-G107A at y=3543).
    const below = words.filter(w =>
      w.y > anchor.y + 5 &&
      w.y < pageBottom &&
      w.x >= anchor.leftBound &&
      w.x <= anchor.rightBound
    );

    // Direct + row-concat section search.
    let section = null;
    for (const w of below) {
      if (secRe.test(w.str)) { section = w.str.match(secRe)[0]; break; }
    }
    if (!section) {
      const byRow = new Map();
      for (const w of below) {
        const rowKey = Math.round(w.y / TOL_Y_ROW);
        if (!byRow.has(rowKey)) byRow.set(rowKey, []);
        byRow.get(rowKey).push(w);
      }
      for (const [, row] of byRow) {
        row.sort((a, b) => a.x - b.x);
        const joined = row.map(t => t.str).join('');
        const m = joined.match(secRe);
        if (m) { section = m[0]; break; }
      }
    }

    beams.push({
      符号: anchor.str,
      anchor: { x: anchor.x, y: anchor.y },
      原文: {
        断面型: section,
        構造マテリアル: pageMats.構造マテリアル,
      },
    });
  }
  return beams;
}

// Try to classify an OCR'd page from its anchor patterns.
// Returns the category plus the raw counts so the app can log them
// when classification fails.
//
// Tesseract.js best-model output occasionally splits a label like "SC1"
// into "SC" + "1" or attaches punctuation ("(SC1)", "・SC1"), so we count
// any word containing the anchor pattern as a substring — not just whole
// matches — to avoid undercounting.
export function detectOcrCategory(words) {
  // Anchor counts for each beam/column family.
  //   SC|CC|CFT|C  : columns (柱)
  //   SB|CSB       : small beams (小梁)
  //   SG|CSG|FG|BG|G : large beams (大梁)
  const sc = words.filter(w => /(?:^|[^A-Za-z])(SC|CC|CFT|C)\d+[A-Z]?(?:$|[^A-Za-z0-9])/i.test(w.str + ' ')).length;
  const sb = words.filter(w => /(?:^|[^A-Za-z])(CSB|SB)\d+[A-Za-z]?(?:$|[^A-Za-z0-9])/i.test(w.str + ' ')).length;
  const lg = words.filter(w => /(?:^|[^A-Za-z])(CSG|SG|FG|BG|G)\d+[A-Za-z]?(?:$|[^A-Za-z0-9])/i.test(w.str + ' ')).length;
  let category = 'unknown';
  const max = Math.max(sb, lg, sc);
  if (max < 3) return { category, counts: { sc, sb, lg, total: words.length } };
  if (sb === max) category = 'small-beam';
  else if (lg === max) category = 'large-beam';
  else if (sc === max) category = 'column';
  return { category, counts: { sc, sb, lg, total: words.length } };
}
