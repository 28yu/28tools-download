// Build schema v1 Excel from extracted beams/columns JSON using ExcelJS so
// header rows can carry fills, borders, and alignment, and column widths
// can be auto-fit from cell content.
//
// Sheets:
//   Meta         — extraction metadata
//   基礎大梁     — RC foundation girders (FG)
//   大梁         — RC/S girders (G / SG) — no スパン column
//   小梁         — RC/S beams (B / SB) — placeholder when no source provided
//   柱           — RC/S/CFT columns; per-floor section types split into A/B/t cells

import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {
  parseRebarDia, parseRebarCount, parseStirrup, parseDim,
  mergeEndgap, expandCompound, parseSection, normalizeGrid,
  detectCategory, parseColumnSection,
} from './parsers.mjs';

const outPath = process.argv[2] || './sample-output.xlsx';
const rcPath  = process.argv[3] || './sample-output-beams.json';
const sPath   = process.argv[4] || './sample-output-sbeams.json';
const colPath = process.argv[5] || './sample-output-columns.json';
const sbPath  = process.argv[6] || './sample-output-sbeams-small.json';

const rcBeamsRaw = JSON.parse(await readFile(rcPath, 'utf8'));
const sBeamsRaw  = JSON.parse(await readFile(sPath, 'utf8'));
let columnsRaw = [];
let smallBeamsRaw = [];
try { columnsRaw = JSON.parse(await readFile(colPath, 'utf8')); } catch {}
try { smallBeamsRaw = JSON.parse(await readFile(sbPath, 'utf8')); } catch {}

// ---------- styling helpers ----------

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB6CFE2' } };
const HEADER_FONT = { bold: true, size: 11, color: { argb: 'FF1F3A5F' } };
const HEADER_BORDER = {
  top:    { style: 'thin', color: { argb: 'FF888888' } },
  left:   { style: 'thin', color: { argb: 'FF888888' } },
  bottom: { style: 'thin', color: { argb: 'FF888888' } },
  right:  { style: 'thin', color: { argb: 'FF888888' } },
};
const DATA_BORDER = {
  top:    { style: 'hair', color: { argb: 'FFCCCCCC' } },
  left:   { style: 'hair', color: { argb: 'FFCCCCCC' } },
  bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
  right:  { style: 'hair', color: { argb: 'FFCCCCCC' } },
};

function styleHeaderRow(row) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = HEADER_FILL;
    cell.border = HEADER_BORDER;
  });
}

function styleDataRow(row) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = DATA_BORDER;
  });
}

// Visual width: full-width chars count as 2.
function visualLen(s) {
  if (s === null || s === undefined) return 0;
  const str = String(s);
  let n = 0;
  for (const ch of str) n += ch.charCodeAt(0) > 0x7F ? 2 : 1;
  return n;
}

// Auto-fit column widths from header + data values. Returns nothing; mutates ws.
function autoFitColumns(ws, minWidth = 6, maxWidth = 36) {
  const cols = ws.columnCount;
  for (let c = 1; c <= cols; c++) {
    let maxLen = minWidth;
    for (let r = 1; r <= ws.rowCount; r++) {
      const cell = ws.getCell(r, c);
      const v = cell.value;
      const len = visualLen(v) + 2;
      if (len > maxLen) maxLen = len;
    }
    ws.getColumn(c).width = Math.min(maxLen, maxWidth);
  }
}

// ---------- 基礎大梁 (RC FG) ----------

const POSITIONS = ['a', 'b', 'c', 'd', 'e'];
// _mm suffix stripped from labels — all linear dims are mm by convention.
// スパン column removed from 基礎大梁 per design.
const RC_BASIC_COLS = [
  { key: 'TypeName', label: 'TypeName' },
  { key: '符号',      label: '符号'      },
  { key: '幅B_mm',   label: '幅B'      },
  { key: '成D_mm',   label: '成D'      },
  { key: 'Fc_Nmm2', label: 'Fc'       },
  { key: '備考',      label: '備考'      },
];
const RC_POS_FIELDS = [
  { key: '主筋径',          label: '主筋径'      },
  { key: '上_1段',          label: '上_1段'      },
  { key: '上_2段',          label: '上_2段'      },
  { key: '下_1段',          label: '下_1段'      },
  { key: '下_2段',          label: '下_2段'      },
  { key: 'あばら径',        label: 'あばら径'    },
  { key: 'あばら脚数',      label: 'あばら脚数'  },
  { key: 'あばらピッチ_mm', label: 'あばらピッチ' },
  { key: '端あき_mm',       label: '端あき'      },
  { key: '原文',            label: '原文'        },
];

