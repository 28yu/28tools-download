// OCR-based extractor for steel small-beam (S小梁) lists.
// Targets PDF2 page 3 layout where each row is one beam:
//   left=419-451 : 符号 (e.g. "SB19", "SB24,CSB24")
//   left=643     : 断面 (e.g. "H-198x99x4.5x7")
//   left=1004    : 鋼材 (SS400 / SN400B)
//   left=1394    : ボルト径 (M16, M20, ...) — optional
//
// The page is also one of the glyph-obfuscated cases (CIDs with no
// usable ToUnicode), so we drive everything off OCR coordinates.

import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

const execFile = promisify(execFileCb);

const PDF = process.argv[2] || '/root/.claude/uploads/63fa573a-2b05-466d-ab28-870307f65d0a/74c39286-test________________.pdf';
const PAGE = parseInt(process.argv[3] || '3');
const OUT = process.argv[4] || './sample-output-sbeams-small.json';
const DPI = 300;

const tmp = await mkdtemp(path.join(tmpdir(), 'sb-ocr-'));
const pngPrefix = path.join(tmp, 'p');
const tsvPrefix = path.join(tmp, 'out');

console.log(`rendering page ${PAGE} at ${DPI} DPI...`);
await execFile('pdftoppm', ['-r', String(DPI), '-f', String(PAGE), '-l', String(PAGE), '-png', PDF, pngPrefix]);
const png = `${pngPrefix}-${PAGE}.png`;

console.log('running tesseract (jpn, psm 11)...');
await execFile('tesseract', [png, tsvPrefix, '-l', 'jpn', '--psm', '11', 'tsv']);
const tsv = await readFile(`${tsvPrefix}.tsv`, 'utf8');

// Parse TSV → words. Tesseract reports pixel coords; keep them in pixels
// for column-based clustering since the original PDF is rotated and the
// page-3 design uses fixed column anchors.
const words = [];
for (const line of tsv.split('\n').slice(1)) {
  const c = line.split('\t');
  if (c.length < 12) continue;
  const text = (c[11] || '').trim();
  if (!text || c[0] !== '5') continue;
  const conf = parseFloat(c[10]);
  if (conf < 40) continue;
  words.push({ str: text, x: parseFloat(c[6]), y: parseFloat(c[7]), conf });
}
console.log(`OCR yielded ${words.length} words (conf>=40)`);

// Find SB / CSB anchors. OCR often returns lowercase ("sb19") and may use
// "." instead of "," in compound symbols ("sb24.csb24").
const anchorRe = /^[csCS]?[sS][bB]\d+[A-Z]{0,3}(?:[.,][csCS][sS][bB]\d+[A-Z]{0,3})?$/;
const anchors = words.filter(w => anchorRe.test(w.str)).map(w => ({
  // Normalize: uppercase, split on . or ,
  symbols: w.str.toUpperCase().split(/[.,]/).map(s => s.trim()).filter(Boolean),
  y: w.y,
  x: w.x,
  raw: w.str,
}));
console.log(`anchors found: ${anchors.length}`);

// Section anchors: "H-198x99x4.5x7" etc. Cluster on x to find the section column.
const secRe = /^[HISL]-?\d+[xX×]\d+(?:\.\d+)?[xX×]\d+(?:\.\d+)?[xX×]\d+(?:\.\d+)?/;
const secs = words.filter(w => secRe.test(w.str));
console.log(`section candidates: ${secs.length}`);

// Material anchors
const matRe = /^(SS|SN|SM)\d+[A-Z]?$/;
const mats = words.filter(w => matRe.test(w.str));
console.log(`material candidates: ${mats.length}`);

// For each anchor, find the section and material on the SAME row (y ± tol).
const TOL_Y = 12; // pixels at 300 DPI ≈ 3 pt
function findOnRow(list, anchor) {
  const cands = list.filter(w => Math.abs(w.y - anchor.y) <= TOL_Y);
  cands.sort((a,b) => Math.abs(a.x - anchor.x) - Math.abs(b.x - anchor.x));
  // We want the one to the right of anchor (since 符号 < 断面 < 鋼材 along x).
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
        raw符号: a.raw,
      },
    });
  }
}

console.log('\n=== extracted small beams ===');
for (const b of beams.slice(0, 20)) {
  console.log(`  ${b.符号.padEnd(8)} 断面=${b.原文.断面型 ?? '?'}  鋼材=${b.原文.鋼材グレード ?? '?'}`);
}
if (beams.length > 20) console.log(`  ... 他 ${beams.length - 20} 件`);
await writeFile(OUT, JSON.stringify(beams, null, 2));
console.log(`\nwrote ${OUT} (${beams.length} small beams)`);
