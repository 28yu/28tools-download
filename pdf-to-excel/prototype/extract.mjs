// Step 2 prototype: extract table cells from PDF2 page1 (RC基礎大梁).
// Uses viewport.transform to map MediaBox coords -> upright display coords.

import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile, writeFile } from 'node:fs/promises';

const PDF = '/root/.claude/uploads/63fa573a-2b05-466d-ab28-870307f65d0a/74c39286-test________________.pdf';
const PAGE_NUM = 1;
const OUT_DIR = '/tmp/pdf-proto';

// --- math helpers ---
function multiply(m1, m2) {
  return [
    m1[0]*m2[0] + m1[2]*m2[1],
    m1[1]*m2[0] + m1[3]*m2[1],
    m1[0]*m2[2] + m1[2]*m2[3],
    m1[1]*m2[2] + m1[3]*m2[3],
    m1[0]*m2[4] + m1[2]*m2[5] + m1[4],
    m1[1]*m2[4] + m1[3]*m2[5] + m1[5],
  ];
}
function applyT(m, x, y) {
  return [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]];
}

const PATH_MOVE_TO = 13;
const PATH_LINE_TO = 14;
const PATH_CURVE_TO = 15;
const PATH_CURVE_TO_2 = 16;
const PATH_CURVE_TO_3 = 17;
const PATH_CLOSE = 18;
const PATH_RECT = 19;

const data = new Uint8Array(await readFile(PDF));
const doc = await getDocument({ data, disableFontFace: true }).promise;
const page = await doc.getPage(PAGE_NUM);
const viewport = page.getViewport({ scale: 1 }); // applies page.rotate
const VPX = viewport.transform; // MediaBox -> display
const PAGE_W = viewport.width;
const PAGE_H = viewport.height;
const opList = await page.getOperatorList();

console.log(`page ${PAGE_NUM}: display ${PAGE_W}x${PAGE_H}, rotate=${page.rotate}`);

const horiz = []; // {y, x1, x2, src}
const vert  = []; // {x, y1, y2, src}

let ctm = [1,0,0,1,0,0];
const stack = [];
let lastPath = null;

const LINE_THICK = 1.0;
const MIN_LINE_LEN = 3;

function pushSeg(tx1, ty1, tx2, ty2, src) {
  const dx = Math.abs(tx2 - tx1), dy = Math.abs(ty2 - ty1);
  if (dy < 0.7 && dx >= MIN_LINE_LEN) {
    horiz.push({ y: (ty1+ty2)/2, x1: Math.min(tx1,tx2), x2: Math.max(tx1,tx2), src });
  } else if (dx < 0.7 && dy >= MIN_LINE_LEN) {
    vert.push({ x: (tx1+tx2)/2, y1: Math.min(ty1,ty2), y2: Math.max(ty1,ty2), src });
  }
}

function transformAndEmit(x1, y1, x2, y2, src) {
  // First apply CTM (MediaBox coords), then viewport transform (display coords)
  const [mx1, my1] = applyT(ctm, x1, y1);
  const [mx2, my2] = applyT(ctm, x2, y2);
  const [dx1, dy1] = applyT(VPX, mx1, my1);
  const [dx2, dy2] = applyT(VPX, mx2, my2);
  pushSeg(dx1, dy1, dx2, dy2, src);
}

function emitRectAsLine(rx, ry, rw, rh) {
  // Compute the four corners in display space
  const corners = [
    applyT(VPX, ...applyT(ctm, rx, ry)),
    applyT(VPX, ...applyT(ctm, rx+rw, ry)),
    applyT(VPX, ...applyT(ctm, rx+rw, ry+rh)),
    applyT(VPX, ...applyT(ctm, rx, ry+rh)),
  ];
  const xs = corners.map(c => c[0]);
  const ys = corners.map(c => c[1]);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys), ymax = Math.max(...ys);
  const w = xmax - xmin, h = ymax - ymin;
  if (w >= LINE_THICK && h >= LINE_THICK) return;
  if (w < LINE_THICK && h < LINE_THICK) return;
  if (h < LINE_THICK && w >= MIN_LINE_LEN) {
    horiz.push({ y: (ymin+ymax)/2, x1: xmin, x2: xmax, src: 'fill-rect' });
  } else if (w < LINE_THICK && h >= MIN_LINE_LEN) {
    vert.push({ x: (xmin+xmax)/2, y1: ymin, y2: ymax, src: 'fill-rect' });
  }
}