function buildRcBeamData(beam, symbol) {
  const r = beam.原文 || {};
  const top = r.主筋上 || {}, bot = r.主筋下 || {};
  const endgap = mergeEndgap(r.端あき1, r.端あき2);
  const stirrup = parseStirrup(r.あばら筋);
  const dia = parseRebarDia(r.主筋径);
  const widthMap = r.幅B || {};

  const perPos = {};
  for (const p of POSITIONS) {
    const topCount = parseRebarCount(top[p]);
    const botCount = parseRebarCount(bot[p]);
    perPos[p] = {
      主筋径: dia,
      上_1段: topCount?.s1 ?? null,
      上_2段: topCount?.s2 ?? null,
      下_1段: botCount?.s1 ?? null,
      下_2段: botCount?.s2 ?? null,
      あばら径: stirrup.dia,
      あばら脚数: stirrup.legs,
      あばらピッチ_mm: stirrup.pitch,
      端あき_mm: endgap[p] ?? null,
      原文: [top[p] && `上=${top[p]}`, bot[p] && `下=${bot[p]}`].filter(Boolean).join(' '),
    };
  }
  const widthMm = parseDim(widthMap.c) ?? parseDim(widthMap.a) ?? parseDim(widthMap.b);
  return {
    TypeName: symbol,
    符号: symbol,
    幅B_mm: widthMm,
    成D_mm: parseDim(r.成D),
    Fc_Nmm2: null,
    備考: '',
    pos: perPos,
  };
}

function addRcSheet(wb, sheetName, beams) {
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', xSplit: 2, ySplit: 2 }] });

  // Build header rows
  const totalCols = RC_BASIC_COLS.length + POSITIONS.length * RC_POS_FIELDS.length;
  const r1 = new Array(totalCols).fill('');
  const r2 = new Array(totalCols).fill('');
  RC_BASIC_COLS.forEach((c, i) => r1[i] = c.label);
  POSITIONS.forEach((p, pi) => {
    const start = RC_BASIC_COLS.length + pi * RC_POS_FIELDS.length;
    r1[start] = `位置 ${p}`;
    RC_POS_FIELDS.forEach((f, fi) => r2[start + fi] = f.label);
  });

  const row1 = ws.addRow(r1);
  const row2 = ws.addRow(r2);

  // Merge basic columns vertically across rows 1-2
  for (let i = 0; i < RC_BASIC_COLS.length; i++) {
    const col = i + 1;
    ws.mergeCells(1, col, 2, col);
  }
  // Merge each position group horizontally on row 1
  POSITIONS.forEach((p, pi) => {
    const startCol = RC_BASIC_COLS.length + pi * RC_POS_FIELDS.length + 1;
    const endCol   = startCol + RC_POS_FIELDS.length - 1;
    ws.mergeCells(1, startCol, 1, endCol);
  });

  styleHeaderRow(row1);
  styleHeaderRow(row2);
  row1.height = 22;
  row2.height = 22;

  // Data rows
  for (const beam of beams) {
    const row = new Array(totalCols).fill(null);
    RC_BASIC_COLS.forEach((c, i) => row[i] = beam[c.key]);
    POSITIONS.forEach((p, pi) => {
      const start = RC_BASIC_COLS.length + pi * RC_POS_FIELDS.length;
      const pos = beam.pos[p];
      RC_POS_FIELDS.forEach((f, fi) => row[start + fi] = pos[f.key] ?? null);
    });
    const r = ws.addRow(row);
    styleDataRow(r);
  }

  autoFitColumns(ws);
  return ws;
}

// ---------- 大梁 (S SG) — no スパン column ----------

const S_GROUPS = [
  { label: null, vmerge: true, cols: [
    { key: 'TypeName',     label: 'TypeName' },
    { key: '符号',          label: '符号'     },
  ]},
  { label: '断面', vmerge: false, cols: [
    { key: '断面形式',       label: '形式'      },
    { key: '成H_mm',         label: '成H'      },
    { key: '幅B_mm',         label: '幅B'      },
    { key: 'ウェブtw_mm',    label: 'ウェブtw'  },
    { key: 'フランジtf_mm',  label: 'フランジtf' },
  ]},
  { label: '通り', vmerge: false, cols: [
    { key: '通り起点',     label: '起点' },
    { key: '通り終点',     label: '終点' },
  ]},
  { label: null, vmerge: true, cols: [
    { key: '鋼材グレード', label: '鋼材グレード' },
    { key: '区分',         label: '区分'         },
    { key: '原文',         label: '原文'         },
    { key: '備考',         label: '備考'         },
  ]},
];

