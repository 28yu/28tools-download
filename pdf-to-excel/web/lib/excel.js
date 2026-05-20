// ExcelJS browser build wrapper. Lazy-loads exceljs, then builds the
// same multi-sheet workbook as pdf-to-excel/src/build-excel.mjs and returns
// a Blob ready for download.

import {
  parseRebarDia, parseRebarCount, parseStirrup, parseDim,
  expandCompound, parseSection, normalizeGrid, detectCategory,
  parseColumnSection,
} from './parsers.js';

let excelJsLoaded = null;
async function loadExcelJs() {
  if (excelJsLoaded) return excelJsLoaded;
  excelJsLoaded = new Promise((resolve, reject) => {
    if (window.ExcelJS) return resolve(window.ExcelJS);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    s.onload = () => resolve(window.ExcelJS);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return excelJsLoaded;
}

// --- styling helpers (same as Node build-excel.mjs) ---
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
function styleHeader(row) {
  row.eachCell({ includeEmpty: true }, c => {
    c.font = HEADER_FONT;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.fill = HEADER_FILL;
    c.border = HEADER_BORDER;
  });
}
function styleData(row) {
  row.eachCell({ includeEmpty: true }, c => {
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = DATA_BORDER;
  });
}
function visualLen(s) {
  if (s == null) return 0;
  let n = 0;
  for (const ch of String(s)) n += ch.charCodeAt(0) > 0x7F ? 2 : 1;
  return n;
}
function autoFit(ws, min = 6, max = 36) {
  for (let c = 1; c <= ws.columnCount; c++) {
    let maxLen = min;
    for (let r = 1; r <= ws.rowCount; r++) {
      const len = visualLen(ws.getCell(r, c).value) + 2;
      if (len > maxLen) maxLen = len;
    }
    ws.getColumn(c).width = Math.min(maxLen, max);
  }
}

// ============================================================
// 基礎大梁 (RC) — 3-row header
// ============================================================
const POSITIONS = [
  { key: 'a', label: '左端'      },
  { key: 'c', label: '中央'      },
  { key: 'b', label: '右端'      },
  { key: 'd', label: '中間 (d)' },
  { key: 'e', label: '中間 (e)' },
];
const RC_BASIC = [
  { key: 'TypeName',       label: 'TypeName' },
  { key: '符号',            label: '符号'      },
  { key: '幅B',             label: '幅B'      },
  { key: '成D',             label: '成D'      },
  { key: '構造マテリアル',  label: '構造マテリアル' },
  { key: '主筋材質',        label: '主筋材質'   },
  { key: '備考',            label: '備考'      },
];
const RC_SUBGROUPS = [
  { label: '主筋', vmerge: false, cols: [
    { key: '主筋径', label: '径'     },
    { key: '上_1段', label: '上_1段' },
    { key: '上_2段', label: '上_2段' },
    { key: '下_1段', label: '下_1段' },
    { key: '下_2段', label: '下_2段' },
  ]},
  { label: 'あばら筋', vmerge: false, cols: [
    { key: 'あばら径',   label: '径'    },
    { key: 'あばら脚数', label: '脚数'  },
    { key: 'あばらピッチ', label: 'ピッチ' },
  ]},
  { label: null, vmerge: true, cols: [
    { key: '原文', label: '原文' },
  ]},
];
const RC_POS_FIELDS = RC_SUBGROUPS.flatMap(g => g.cols);

function buildRcRow(beam, symbol) {
  const r = beam.原文 || {};
  const top = r.主筋上 || {}, bot = r.主筋下 || {};
  const stirrup = parseStirrup(r.あばら筋);
  const dia = parseRebarDia(r.主筋径);
  const widthMap = r.幅B || {};
  const perPos = {};
  for (const { key: p } of POSITIONS) {
    const tc = parseRebarCount(top[p]);
    const bc = parseRebarCount(bot[p]);
    perPos[p] = {
      主筋径: dia,
      上_1段: tc?.s1 ?? null,
      上_2段: tc?.s2 ?? null,
      下_1段: bc?.s1 ?? null,
      下_2段: bc?.s2 ?? null,
      あばら径: stirrup.dia,
      あばら脚数: stirrup.legs,
      あばらピッチ: stirrup.pitch,
      原文: [top[p] && `上=${top[p]}`, bot[p] && `下=${bot[p]}`].filter(Boolean).join(' '),
    };
  }
  const widthMm = parseDim(widthMap.c) ?? parseDim(widthMap.a) ?? parseDim(widthMap.b);
  return {
    TypeName: symbol, 符号: symbol,
    幅B: widthMm, 成D: parseDim(r.成D),
    構造マテリアル: r.構造マテリアル ?? '',
    主筋材質: r.主筋材質 ?? '',
    備考: '',
    pos: perPos,
  };
}

function addRcSheet(wb, name, rows) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }] });
  const fpp = RC_POS_FIELDS.length;
  const total = RC_BASIC.length + POSITIONS.length * fpp;
  const r1 = new Array(total).fill('');
  const r2 = new Array(total).fill('');
  const r3 = new Array(total).fill('');
  RC_BASIC.forEach((c, i) => r1[i] = c.label);
  POSITIONS.forEach((pos, pi) => {
    const blockStart = RC_BASIC.length + pi * fpp;
    r1[blockStart] = pos.label;
    let offset = 0;
    for (const g of RC_SUBGROUPS) {
      const sub = blockStart + offset;
      if (g.vmerge) g.cols.forEach((f, fi) => r2[sub + fi] = f.label);
      else {
        r2[sub] = g.label;
        g.cols.forEach((f, fi) => r3[sub + fi] = f.label);
      }
      offset += g.cols.length;
    }
  });
  const row1 = ws.addRow(r1), row2 = ws.addRow(r2), row3 = ws.addRow(r3);
  for (let i = 0; i < RC_BASIC.length; i++) ws.mergeCells(1, i+1, 3, i+1);
  POSITIONS.forEach((pos, pi) => {
    const sc = RC_BASIC.length + pi * fpp + 1;
    ws.mergeCells(1, sc, 1, sc + fpp - 1);
    let offset = 0;
    for (const g of RC_SUBGROUPS) {
      const ss = sc + offset;
      if (g.vmerge) {
        for (let i = 0; i < g.cols.length; i++) ws.mergeCells(2, ss + i, 3, ss + i);
      } else if (g.cols.length > 1) {
        ws.mergeCells(2, ss, 2, ss + g.cols.length - 1);
      }
      offset += g.cols.length;
    }
  });
  styleHeader(row1); styleHeader(row2); styleHeader(row3);
  row1.height = row2.height = row3.height = 22;
  for (const beam of rows) {
    const arr = new Array(total).fill(null);
    RC_BASIC.forEach((c, i) => arr[i] = beam[c.key]);
    POSITIONS.forEach((pos, pi) => {
      const start = RC_BASIC.length + pi * fpp;
      const p = beam.pos[pos.key];
      RC_POS_FIELDS.forEach((f, fi) => arr[start + fi] = p?.[f.key] ?? null);
    });
    styleData(ws.addRow(arr));
  }
  autoFit(ws);
  return ws;
}