function processPath(pathOps, coords, asStroke) {
  let ci = 0;
  let cx = 0, cy = 0;
  let sx = 0, sy = 0;
  for (const po of pathOps) {
    switch (po) {
      case PATH_MOVE_TO: cx = coords[ci++]; cy = coords[ci++]; sx = cx; sy = cy; break;
      case PATH_LINE_TO: {
        const nx = coords[ci++], ny = coords[ci++];
        if (asStroke) transformAndEmit(cx, cy, nx, ny, 'stroke');
        cx = nx; cy = ny;
        break;
      }
      case PATH_CURVE_TO: ci += 6; cx = coords[ci-2]; cy = coords[ci-1]; break;
      case PATH_CURVE_TO_2: ci += 4; cx = coords[ci-2]; cy = coords[ci-1]; break;
      case PATH_CURVE_TO_3: ci += 4; cx = coords[ci-2]; cy = coords[ci-1]; break;
      case PATH_CLOSE: cx = sx; cy = sy; break;
      case PATH_RECT: {
        const rx = coords[ci++], ry = coords[ci++], rw = coords[ci++], rh = coords[ci++];
        if (!asStroke) emitRectAsLine(rx, ry, rw, rh);
        break;
      }
    }
  }
}

const fnArr = opList.fnArray, argArr = opList.argsArray;
for (let i = 0; i < fnArr.length; i++) {
  const fn = fnArr[i];
  const args = argArr[i];
  switch (fn) {
    case OPS.save: stack.push(ctm); break;
    case OPS.restore: ctm = stack.pop() ?? [1,0,0,1,0,0]; break;
    case OPS.transform: ctm = multiply(ctm, args); break;
    case OPS.constructPath: lastPath = { ops: args[0], coords: args[1] }; break;
    case OPS.stroke:
    case OPS.closeStroke:
      if (lastPath) processPath(lastPath.ops, lastPath.coords, true);
      lastPath = null;
      break;
    case OPS.fill:
    case OPS.eoFill:
      if (lastPath) processPath(lastPath.ops, lastPath.coords, false);
      lastPath = null;
      break;
  }
}

console.log(`raw segments: H=${horiz.length}, V=${vert.length}`);

// Filter: keep lines that look like real table borders
// (drop those entirely outside the page, and trivially short ones already filtered)
const onPage = (h) => h.y >= -5 && h.y <= PAGE_H+5;
const onPageV = (v) => v.x >= -5 && v.x <= PAGE_W+5;
const hOnPage = horiz.filter(onPage);
const vOnPage = vert.filter(onPageV);
console.log(`on-page segments: H=${hOnPage.length}, V=${vOnPage.length}`);

function cluster1D(values, tol = 2.0) {
  const sorted = [...values].sort((a, b) => a - b);
  const clusters = [];
  for (const v of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && v - last.center <= tol) {
      last.values.push(v);
      last.center = last.values.reduce((a,b)=>a+b,0) / last.values.length;
    } else {
      clusters.push({ center: v, values: [v] });
    }
  }
  return clusters.map(c => ({ pos: c.center, count: c.values.length }));
}

const rowYAll = cluster1D(hOnPage.map(h => h.y));
const colXAll = cluster1D(vOnPage.map(v => v.x));

console.log(`clusters: rows=${rowYAll.length}, cols=${colXAll.length}`);

// Now extract text items with positions for cell assignment
const textContent = await page.getTextContent({ includeMarkedContent: false });
const textItems = textContent.items.filter(it => it.str && it.str.trim()).map(it => {
  // it.transform = [a,b,c,d,e,f] giving baseline transform in MediaBox space
  const [bx, by] = [it.transform[4], it.transform[5]];
  const [dx, dy] = applyT(VPX, bx, by);
  return {
    str: it.str,
    x: dx,
    y: dy,                     // display Y (top=0, down positive)
    w: it.width,
    h: it.height,
    fontName: it.fontName,
  };
});
console.log(`text items: ${textItems.length}`);

// Save snapshot for inspection (no cell assignment yet — that's next iteration)
await writeFile(`${OUT_DIR}/lines.json`, JSON.stringify({
  page: PAGE_NUM,
  pageSize: { w: PAGE_W, h: PAGE_H },
  segCount: { hAll: horiz.length, vAll: vert.length, hOnPage: hOnPage.length, vOnPage: vOnPage.length },
  rowYAll, colXAll,
  sampleHoriz: hOnPage.slice(0, 30),
  sampleVert: vOnPage.slice(0, 30),
  textCount: textItems.length,
  sampleText: textItems.slice(0, 30),
}, null, 2));

// Print row Y cluster summary (top → bottom)
console.log('\nrow Y clusters (top→bottom), tuples = (y, count):');
console.log(rowYAll.map(c => `(${c.pos.toFixed(1)},${c.count})`).join(' '));
console.log('\ncol X clusters (left→right):');
console.log(colXAll.map(c => `(${c.pos.toFixed(1)},${c.count})`).join(' '));
