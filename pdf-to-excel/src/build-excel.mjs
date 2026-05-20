// Build schema v1 Excel from extracted beams JSON.
//
// Layout features:
//   - Sheet name = auto-detected category (基礎大梁 / S大梁 / 小梁 / 柱 / ...)
//   - 2-row merged header: outer groups (位置a/b/c/d/e or 断面/通り) on top,
//     individual fields underneath. Basic columns (TypeName, 符号, ...) span
//     both rows via vertical merge.
//   - One row per family TypeName (compound symbols are expanded into rows).

import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import {
  parseRebarDia, parseRebarCount, parseStirrup, parseDim,
  mergeEndgap, expandCompound, parseSection, normalizeGrid,
  detectCategory,
} from './parsers.mjs';

const outPath  = process.argv[2] || './sample-output.xlsx';
const rcPath   = process.argv[3] || './sample-output-beams.json';
const sPath    = process.argv[4] || './sample-output-sbeams.json';

const rcBeamsRaw = JSON.parse(await readFile(rcPath, 'utf8'));
const sBeamsRaw  = JSON.parse(await readFile(sPath, 'utf8'));

// ---------- RC sheet ----------

const POSITIONS = ['a', 'b', 'c', 'd', 'e'];
const RC_BASIC_COLS = [
  { key: 'TypeName',  label: 'TypeName'  },
  { key: '符号',       label: '符号'       },
  { key: 'スパン_mm',  label: 'スパン_mm'  },
  { key: '幅B_mm',     label: '幅B_mm'    },
  { key: '成D_mm',     label: '成D_mm'    },
  { key: 'Fc_Nmm2',   label: 'Fc_N/mm²'  },
  { key: '備考',       label: '備考'       },
];
const RC_POS_FIELDS = [
  '主筋径', '上_1段', '上_2段', '下_1段', '下_2段',
  'あばら径', 'あばら脚数', 'あばらピッチ_mm', '端あき_mm', '原文',
];

function buildRcRow(beam, symbol) {
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
  const row = {
    TypeName: symbol,
    符号: symbol,
    スパン_mm: parseDim(r.スパン),
    幅B_mm: widthMm,
    成D_mm: parseDim(r.成D),
    Fc_Nmm2: null,
    備考: '',
    pos: perPos,
  };
  return row;
}

function buildRcSheet(rows) {
  // Sheet as a 2D array of cells, then convert to worksheet with merges
  const totalCols = RC_BASIC_COLS.length + POSITIONS.length * RC_POS_FIELDS.length;

  // Row 1: basic labels (will be vmerged), then position group labels
  const headerRow1 = new Array(totalCols).fill('');
  RC_BASIC_COLS.forEach((c, i) => headerRow1[i] = c.label);
  POSITIONS.forEach((p, pi) => {
    const startCol = RC_BASIC_COLS.length + pi * RC_POS_FIELDS.length;
    headerRow1[startCol] = `位置 ${p}`;
  });

  // Row 2: blank for basic cols, sub-fields for position groups
  const headerRow2 = new Array(totalCols).fill('');
  POSITIONS.forEach((p, pi) => {
    const startCol = RC_BASIC_COLS.length + pi * RC_POS_FIELDS.length;
    RC_POS_FIELDS.forEach((f, fi) => headerRow2[startCol + fi] = f);
  });

  // Data rows
  const dataRows = rows.map(row => {
    const arr = new Array(totalCols).fill(null);
    RC_BASIC_COLS.forEach((c, i) => arr[i] = row[c.key]);
    POSITIONS.forEach((p, pi) => {
      const startCol = RC_BASIC_COLS.length + pi * RC_POS_FIELDS.length;
      const pos = row.pos[p];
      arr[startCol + 0] = pos.主筋径;
      arr[startCol + 1] = pos.上_1段;
      arr[startCol + 2] = pos.上_2段;
      arr[startCol + 3] = pos.下_1段;
      arr[startCol + 4] = pos.下_2段;
      arr[startCol + 5] = pos.あばら径;
      arr[startCol + 6] = pos.あばら脚数;
      arr[startCol + 7] = pos.あばらピッチ_mm;
      arr[startCol + 8] = pos.端あき_mm;
      arr[startCol + 9] = pos.原文;
    });
    return arr;
  });

  const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);

  // Merges: basic cols vertical (r0-r1), position group horizontal (r0 across 10 cols)
  const merges = [];
  for (let i = 0; i < RC_BASIC_COLS.length; i++) {
    merges.push({ s: { r: 0, c: i }, e: { r: 1, c: i } });
  }
  POSITIONS.forEach((p, pi) => {
    const startCol = RC_BASIC_COLS.length + pi * RC_POS_FIELDS.length;
    merges.push({
      s: { r: 0, c: startCol },
      e: { r: 0, c: startCol + RC_POS_FIELDS.length - 1 },
    });
  });
  ws['!merges'] = merges;

  // Column widths
  const colWidths = [];
  for (let i = 0; i < RC_BASIC_COLS.length; i++) {
    colWidths.push({ wch: i === 0 || i === 1 ? 10 : 12 });
  }
  for (let pi = 0; pi < POSITIONS.length; pi++) {
    for (let fi = 0; fi < RC_POS_FIELDS.length; fi++) {
      colWidths.push({ wch: fi === 9 ? 24 : 8 });
    }
  }
  ws['!cols'] = colWidths;
  ws['!rows'] = [{ hpt: 22 }, { hpt: 22 }];

  return ws;
}

// ---------- S sheet ----------