// ============================================================
// Grouped sheet (大梁, 小梁, 柱) — 2-row header
// ============================================================
function addGroupedSheet(wb, name, groups, rows) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', xSplit: 2, ySplit: 2 }] });
  const flat = groups.flatMap(g => g.cols);
  const r1 = new Array(flat.length).fill('');
  const r2 = new Array(flat.length).fill('');
  let col = 0;
  const merges = [];
  for (const g of groups) {
    if (g.vmerge) {
      for (const c of g.cols) {
        r1[col] = c.label;
        merges.push([1, col+1, 2, col+1]);
        col++;
      }
    } else {
      r1[col] = g.label;
      merges.push([1, col+1, 1, col + g.cols.length]);
      g.cols.forEach((c, i) => r2[col+i] = c.label);
      col += g.cols.length;
    }
  }
  const row1 = ws.addRow(r1), row2 = ws.addRow(r2);
  for (const m of merges) ws.mergeCells(...m);
  styleHeader(row1); styleHeader(row2);
  row1.height = row2.height = 22;
  for (const data of rows) {
    const arr = flat.map(c => data[c.key] ?? null);
    styleData(ws.addRow(arr));
  }
  autoFit(ws);
  return ws;
}

// 大梁 (S) 列定義
const S_GROUPS = [
  { label: null, vmerge: true, cols: [
    { key: 'TypeName', label: 'TypeName' },
    { key: '符号',      label: '符号'      },
  ]},
  { label: '断面', vmerge: false, cols: [
    { key: '断面形式',  label: '形式' },
    { key: '成H',       label: '成H' },
    { key: '幅B',       label: '幅B' },
    { key: 'ウェブtw',  label: 'ウェブtw' },
    { key: 'フランジtf', label: 'フランジtf' },
  ]},
  { label: '通り', vmerge: false, cols: [
    { key: '通り起点', label: '起点' },
    { key: '通り終点', label: '終点' },
  ]},
  { label: null, vmerge: true, cols: [
    { key: '構造マテリアル', label: '構造マテリアル' },
    { key: '原文',           label: '原文'         },
    { key: '備考',           label: '備考'         },
  ]},
];

