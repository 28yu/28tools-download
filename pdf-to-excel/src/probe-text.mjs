// Probe: list all text items on PDF2 p.1 grouped by Y coordinate,
// to understand the actual text layout for anchor-driven extraction.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile, writeFile } from 'node:fs/promises';

const PDF = '/root/.claude/uploads/63fa573a-2b05-466d-ab28-870307f65d0a/74c39286-test________________.pdf';

function applyT(m, x, y) { return [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]]; }

const data = new Uint8Array(await readFile(PDF));
const doc = await getDocument({ data, disableFontFace: true }).promise;
const page = await doc.getPage(1);
const VP = page.getViewport({ scale: 1 });
const VPX = VP.transform;
const tc = await page.getTextContent({ includeMarkedContent: false });

const items = tc.items.filter(it => it.str && it.str.trim()).map(it => {
  const [dx, dy] = applyT(VPX, it.transform[4], it.transform[5]);
  return { str: it.str, x: dx, y: dy, w: it.width, h: it.height };
});
console.log(`text items: ${items.length}, page size: ${VP.width}x${VP.height}`);

// Group by Y (tolerance 3px) — these become "text rows"
items.sort((a,b) => a.y - b.y || a.x - b.x);
const rows = [];
for (const it of items) {
  const last = rows[rows.length - 1];
  if (last && Math.abs(it.y - last.y) <= 3) {
    last.items.push(it);
    last.y = (last.y * (last.items.length-1) + it.y) / last.items.length;
  } else {
    rows.push({ y: it.y, items: [it] });
  }
}

// Sort items within each row by X
for (const r of rows) r.items.sort((a,b) => a.x - b.x);

console.log(`\ntext rows: ${rows.length}\n`);
for (const r of rows) {
  const yStr = r.y.toFixed(1).padStart(6);
  const cells = r.items.map(it => `[x=${it.x.toFixed(0).padStart(4)} "${it.str}"]`).join(' ');
  console.log(`y=${yStr} | ${cells}`);
}

await writeFile('/tmp/pdf-proto/text-rows.json', JSON.stringify(rows, null, 2));
