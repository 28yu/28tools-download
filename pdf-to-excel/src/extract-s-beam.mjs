// Anchor-text extractor for S beam list (PDF2 p.2 layout).
//
// Each SG card holds: 符号 / 区分(a) / 寸法 / スパン(連スパンはカンマ区切り) /
// 通り符号始点・終点 / 断面型 (SH/BH600×200×12×16).
//
// Output: array of S beam objects with raw text per field.

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile, writeFile } from 'node:fs/promises';

const PDF = process.argv[2] || '/root/.claude/uploads/63fa573a-2b05-466d-ab28-870307f65d0a/74c39286-test________________.pdf';
const PAGE_NUM = parseInt(process.argv[3] || '2');
const OUT = process.argv[4] || './sample-output-sbeams.json';

const applyT = (m,x,y) => [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]];
const cleanStr = (s) => s.replace(/[\x00-\x1F\x7F]/g, '').trim();

const data = new Uint8Array(await readFile(PDF));
const doc = await getDocument({ data, disableFontFace: true }).promise;
const page = await doc.getPage(PAGE_NUM);
const VPX = page.getViewport({ scale: 1 }).transform;
const tc = await page.getTextContent({ includeMarkedContent: false });

const items = tc.items.filter(it => it.str && cleanStr(it.str)).map(it => {
  const [dx, dy] = applyT(VPX, it.transform[4], it.transform[5]);
  return { str: cleanStr(it.str), x: dx, y: dy };
});

// SG / CSG anchor patterns. Examples: SG1, SG1A, SG10, CSG3
const sgRe = /^C?SG\d+[A-Z]?$/;
const sgItems = items.filter(it => sgRe.test(it.str));
console.log(`SG anchors: ${sgItems.length}`);

// Group by Y -> bands
sgItems.sort((a,b) => a.y - b.y);
const bands = [];
for (const a of sgItems) {
  const last = bands[bands.length - 1];
  if (last && Math.abs(a.y - last.y) <= 5) {
    last.anchors.push(a);
    last.y = (last.y * (last.anchors.length-1) + a.y) / last.anchors.length;
  } else bands.push({ y: a.y, anchors: [a] });
}
for (const b of bands) b.anchors.sort((a,b) => a.x - b.x);
console.log(`bands: ${bands.length}`);
bands.forEach((b, i) => console.log(`  band ${i+1} y=${b.y.toFixed(0)} : ${b.anchors.map(a=>a.str).join(', ')}`));

// Y offsets relative to band SG-name row Y, observed on PDF2 p.2:
//   +16   position label "a"
//   +56   section dim 1,200 (2 values per SG often)
//   +66   spans (CSV "8,400,7,800")
//   +73   continuation row (if any)
//   +78   通り start
//   +90   通り end (for connected spans)
//   +102  position label "a"
//   +112  section type SH/BH600×200×12×16
const OFFS = {
  span:   66,
  span2:  73,
  gridStart: 78,
  gridEnd:   90,
  section: 112,
};
const TOL_Y = 5;

function gather(items, x, y, tolX, tolY=TOL_Y, filter=null) {
  return items.filter(it => Math.abs(it.y - y) <= tolY
                        && Math.abs(it.x - x) <= tolX
                        && (!filter || filter(it.str)));
}

const beams = [];
for (let bi = 0; bi < bands.length; bi++) {
  const band = bands[bi];
  const nextY = bi+1 < bands.length ? bands[bi+1].y : Infinity;
  // Card width: distance to next anchor on this band (or generous default)
  const cardHalfW = 80;

  for (let ai = 0; ai < band.anchors.length; ai++) {
    const sg = band.anchors[ai];
    const cx = sg.x;
    // Spans: pick up all items in the span row(s) within card width.
    // Multi-span beams may continue on the next row (span2 offset).
    // Each item may itself contain comma-separated multi-spans like "8,400,7,800"
    // where the commas are BOTH thousand-separators and span-separators.
    const spanRow1 = gather(items, cx, sg.y + OFFS.span, cardHalfW);
    const spanRow2 = gather(items, cx, sg.y + OFFS.span2, cardHalfW);
    // Order: row1 left-to-right first, then row2 left-to-right (reading order).
    const orderRow = (row) => [...row].filter(it => /^[,\d]/.test(it.str)).sort((a,b) => a.x - b.x).map(it => it.str);
    const spanRaw = [...orderRow(spanRow1), ...orderRow(spanRow2)].join('');
    // Extract individual span numbers: pattern is "\d{1,3}(,\d{3})+" (with thousand sep) or "\d+"
    const spans = [...spanRaw.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)/g)].map(m => m[1]);

    // 通り符号 start/end
    const gStart = gather(items, cx, sg.y + OFFS.gridStart, cardHalfW)
      .filter(it => /^X[de]?\d/i.test(it.str) || /^Y[de]?\d/i.test(it.str))
      .sort((a,b) => a.x - b.x);
    const gEnd = gather(items, cx, sg.y + OFFS.gridEnd, cardHalfW)
      .filter(it => /^X[de]?\d/i.test(it.str) || /^Y[de]?\d/i.test(it.str))
      .sort((a,b) => a.x - b.x);

    // Section type: SH/BH or H type strings like "SH600×200×12×16"
    const sectionRow = gather(items, cx, sg.y + OFFS.section, cardHalfW + 30)
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
      },
    });
  }
}

// Print and save
console.log('\n=== extracted S beams ===');
for (const b of beams) {
  const r = b.原文;
  console.log(`${b.符号.padEnd(6)} band=${b.band}  断面=${r.断面型 ?? '?'}  スパン=[${r.スパン_列.join(',')}]  通り=[${r.通り起点_列.join('/')}]->[${r.通り終点_列.join('/')}]`);
}
await writeFile(OUT, JSON.stringify(beams, null, 2));
console.log(`\nwrote ${OUT} (${beams.length} S beams)`);