function buildSBeamData(beam) {
  const r = beam.原文 || {};
  const sec = parseSection(r.断面型);
  const grid = normalizeGrid(r.通り起点_列 || [], r.通り終点_列 || []);
  return {
    TypeName: beam.符号,
    符号: beam.符号,
    断面形式: sec?.kind ?? null,
    成H_mm: sec?.H ?? null,
    幅B_mm: sec?.B ?? null,
    ウェブtw_mm: sec?.tw ?? null,
    フランジtf_mm: sec?.tf ?? null,
    通り起点: grid.start ?? '',
    通り終点: grid.end ?? '',
    鋼材グレード: '',
    区分: '',
    原文: r.断面型 ?? '',
    備考: '',
  };
}

function addGroupedSheet(wb, sheetName, groups, dataRows, opts = {}) {
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', xSplit: 2, ySplit: 2 }] });

  const flatCols = groups.flatMap(g => g.cols);
  const totalCols = flatCols.length;
  const r1 = new Array(totalCols).fill('');
  const r2 = new Array(totalCols).fill('');
  let col = 0;
  const merges = [];
  for (const g of groups) {
    if (g.vmerge) {
      for (const c of g.cols) {
        r1[col] = c.label;
        merges.push([1, col + 1, 2, col + 1]);
        col++;
      }
    } else {
      r1[col] = g.label;
      if (g.cols.length > 1) merges.push([1, col + 1, 1, col + g.cols.length]);
      else merges.push([1, col + 1, 2, col + 1]);
      g.cols.forEach((c, i) => r2[col + i] = c.label);
      col += g.cols.length;
    }
  }
  const row1 = ws.addRow(r1);
  const row2 = ws.addRow(r2);
  for (const m of merges) ws.mergeCells(...m);
  styleHeaderRow(row1);
  styleHeaderRow(row2);
  row1.height = 22;
  row2.height = 22;

  for (const data of dataRows) {
    const arr = flatCols.map(c => data[c.key] ?? null);
    const r = ws.addRow(arr);
    styleDataRow(r);
  }

  autoFitColumns(ws, opts.minWidth ?? 6, opts.maxWidth ?? 32);
  return ws;
}

// ---------- 小梁 placeholder ----------

// 小梁 (鉄骨小梁): H/SH-section + material. Built from extract-small-beam-ocr.mjs.
const SMALL_BEAM_GROUPS = [
  { label: null, vmerge: true, cols: [
    { key: 'TypeName',  label: 'TypeName' },
    { key: '符号',       label: '符号'      },
    { key: '構造',       label: '構造'      },
  ]},
  { label: '断面', vmerge: false, cols: [
    { key: '断面形式',  label: '形式' },
    { key: '成H_mm',    label: '成H'  },
    { key: '幅B_mm',    label: '幅B'  },
    { key: 'ウェブtw_mm',   label: 'ウェブtw'  },
    { key: 'フランジtf_mm', label: 'フランジtf' },
  ]},
  { label: null, vmerge: true, cols: [
    { key: '鋼材グレード', label: '鋼材グレード' },
    { key: '原文',         label: '原文'         },
    { key: '備考',         label: '備考'         },
  ]},
];

function buildSmallBeamData(beam) {
  const r = beam.原文 || {};
  const sec = parseSection(r.断面型);
  return {
    TypeName: beam.符号,
    符号: beam.符号,
    構造: 'S',
    断面形式: sec?.kind ?? null,
    成H_mm: sec?.H ?? null,
    幅B_mm: sec?.B ?? null,
    ウェブtw_mm: sec?.tw ?? null,
    フランジtf_mm: sec?.tf ?? null,
    鋼材グレード: r.鋼材グレード ?? '',
    原文: r.断面型 ?? '',
    備考: 'OCR抽出',
  };
}

// ---------- 柱 (per-floor sections split into A/B/t cells) ----------

const COL_BASIC = [
  { key: 'TypeName', label: 'TypeName' },
  { key: '符号',      label: '符号'      },
];
function sectionGroupCols(n) {
  return [
    { key: `形式${n}`,     label: '形式'  },
    { key: `成H_A${n}_mm`, label: 'A/H' },
    { key: `幅B${n}_mm`,   label: '幅B'  },
    { key: `t1${n}_mm`,    label: 't1'  },
    { key: `t2${n}_mm`,    label: 't2'  },
  ];
}
function buildColumnGroups(maxSections) {
  const groups = [
    { label: null, vmerge: true, cols: COL_BASIC },
  ];
  for (let i = 1; i <= maxSections; i++) {
    groups.push({ label: `断面 ${i}`, vmerge: false, cols: sectionGroupCols(i) });
  }
  groups.push({ label: null, vmerge: true, cols: [
    { key: '鋼材グレード', label: '鋼材グレード' },
    { key: '備考',          label: '備考'          },
  ]});
  return groups;
}