function buildSRow(beam) {
  const r = beam.原文 || {};
  const sec = parseSection(r.断面型);
  const grid = normalizeGrid(r.通り起点_列 || [], r.通り終点_列 || []);
  return {
    TypeName: beam.符号, 符号: beam.符号,
    断面形式: sec?.kind ?? null,
    成H: sec?.H ?? null, 幅B: sec?.B ?? null,
    ウェブtw: sec?.tw ?? null, フランジtf: sec?.tf ?? null,
    通り起点: grid.start ?? '', 通り終点: grid.end ?? '',
    構造マテリアル: r.構造マテリアル ?? '',
    原文: r.断面型 ?? '', 備考: '',
  };
}

// 小梁 (S) 列定義
const SB_GROUPS = [
  { label: null, vmerge: true, cols: [
    { key: 'TypeName', label: 'TypeName' },
    { key: '符号',      label: '符号'      },
    { key: '構造',      label: '構造'      },
  ]},
  { label: '断面', vmerge: false, cols: [
    { key: '断面形式',  label: '形式' },
    { key: '成H',       label: '成H' },
    { key: '幅B',       label: '幅B' },
    { key: 'ウェブtw',  label: 'ウェブtw' },
    { key: 'フランジtf', label: 'フランジtf' },
  ]},
  { label: null, vmerge: true, cols: [
    { key: '構造マテリアル', label: '構造マテリアル' },
    { key: '原文',           label: '原文'         },
    { key: '備考',           label: '備考'         },
  ]},
];

function buildSmallBeamRow(beam) {
  const r = beam.原文 || {};
  const sec = parseSection(r.断面型);
  const sym = String(beam.符号).toLowerCase();
  return {
    TypeName: sym, 符号: sym, 構造: 'S',
    断面形式: sec?.kind ?? null,
    成H: sec?.H ?? null, 幅B: sec?.B ?? null,
    ウェブtw: sec?.tw ?? null, フランジtf: sec?.tf ?? null,
    構造マテリアル: r.構造マテリアル ?? r.鋼材グレード ?? '',
    原文: r.断面型 ?? '', 備考: 'OCR抽出',
  };
}

// 柱 列定義 — 動的に断面数を決める
function buildColumnGroups(maxSec) {
  const groups = [
    { label: null, vmerge: true, cols: [
      { key: 'TypeName', label: 'TypeName' },
      { key: '符号',      label: '符号'      },
    ]},
  ];
  for (let i = 1; i <= maxSec; i++) {
    groups.push({ label: `断面 ${i}`, vmerge: false, cols: [
      { key: `形式${i}`,     label: '形式' },
      { key: `成H_A${i}`,    label: 'A/H' },
      { key: `幅B${i}`,      label: '幅B' },
      { key: `t1${i}`,       label: 't1' },
      { key: `t2${i}`,       label: 't2' },
    ]});
  }
  groups.push({ label: null, vmerge: true, cols: [
    { key: '構造マテリアル', label: '構造マテリアル' },
    { key: '備考',           label: '備考'         },
  ]});
  return groups;
}

