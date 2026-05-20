// OCR-based extractor for column lists (柱リスト) whose source PDF uses
// glyph-obfuscated subset fonts (CIDs with no usable ToUnicode CMap).
//
// Pipeline:
//   1. Render the target page to PNG at 300 DPI via `pdftoppm`.
//   2. Run `tesseract -l jpn --psm 6 tsv` to get per-word bboxes + confidence.
//   3. Parse the TSV into the same {str, x, y} shape used by the text-based
//      anchor extractors, with pixel→pt conversion (px * 72/dpi).
//   4. Locate column anchors (SC1..SCn / C1..Cn / CC1..CCn) and capture the
//      section type + material strings near each.
//
// External deps: tesseract-ocr, tesseract-ocr-jpn, poppler-utils (pdftoppm).

import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

const execFile = promisify(execFileCb);

const PDF = process.argv[2] || '/root/.claude/uploads/63fa573a-2b05-466d-ab28-870307f65d0a/60eecc3e-test_____.pdf';
const PAGE = parseInt(process.argv[3] || '1');
const OUT = process.argv[4] || './sample-output-columns.json';
const DPI = 300;

const tmp = await mkdtemp(path.join(tmpdir(), 'ocr-'));
const pngPrefix = path.join(tmp, 'p');
const tsvPrefix = path.join(tmp, 'out');

console.log(`rendering page ${PAGE} of ${path.basename(PDF)} at ${DPI} DPI...`);
await execFile('pdftoppm', ['-r', String(DPI), '-f', String(PAGE), '-l', String(PAGE), '-png', PDF, pngPrefix]);
const png = `${pngPrefix}-${PAGE}.png`;

console.log('running tesseract (jpn, psm 6)...');
// PSM 11 (sparse text) works better for column lists where labels are scattered
// in cells rather than forming continuous prose. PSM 6 (block) underdetects.
await execFile('tesseract', [png, tsvPrefix, '-l', 'jpn', '--psm', '11', 'tsv']);
const tsv = await readFile(`${tsvPrefix}.tsv`, 'utf8');

// Parse TSV → words with pt coords
const px2pt = 72 / DPI;
const words = [];
for (const line of tsv.split('\n').slice(1)) {
  const c = line.split('\t');
  if (c.length < 12) continue;
  const text = (c[11] || '').trim();
  if (!text || c[0] !== '5') continue;
  const conf = parseFloat(c[10]);
  if (conf < 40) continue;
  words.push({
    str: text,
    x: parseFloat(c[6]) * px2pt,
    y: parseFloat(c[7]) * px2pt,
    w: parseFloat(c[8]) * px2pt,
    h: parseFloat(c[9]) * px2pt,
    conf,
  });
}
console.log(`OCR yielded ${words.length} words (conf>=40)`);

// Find column anchors. Symbols typical in Japanese 柱リスト:
//   SC1..SCn  (steel column)
//   C1..Cn    (RC column)
//   CC1..CCn  (concrete-encased column)
//   CFT1..    (CFT column)
const colRe = /^(SC|CC|CFT|C)\d+[A-Z]?$/;
const anchors = words.filter(w => colRe.test(w.str));
console.log(`column anchors: ${anchors.length} → ${anchors.map(a => `${a.str}@(${a.x.toFixed(0)},${a.y.toFixed(0)})`).join(' ')}`);

// Cluster anchors that are on the same row (柱リストの 1 行目: SC1〜SCn 横並び)
anchors.sort((a,b) => a.y - b.y);
const rows = [];
for (const a of anchors) {
  const last = rows[rows.length - 1];
  if (last && Math.abs(a.y - last.y) <= 8) {
    last.anchors.push(a);
    last.y = (last.y * (last.anchors.length-1) + a.y) / last.anchors.length;
  } else rows.push({ y: a.y, anchors: [a] });
}
for (const r of rows) r.anchors.sort((a,b) => a.x - b.x);

// Take the row with the most anchors as the canonical column-list header row.
const headerRow = rows.sort((a,b) => b.anchors.length - a.anchors.length)[0];
if (!headerRow) {
  console.log('no anchor row found; nothing to extract');
  await writeFile(OUT, '[]');
  process.exit(0);
}
console.log(`canonical column row y=${headerRow.y.toFixed(0)}: ${headerRow.anchors.map(a => a.str).join(', ')}`);

// For each column anchor, sweep the area below it within half-width to find:
//   - 断面型 strings:   /^[□ロ]?[-\s]?\d+[×xX]\d+[×xX]\d+/  (square hollow sections)
//   - 鋼材グレード:    /^(BCP|BCR|SN|SS|SM|TMC)\d+[A-Z]?$/
//   - 充填 Fc:          /^Fc\d+/   or "Fc=30" patterns
// Pixel/2 between anchors is the card width:
const xs = headerRow.anchors.map(a => a.x).sort((a,b) => a - b);
const gaps = xs.slice(1).map((x, i) => x - xs[i]);
const meanGap = gaps.length > 0 ? gaps.reduce((s,v) => s+v, 0) / gaps.length : 140;
const cardHalfW = meanGap / 2;
console.log(`mean anchor gap = ${meanGap.toFixed(0)} pt → card half-width = ${cardHalfW.toFixed(0)} pt`);

// Field detection patterns
const sectionRe = /^(?:[□ロ]?[-]?)?\d{2,4}[×xX]\d{2,4}[×xX]\d{1,3}(?:[×xX]\d{1,3})?(?:\([A-Z]+\d+\))?$/;
const sectionStartRe = /^[□ロ口]?[-]?\d{2,4}[xX×]\d{2,4}/;
const gradeRe = /^(BCP|BCR|SN|SS|SM|TMC|STKR)\d+[A-Z]?$/;
const sectionShRe = /^SH[-]?\d+[×xX]\d+[×xX]\d+[×xX]\d+$/;

const columns = [];
for (const anchor of headerRow.anchors) {
  const cx = anchor.x;
  // Sweep all OCR words below the header within ±cardHalfW horizontally and
  // y from header.y to header.y + 600 (covers most column-list card heights).
  const below = words.filter(w =>
    w.y > headerRow.y + 5 &&
    w.y < headerRow.y + 600 &&
    Math.abs(w.x - cx) <= cardHalfW
  );
  const sections = below.filter(w => sectionStartRe.test(w.str) || sectionShRe.test(w.str)).map(w => ({ str: w.str, y: w.y, conf: w.conf }));
  const grades = below.filter(w => gradeRe.test(w.str)).map(w => ({ str: w.str, y: w.y, conf: w.conf }));
  // De-dup by str+y rounding
  const uniqBy = (arr, key) => {
    const seen = new Set();
    return arr.filter(it => {
      const k = key(it);
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  };
  columns.push({
    符号: anchor.str,
    anchor: { x: cx, y: anchor.y },
    原文: {
      断面型_列: uniqBy(sections, s => `${s.str}@${(s.y/10)|0}`).map(s => s.str),
      鋼材グレード_列: uniqBy(grades, s => s.str).map(s => s.str),
    },
  });
}

console.log('\n=== extracted columns ===');
for (const c of columns) {
  console.log(`${c.符号.padEnd(6)} 断面=[${c.原文.断面型_列.join(' | ')}]  材=[${c.原文.鋼材グレード_列.join(',')}]`);
}
await writeFile(OUT, JSON.stringify(columns, null, 2));
console.log(`\nwrote ${OUT} (${columns.length} columns)`);
