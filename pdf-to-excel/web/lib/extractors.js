// Browser-side extraction logic. Inputs are already-loaded pdf.js
// text content + viewport (text path) or Tesseract.js word arrays (OCR path).

// ============================================================
// Shared utilities
// ============================================================

const applyT = (m, x, y) => [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]];
const cleanStr = s => (s || '').replace(/[\x00-\x1F\x7F]/g, '').trim();

function toItems(tcItems, viewport) {
  const VPX = viewport.transform;
  return tcItems
    .filter(it => it.str && cleanStr(it.str))
    .map(it => {
      const [dx, dy] = applyT(VPX, it.transform[4], it.transform[5]);
      return { str: cleanStr(it.str), x: dx, y: dy };
    });
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
// from each family (concrete / steel / rebar) so the caller can attach
// it as a page-level default for every beam/column on that page.
// Accepts either {str} items (from pdf.js) or OCR words (same {str} shape).
//   Fc24, Fc30        — concrete strength
//   SD295, SD345, SD390 — rebar grade
//   SS400, SN400B, SN490B, SM490A — general/welded steel
//   BCP235, BCP325    — square hollow steel (柱)
//   BCR295            — cold-rolled square steel (柱)
//   TMCP, STKR        — other steel grades
const MATERIAL_PATTERNS = {
  concrete: /^Fc\d+$/i,
  rebar:    /^SD\d+[A-Z]?$/,
  steel:    /^(SS|SN|SM|BCP|BCR|STKR)\d+[A-Z]?$/,
};
function dominant(strs) {
  if (!strs.length) return null;
  const counts = {};
  for (const s of strs) counts[s] = (counts[s] || 0) + 1;
  return Object.entries(counts).sort((a,b) => b[1] - a[1])[0][0];
}
export function detectMaterials(items) {
  const out = { 構造マテリアル: null, 主筋材質: null, _all: [] };
  const concrete = items.filter(it => MATERIAL_PATTERNS.concrete.test(it.str)).map(it => it.str);
  const rebar    = items.filter(it => MATERIAL_PATTERNS.rebar   .test(it.str)).map(it => it.str);
  const steel    = items.filter(it => MATERIAL_PATTERNS.steel   .test(it.str)).map(it => it.str);
  out._all = [...new Set([...concrete, ...rebar, ...steel])];
  // Decide the dominant 構造マテリアル: prefer steel over concrete since most
  // PDFs we see are steel-heavy; if no steel, fall back to concrete.
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
  const colRe = /^(SC|CC|CFT|C)\d+[A-Z]?$/;
  const anchors = words.filter(w => colRe.test(w.str));
  if (anchors.length === 0) return [];

  anchors.sort((a,b) => a.y - b.y);
  const rows = [];
  for (const a of anchors) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(a.y - last.y) <= 8) {
      last.anchors.push(a);
      last.y = (last.y * (last.anchors.length - 1) + a.y) / last.anchors.length;
    } else rows.push({ y: a.y, anchors: [a] });
  }
  rows.forEach(r => r.anchors.sort((a,b) => a.x - b.x));

  const headerRow = rows.sort((a,b) => b.anchors.length - a.anchors.length)[0];
  if (!headerRow) return [];

  const xs = headerRow.anchors.map(a => a.x).sort((a,b) => a - b);
  const gaps = xs.slice(1).map((x, i) => x - xs[i]);
  const meanGap = gaps.length > 0 ? gaps.reduce((s,v) => s+v, 0) / gaps.length : 140;
  const cardHalfW = meanGap / 2;

  const sectionStartRe = /^[□ロ口]?[-]?\d{2,4}[xX×]\d{2,4}/;
  const sectionShRe = /^SH[-]?\d+[×xX]\d+[×xX]\d+[×xX]\d+$/;
  const gradeRe = /^(BCP|BCR|SN|SS|SM|TMC|STKR)\d+[A-Z]?$/;

  const cols = [];
  for (const anchor of headerRow.anchors) {
    const cx = anchor.x;
    const below = words.filter(w =>
      w.y > headerRow.y + 5 &&
      w.y < headerRow.y + 600 &&
      Math.abs(w.x - cx) <= cardHalfW
    );
    const sections = below
      .filter(w => sectionStartRe.test(w.str) || sectionShRe.test(w.str))
      .map(w => ({ str: w.str, y: w.y }));
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
      anchor: { x: cx, y: anchor.y },
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

  const secRe = /^[HISL]-?\d+[xX×]\d+(?:\.\d+)?[xX×]\d+(?:\.\d+)?[xX×]\d+(?:\.\d+)?/;
  const secs = words.filter(w => secRe.test(w.str));
  const matRe = /^(SS|SN|SM)\d+[A-Z]?$/;
  const mats = words.filter(w => matRe.test(w.str));

  const TOL_Y = 12;
  function findOnRow(list, anchor) {
    const cands = list.filter(w => Math.abs(w.y - anchor.y) <= TOL_Y);
    cands.sort((a,b) => Math.abs(a.x - anchor.x) - Math.abs(b.x - anchor.x));
    const right = cands.filter(w => w.x > anchor.x);
    return right[0] || cands[0] || null;
  }

  const beams = [];
  for (const a of anchors) {
    const sec = findOnRow(secs, a);
    const mat = findOnRow(mats, a);
    for (const sym of a.symbols) {
      beams.push({
        符号: sym,
        anchor: { x: a.x, y: a.y },
        原文: {
          断面型: sec?.str ?? null,
          鋼材グレード: mat?.str ?? null,
          構造マテリアル: mat?.str ?? pageMats.構造マテリアル,
          raw符号: a.raw,
        },
      });
    }
  }
  return beams;
}

// Try to classify an OCR'd page from its anchor patterns.
// Returns the category plus the raw counts so the app can log them
// when classification fails.
export function detectOcrCategory(words) {
  const sc = words.filter(w => /^(SC|CC|CFT|C)\d+[A-Z]?$/i.test(w.str)).length;
  const sb = words.filter(w => /^[csCS]?[sS][bB]\d+/i.test(w.str)).length;
  // Lower thresholds — column lists are typically 3-12 anchors,
  // small-beam lists are typically 10-50 anchors.
  let category = 'unknown';
  if (sb >= 3 && sb >= sc) category = 'small-beam';
  else if (sc >= 3) category = 'column';
  return { category, counts: { sc, sb, total: words.length } };
}