function buildColumnRow(col, maxSec) {
  const grades = col.原文?.鋼材グレード_列 || [];
  const out = {
    TypeName: col.符号, 符号: col.符号,
    構造マテリアル: col.原文?.構造マテリアル ?? grades.join(',') ?? '',
    備考: 'OCR抽出',
  };
  const sections = (col.原文?.断面型_列 || []).map(parseColumnSection).filter(Boolean);
  for (let i = 0; i < maxSec; i++) {
    const s = sections[i];
    const n = i + 1;
    if (!s) {
      out[`形式${n}`] = null; out[`成H_A${n}`] = null; out[`幅B${n}`] = null;
      out[`t1${n}`] = null; out[`t2${n}`] = null;
    } else if (s.kind === '□') {
      out[`形式${n}`] = '□'; out[`成H_A${n}`] = s.A; out[`幅B${n}`] = s.B;
      out[`t1${n}`] = s.t; out[`t2${n}`] = null;
    } else {
      out[`形式${n}`] = s.kind; out[`成H_A${n}`] = s.H; out[`幅B${n}`] = s.B;
      out[`t1${n}`] = s.tw; out[`t2${n}`] = s.tf;
    }
  }
  return out;
}

// ============================================================
// Build the workbook blob
// ============================================================

export async function buildExcelBlob(extracted) {
  const ExcelJS = await loadExcelJs();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'pdf-to-excel-web@0.1';
  wb.created = new Date();

  // Meta
  const meta = wb.addWorksheet('Meta');
  const counts = {
    rc: extracted.rcBeams?.length || 0,
    s:  extracted.sBeams?.length || 0,
    sb: extracted.smallBeams?.length || 0,
    col: extracted.columns?.length || 0,
  };
  const metaRows = [
    ['key', 'value'],
    ['schema_version', 'v1'],
    ['source_pdf', extracted.sourceFile || ''],
    ['extracted_at', new Date().toISOString()],
    ['extracted_by', 'pdf-to-excel-web@0.1'],
    ['counts', `RC基礎大梁=${counts.rc}, S大梁=${counts.s}, S小梁=${counts.sb}, 柱=${counts.col}`],
  ];
  metaRows.forEach((r, i) => {
    const row = meta.addRow(r);
    if (i === 0) styleHeader(row);
  });
  autoFit(meta);

  // 基礎大梁 (RC)
  if (counts.rc > 0) {
    const realRc = extracted.rcBeams.filter(b => b.原文?.スパン);
    const symbols = realRc.flatMap(b => expandCompound(b.符号));
    const cat = detectCategory(symbols);
    const dataRows = [];
    for (const beam of realRc) {
      for (const sym of expandCompound(beam.符号)) dataRows.push(buildRcRow(beam, sym));
    }
    addRcSheet(wb, cat.sheetName, dataRows);
  }

  // 大梁 (S)
  if (counts.s > 0) {
    const cat = detectCategory(extracted.sBeams.map(b => b.符号));
    addGroupedSheet(wb, cat.sheetName, S_GROUPS, extracted.sBeams.map(buildSRow));
  }

  // 小梁 (S)
  if (counts.sb > 0) {
    const cat = detectCategory(extracted.smallBeams.map(b => b.符号));
    addGroupedSheet(wb, cat.sheetName, SB_GROUPS, extracted.smallBeams.map(buildSmallBeamRow));
  }

  // 柱
  if (counts.col > 0) {
    const cat = detectCategory(extracted.columns.map(c => c.符号));
    const maxSec = Math.max(1, ...extracted.columns.map(c => (c.原文?.断面型_列 || []).length));
    addGroupedSheet(wb, cat.sheetName, buildColumnGroups(maxSec),
      extracted.columns.map(c => buildColumnRow(c, maxSec)));
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}