function buildColumnData(col, maxSections) {
  const out = {
    TypeName: col.符号,
    符号: col.符号,
    鋼材グレード: (col.原文?.鋼材グレード_列 || []).join(','),
    備考: 'OCR抽出',
  };
  const sections = (col.原文?.断面型_列 || []).map(parseColumnSection).filter(Boolean);
  for (let i = 0; i < maxSections; i++) {
    const s = sections[i];
    const n = i + 1;
    if (!s) {
      out[`形式${n}`] = null;
      out[`成H_A${n}_mm`] = null;
      out[`幅B${n}_mm`] = null;
      out[`t1${n}_mm`] = null;
      out[`t2${n}_mm`] = null;
    } else if (s.kind === '□') {
      out[`形式${n}`] = '□';
      out[`成H_A${n}_mm`] = s.A;
      out[`幅B${n}_mm`] = s.B;
      out[`t1${n}_mm`] = s.t;
      out[`t2${n}_mm`] = null;
    } else {
      // H section
      out[`形式${n}`] = s.kind;
      out[`成H_A${n}_mm`] = s.H;
      out[`幅B${n}_mm`] = s.B;
      out[`t1${n}_mm`] = s.tw;
      out[`t2${n}_mm`] = s.tf;
    }
  }
  return out;
}

// ---------- assemble ----------

const realRcBeams = rcBeamsRaw.filter(b => b.原文?.スパン);
const rcSymbolsAll = realRcBeams.flatMap(b => expandCompound(b.符号));
const rcCategory = detectCategory(rcSymbolsAll);

const sSymbolsAll = sBeamsRaw.map(b => b.符号);
const sCategory = detectCategory(sSymbolsAll);

const colSymbolsAll = columnsRaw.map(c => c.符号);
const colCategory = columnsRaw.length > 0 ? detectCategory(colSymbolsAll) : null;

console.log(`RC: ${rcCategory.kind} (${realRcBeams.length}件)`);
console.log(`S:  ${sCategory.kind} (${sBeamsRaw.length}件)`);
if (colCategory) console.log(`柱: ${colCategory.kind} (${columnsRaw.length}件)`);

const rcDataRows = [];
for (const beam of realRcBeams) {
  for (const sym of expandCompound(beam.符号)) {
    rcDataRows.push(buildRcBeamData(beam, sym));
  }
}
const sDataRows = sBeamsRaw.map(buildSBeamData);
const smallBeamRows = smallBeamsRaw.map(buildSmallBeamData);
const maxColSections = Math.max(1, ...columnsRaw.map(c => (c.原文?.断面型_列 || []).length));
const colDataRows = columnsRaw.map(c => buildColumnData(c, maxColSections));

const smallSymbols = smallBeamsRaw.map(b => b.符号);
const smallCategory = smallSymbols.length ? detectCategory(smallSymbols) : null;
if (smallCategory) console.log(`小梁: ${smallCategory.kind} (${smallSymbols.length}件)`);

// ---------- workbook ----------

const wb = new ExcelJS.Workbook();
wb.creator = 'pdf-to-excel-proto';
wb.created = new Date();

// Meta
{
  const ws = wb.addWorksheet('Meta');
  const rows = [
    ['key', 'value'],
    ['schema_version', 'v1'],
    ['source_pdf_filename', 'PDF1.pdf + PDF2.pdf'],
    ['extracted_at', new Date().toISOString()],
    ['extracted_by', 'pdf-to-excel-proto@0.1.0'],
    ['detected_categories', [
      `${rcCategory.kind} (${rcDataRows.length}行)`,
      `${sCategory.kind} (${sDataRows.length}行)`,
      colCategory ? `${colCategory.kind} (${colDataRows.length}行) OCR` : null,
    ].filter(Boolean).join(', ')],
  ];
  rows.forEach((r, i) => {
    const row = ws.addRow(r);
    if (i === 0) styleHeaderRow(row);
  });
  autoFitColumns(ws);
}

// 基礎大梁
addRcSheet(wb, '基礎大梁', rcDataRows);

// 大梁 (S SG) — sheet name is just "大梁" per user request, no スパン column
addGroupedSheet(wb, '大梁', S_GROUPS, sDataRows);

// 小梁 — built from PDF2 page 3 (S小梁) via OCR
addGroupedSheet(wb, '小梁', SMALL_BEAM_GROUPS, smallBeamRows);

// 柱
if (colCategory) {
  addGroupedSheet(wb, '柱', buildColumnGroups(maxColSections), colDataRows);
}

await wb.xlsx.writeFile(outPath);
console.log(`\nwrote ${outPath}`);
console.log(`  Meta`);
console.log(`  基礎大梁: ${rcDataRows.length} 行`);
console.log(`  大梁:     ${sDataRows.length} 行`);
console.log(`  小梁:     ${smallBeamRows.length} 行 (OCR)`);
if (colCategory) console.log(`  柱:       ${colDataRows.length} 行 (OCR、最大 ${maxColSections} 断面/柱)`);
