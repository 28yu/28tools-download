// Build schema v1 Excel from extracted beams JSON.
//
// Pipeline:
//   1. Read extracted RC and S beam JSON
//   2. Parse with parsers.mjs
//   3. Expand compound symbols (FG17,FG18,(FG19) -> 3 rows)
//   4. Emit .xlsx with Meta + RC_Beam + S_Beam + placeholder sheets
//
// Run: node build-excel.mjs [out.xlsx] [rc-beams.json] [s-beams.json]

import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import {
  parseRebarDia, parseRebarCount, parseStirrup, parseDim,
  mergeEndgap, expandCompound, parseSection, normalizeGrid,
} from './parsers.mjs';

const outPath  = process.argv[2] || './sample-output.xlsx';
const rcPath   = process.argv[3] || './sample-output-beams.json';
const sPath    = process.argv[4] || './sample-output-sbeams.json';

const rcBeamsRaw = JSON.parse(await readFile(rcPath, 'utf8'));
const sBeamsRaw  = JSON.parse(await readFile(sPath, 'utf8'));

// ----- RC_Beam -----
const POSITIONS = ['a', 'b', 'c', 'd', 'e'];
const rcBasicCols = ['TypeName', '符号', 'スパン_mm', '幅B_mm', '成D_mm', 'Fc_Nmm2', '備考'];
const rcPosCols = POSITIONS.flatMap(x => [
  `${x}_主筋径`, `${x}_上_1段`, `${x}_上_2段`,
  `${x}_下_1段`, `${x}_下_2段`,
  `${x}_あばら径`, `${x}_あばら脚数`, `${x}_あばらピッチ_mm`,
  `${x}_端あき_mm`, `${x}_原文`,
]);
const rcHeaders = [...rcBasicCols, ...rcPosCols];

function buildRcRow(beam, symbol) {
  const r = beam.原文 || {};
  const top = r.主筋上 || {}, bot = r.主筋下 || {};
  const endgap = mergeEndgap(r.端あき1, r.端あき2);
  const stirrup = parseStirrup(r.あばら筋);
  const dia = parseRebarDia(r.主筋径);
  const widthMap = r.幅B || {};

  const perPos = { a:{}, b:{}, c:{}, d:{}, e:{} };
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

  const widthMm = parseDim(widthMap.c) ?? parseDim(widthMap.a) ?? parseDim(widthMap.b);
  const row = {
    TypeName: symbol,
    符号: symbol,
    スパン_mm: parseDim(r.スパン),
    幅B_mm: widthMm,
    成D_mm: parseDim(r.成D),
    Fc_Nmm2: null,
    備考: '',
  };
  for (const x of POSITIONS) {
    row[`${x}_主筋径`]        = perPos[x].主筋径 ?? null;
    row[`${x}_上_1段`]        = perPos[x].上_1段 ?? null;
    row[`${x}_上_2段`]        = perPos[x].上_2段 ?? null;
    row[`${x}_下_1段`]        = perPos[x].下_1段 ?? null;
    row[`${x}_下_2段`]        = perPos[x].下_2段 ?? null;
    row[`${x}_あばら径`]      = perPos[x].あばら径 ?? null;
    row[`${x}_あばら脚数`]    = perPos[x].あばら脚数 ?? null;
    row[`${x}_あばらピッチ_mm`] = perPos[x].あばらピッチ_mm ?? null;
    row[`${x}_端あき_mm`]     = perPos[x].端あき_mm ?? null;
    row[`${x}_原文`]          = perPos[x].原文 ?? '';
  }
  return row;
}

const realRcBeams = rcBeamsRaw.filter(b => b.原文?.スパン);
const rcRows = [];
for (const beam of realRcBeams) {
  const symbols = expandCompound(beam.符号);
  for (const sym of symbols) rcRows.push(buildRcRow(beam, sym));
}

// ----- S_Beam -----
const sHeaders = [
  'TypeName', '符号', '断面形式', '成H_mm', '幅B_mm', 'ウェブtw_mm', 'フランジtf_mm',
  'スパン_mm', '通り起点', '通り終点', '鋼材グレード', '区分', '原文', '備考',
];

function buildSRow(beam) {
  const r = beam.原文 || {};
  const sec = parseSection(r.断面型);
  const grid = normalizeGrid(r.通り起点_列 || [], r.通り終点_列 || []);
  // Spans CSV: ';'-joined integer mm values
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
const sRows = sBeamsRaw.map(buildSRow);

// ----- Build workbook -----
const wb = XLSX.utils.book_new();

const metaAoa = [
  ['key', 'value'],
  ['schema_version', 'v1'],
  ['source_pdf_filename', 'PDF2.pdf'],
  ['drawing_number', ''],
  ['drawing_name', 'RC基礎大梁リスト + S大梁リスト'],
  ['extracted_at', new Date().toISOString()],
  ['extracted_by', 'pdf-to-excel-proto@0.1.0'],
];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metaAoa), 'Meta');

const rcAoa = [rcHeaders, ...rcRows.map(r => rcHeaders.map(h => r[h] ?? ''))];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rcAoa), 'RC_Beam');

const sAoa = [sHeaders, ...sRows.map(r => sHeaders.map(h => r[h] ?? ''))];
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sAoa), 'S_Beam');

for (const name of ['RC_Column', 'CFT_Column']) {
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['placeholder']]), name);
}

XLSX.writeFile(wb, outPath);
console.log(`wrote ${outPath}`);
console.log(`  RC_Beam: ${rcRows.length} rows`);
console.log(`  S_Beam:  ${sRows.length} rows`);
