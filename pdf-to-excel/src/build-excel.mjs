// Build schema v1 Excel from extracted beams JSON.
//
// Pipeline:
//   1. Read extracted beams (raw text per position)
//   2. Parse with parsers.mjs
//   3. Expand compound symbols (FG17,FG18,(FG19) -> 3 rows)
//   4. Emit .xlsx with Meta + RC_Beam + placeholder sheets
//
// Run: node build-excel.mjs <beams.json> [out.xlsx]

import { readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import {
  parseRebarDia, parseRebarCount, parseStirrup, parseDim,
  mergeEndgap, expandCompound,
} from './parsers.mjs';

const beamsPath = process.argv[2] || './sample-output-beams.json';
const outPath = process.argv[3] || './sample-output.xlsx';
const beams = JSON.parse(await readFile(beamsPath, 'utf8'));

// Schema v1 RC_Beam columns: basic 7 + 10×5 positions = 57
const POSITIONS = ['a', 'b', 'c', 'd', 'e'];
const basicCols = ['TypeName', '符号', 'スパン_mm', '幅B_mm', '成D_mm', 'Fc_Nmm2', '備考'];
const positionCols = POSITIONS.flatMap(x => [
  `${x}_主筋径`, `${x}_上_1段`, `${x}_上_2段`,
  `${x}_下_1段`, `${x}_下_2段`,
  `${x}_あばら径`, `${x}_あばら脚数`, `${x}_あばらピッチ_mm`,
  `${x}_端あき_mm`, `${x}_原文`,
]);
const headers = [...basicCols, ...positionCols];

// Build one schema row from one extracted beam.
// `posMapping`: maps extractor's a/c/b to schema's a/b/c/d/e
//   - For 3-position beams (a=left, c=center, b=right), we use schema's a/c/b (= positions a, c, b)
//   - Schema's d and e remain null for simple beams
function buildRow(beam, symbol) {
  const r = beam.原文 || {};
  const top = r.主筋上 || {}, bot = r.主筋下 || {};
  const endgap = mergeEndgap(r.端あき1, r.端あき2);
  const stirrup = parseStirrup(r.あばら筋);
  const dia = parseRebarDia(r.主筋径);
  const widthMap = r.幅B || {};

  // Per-position data; schema's a/c/b correspond to extractor's a/c/b (other letters left empty)
  const perPos = {
    a: {},
    b: {},
    c: {},
    d: {},
    e: {},
  };
  for (const p of ['a', 'c', 'b']) {
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
      端あき_mm: endgap[p],
      原文: [top[p] && `上=${top[p]}`, bot[p] && `下=${bot[p]}`].filter(Boolean).join(' '),
    };
  }

  // Width: typically single value (uniform) or 3 values (varied)
  // For schema's 幅B_mm we use center; if center is null fall back to a or b
  const widthMm = parseDim(widthMap.c) ?? parseDim(widthMap.a) ?? parseDim(widthMap.b);

  const row = {
    TypeName: symbol,
    符号: symbol,
    スパン_mm: parseDim(r.スパン),
    幅B_mm: widthMm,
    成D_mm: parseDim(r.成D),
    Fc_Nmm2: null, // not on this PDF
    備考: '',
  };
  for (const x of POSITIONS) {
    row[`${x}_主筋径`] = perPos[x].主筋径 ?? null;
    row[`${x}_上_1段`] = perPos[x].上_1段 ?? null;
    row[`${x}_上_2段`] = perPos[x].上_2段 ?? null;
    row[`${x}_下_1段`] = perPos[x].下_1段 ?? null;
    row[`${x}_下_2段`] = perPos[x].下_2段 ?? null;
    row[`${x}_あばら径`] = perPos[x].あばら径 ?? null;
    row[`${x}_あばら脚数`] = perPos[x].あばら脚数 ?? null;
    row[`${x}_あばらピッチ_mm`] = perPos[x].あばらピッチ_mm ?? null;
    row[`${x}_端あき_mm`] = perPos[x].端あき_mm ?? null;
    row[`${x}_原文`] = perPos[x].原文 ?? '';
  }
  return row;
}

// Process beams: skip the "FG19のみ" annotation band (where bands have no real values)
const realBeams = beams.filter(b => {
  // Filter out band 4 (FG19 annotations at y≈577) which have null span/dia
  return b.原文?.スパン !== undefined && b.原文?.スパン !== null;
});

// Expand compound symbols and build rows
const rows = [];
for (const beam of realBeams) {
  const symbols = expandCompound(beam.符号);
  if (symbols.length === 0) continue;
  for (const sym of symbols) {
    rows.push(buildRow(beam, sym));
  }
}

// Build sheets
const wb = XLSX.utils.book_new();

// Meta
const metaAoa = [
  ['key', 'value'],
  ['schema_version', 'v1'],
  ['source_pdf_filename', 'PDF2-p1-RC基礎大梁.pdf'],
  ['drawing_number', ''],
  ['drawing_name', 'RC基礎大梁リスト'],
  ['extracted_at', new Date().toISOString()],
  ['extracted_by', 'pdf-to-excel-proto@0.1.0'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metaAoa), 'Meta');

// RC_Beam
const rcBeamAoa = [headers, ...rows.map(r => headers.map(h => r[h] ?? ''))];
const rcBeamSheet = XLSX.utils.aoa_to_sheet(rcBeamAoa);
XLSX.utils.book_append_sheet(wb, rcBeamSheet, 'RC_Beam');

// Empty placeholder sheets
for (const name of ['RC_Column', 'CFT_Column', 'S_Beam']) {
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['placeholder']]), name);
}

XLSX.writeFile(wb, outPath);
console.log(`wrote ${outPath} (${rows.length} RC_Beam rows from ${realBeams.length} extracted beams)`);
console.log(`symbols: ${rows.map(r => r.符号).join(', ')}`);