const S_BASIC_HEAD = [
  { key: 'TypeName', label: 'TypeName' },
  { key: '符号',     label: '符号'     },
];
const S_SECTION_FIELDS = [
  { key: '断面形式',     label: '形式'        },
  { key: '成H_mm',      label: '成H_mm'    },
  { key: '幅B_mm',      label: '幅B_mm'    },
  { key: 'ウェブtw_mm', label: 'ウェブtw_mm'   },
  { key: 'フランジtf_mm', label: 'フランジtf_mm' },
];
const S_SPAN_HEAD = [
  { key: 'スパン_mm', label: 'スパン_mm (CSV)' },
];
const S_GRID_FIELDS = [
  { key: '通り起点', label: '起点' },
  { key: '通り終点', label: '終点' },
];
const S_TAIL_HEAD = [
  { key: '鋼材グレード', label: '鋼材グレード' },
  { key: '区分',         label: '区分'         },
  { key: '原文',         label: '原文'         },
  { key: '備考',         label: '備考'         },
];

function buildSRow(beam) {
  const r = beam.原文 || {};
  const sec = parseSection(r.断面型);
  const grid = normalizeGrid(r.通り起点_列 || [], r.通り終点_列 || []);
  const spanMms = (r.スパン_列 || []).map(parseDim).filter(v => v !== null);
  return {
    TypeName: beam.符号,
    符号: beam.符号,
    断面形式: sec?.kind ?? null,
    成H_mm: sec?.H ?? null,
    幅B_mm: sec?.B ?? null,
    ウェブtw_mm: sec?.tw ?? null,
    フランジtf_mm: sec?.tf ?? null,
    スパン_mm: spanMms.join(';'),
    通り起点: grid.start ?? '',
    通り終点: grid.end ?? '',
    鋼材グレード: '',
    区分: '',
    原文: r.断面型 ?? '',
    備考: '',
  };
}

function buildSSheet(rows) {
  const groups = [
    { label: null,     cols: S_BASIC_HEAD,   vmerge: true  },
    { label: '断面',   cols: S_SECTION_FIELDS, vmerge: false },
    { label: null,     cols: S_SPAN_HEAD,    vmerge: true  },
    { label: '通り',   cols: S_GRID_FIELDS,  vmerge: false },
    { label: null,     cols: S_TAIL_HEAD,    vmerge: true  },
  ];
  const flatCols = groups.flatMap(g => g.cols);
  const totalCols = flatCols.length;

  const headerRow1 = new Array(totalCols).fill('');
  const headerRow2 = new Array(totalCols).fill('');
  let col = 0;
  const merges = [];
  for (const g of groups) {
    if (g.vmerge) {
      for (const c of g.cols) {
        headerRow1[col] = c.label;
        merges.push({ s: { r: 0, c: col }, e: { r: 1, c: col } });
        col++;
      }
    } else {
      headerRow1[col] = g.label;
      merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + g.cols.length - 1 } });
      g.cols.forEach((c, i) => headerRow2[col + i] = c.label);
      col += g.cols.length;
    }
  }

  const dataRows = rows.map(row => flatCols.map(c => row[c.key] ?? ''));
  const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
  ws['!merges'] = merges;
  ws['!cols'] = flatCols.map(c => ({ wch: c.label.length > 8 ? c.label.length + 4 : 10 }));
  ws['!rows'] = [{ hpt: 22 }, { hpt: 22 }];
  return ws;
}

// ---------- Detect categories ----------

const realRcBeams = rcBeamsRaw.filter(b => b.原文?.スパン);
const rcSymbolsAll = realRcBeams.flatMap(b => expandCompound(b.符号));
const rcCategory = detectCategory(rcSymbolsAll);
console.log(`RC 群: ${rcSymbolsAll.length} 個の符号、検出カテゴリ = ${rcCategory.kind} (シート名: ${rcCategory.sheetName})`);

const sSymbolsAll = sBeamsRaw.map(b => b.符号);
const sCategory = detectCategory(sSymbolsAll);
console.log(`S 群: ${sSymbolsAll.length} 個の符号、検出カテゴリ = ${sCategory.kind} (シート名: ${sCategory.sheetName})`);

// ---------- Build RC rows (expanded) ----------

const rcRows = [];
for (const beam of realRcBeams) {
  const symbols = expandCompound(beam.符号);
  for (const sym of symbols) rcRows.push(buildRcRow(beam, sym));
}
const sRows = sBeamsRaw.map(buildSRow);

// ---------- Workbook ----------

const wb = XLSX.utils.book_new();

const metaAoa = [
  ['key', 'value'],
  ['schema_version', 'v1'],
  ['source_pdf_filename', 'PDF2.pdf'],
  ['extracted_at', new Date().toISOString()],
  ['extracted_by', 'pdf-to-excel-proto@0.1.0'],
  ['detected_categories', `${rcCategory.kind} (${rcRows.length}行), ${sCategory.kind} (${sRows.length}行)`],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metaAoa), 'Meta');

XLSX.utils.book_append_sheet(wb, buildRcSheet(rcRows), rcCategory.sheetName);
XLSX.utils.book_append_sheet(wb, buildSSheet(sRows),   sCategory.sheetName);

XLSX.writeFile(wb, outPath);
console.log(`\nwrote ${outPath}`);
console.log(`  Meta sheet`);
console.log(`  ${rcCategory.sheetName}: ${rcRows.length} 行`);
console.log(`  ${sCategory.sheetName}: ${sRows.length} 行`);
