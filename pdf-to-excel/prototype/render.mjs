// Render PDF2 page1 with detected lines overlaid for visual debugging.
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { createCanvas } from 'canvas';

const PDF = '/root/.claude/uploads/63fa573a-2b05-466d-ab28-870307f65d0a/74c39286-test________________.pdf';
const PAGE_NUM = 1;
const SCALE = 1.5;

// minimal pdf.js node canvas factory
class NodeCanvasFactory {
  create(w, h) { const canvas = createCanvas(w, h); return { canvas, context: canvas.getContext('2d') }; }
  reset(target, w, h) { target.canvas.width = w; target.canvas.height = h; }
  destroy() {}
}

const data = new Uint8Array(await readFile(PDF));
const doc = await getDocument({ data, disableFontFace: true }).promise;
const page = await doc.getPage(PAGE_NUM);
const viewport = page.getViewport({ scale: SCALE });
const cf = new NodeCanvasFactory();
const { canvas, context } = cf.create(viewport.width, viewport.height);
await page.render({ canvasContext: context, viewport, canvasFactory: cf }).promise;

// Now extract lines (re-implement minimally)
function multiply(m1, m2) {
  return [m1[0]*m2[0]+m1[2]*m2[1], m1[1]*m2[0]+m1[3]*m2[1],
          m1[0]*m2[2]+m1[2]*m2[3], m1[1]*m2[2]+m1[3]*m2[3],
          m1[0]*m2[4]+m1[2]*m2[5]+m1[4], m1[1]*m2[4]+m1[3]*m2[5]+m1[5]];
}
function applyT(m, x, y) { return [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]]; }

const VP1 = page.getViewport({ scale: 1 }).transform; // for clean coords
const SCALER = [SCALE,0,0,SCALE,0,0];
const VPX = multiply(SCALER, VP1); // MediaBox -> render canvas

const opList = await page.getOperatorList();
const horiz = [], vert = [];
let ctm = [1,0,0,1,0,0]; const stack = []; let lastPath = null;
const LINE_THICK = 1.5; const MIN_LINE_LEN = 4;

function pushSeg(x1,y1,x2,y2,src) {
  const dx=Math.abs(x2-x1), dy=Math.abs(y2-y1);
  if (dy<0.7*SCALE && dx>=MIN_LINE_LEN) horiz.push({y:(y1+y2)/2,x1:Math.min(x1,x2),x2:Math.max(x1,x2),src});
  else if (dx<0.7*SCALE && dy>=MIN_LINE_LEN) vert.push({x:(x1+x2)/2,y1:Math.min(y1,y2),y2:Math.max(y1,y2),src});
}
function emitLineFromPDF(x1,y1,x2,y2,src) {
  const [a,b] = applyT(ctm, x1, y1); const [c,d] = applyT(ctm, x2, y2);
  const [pa,pb]=applyT(VPX,a,b); const [pc,pd]=applyT(VPX,c,d);
  pushSeg(pa,pb,pc,pd,src);
}
function emitRect(rx,ry,rw,rh) {
  const ps = [applyT(VPX,...applyT(ctm,rx,ry)),
              applyT(VPX,...applyT(ctm,rx+rw,ry)),
              applyT(VPX,...applyT(ctm,rx+rw,ry+rh)),
              applyT(VPX,...applyT(ctm,rx,ry+rh))];
  const xs=ps.map(p=>p[0]), ys=ps.map(p=>p[1]);
  const xmin=Math.min(...xs), xmax=Math.max(...xs), ymin=Math.min(...ys), ymax=Math.max(...ys);
  const w=xmax-xmin, h=ymax-ymin;
  if (w>=LINE_THICK && h>=LINE_THICK) return;
  if (w<LINE_THICK && h<LINE_THICK) return;
  if (h<LINE_THICK && w>=MIN_LINE_LEN) horiz.push({y:(ymin+ymax)/2,x1:xmin,x2:xmax,src:'rect'});
  else if (w<LINE_THICK && h>=MIN_LINE_LEN) vert.push({x:(xmin+xmax)/2,y1:ymin,y2:ymax,src:'rect'});
}
const PO_M=13,PO_L=14,PO_C=15,PO_C2=16,PO_C3=17,PO_Z=18,PO_R=19;
function procPath(ops,coords,stroke) {
  let ci=0,cx=0,cy=0,sx=0,sy=0;
  for (const o of ops) {
    if (o===PO_M){cx=coords[ci++];cy=coords[ci++];sx=cx;sy=cy;}
    else if (o===PO_L){const nx=coords[ci++],ny=coords[ci++];if(stroke)emitLineFromPDF(cx,cy,nx,ny,'stroke');cx=nx;cy=ny;}
    else if (o===PO_C){ci+=6;cx=coords[ci-2];cy=coords[ci-1];}
    else if (o===PO_C2||o===PO_C3){ci+=4;cx=coords[ci-2];cy=coords[ci-1];}
    else if (o===PO_Z){cx=sx;cy=sy;}
    else if (o===PO_R){const rx=coords[ci++],ry=coords[ci++],rw=coords[ci++],rh=coords[ci++];if(!stroke)emitRect(rx,ry,rw,rh);}
  }
}
for (let i=0;i<opList.fnArray.length;i++) {
  const fn=opList.fnArray[i], args=opList.argsArray[i];
  if (fn===OPS.save) stack.push(ctm);
  else if (fn===OPS.restore) ctm=stack.pop()??[1,0,0,1,0,0];
  else if (fn===OPS.transform) ctm=multiply(ctm,args);
  else if (fn===OPS.constructPath) lastPath={ops:args[0],coords:args[1]};
  else if (fn===OPS.stroke||fn===OPS.closeStroke){if(lastPath)procPath(lastPath.ops,lastPath.coords,true);lastPath=null;}
  else if (fn===OPS.fill||fn===OPS.eoFill){if(lastPath)procPath(lastPath.ops,lastPath.coords,false);lastPath=null;}
}

console.log(`detected: H=${horiz.length}, V=${vert.length}`);

// Overlay
context.lineWidth = 3;
context.strokeStyle = 'rgba(255, 0, 0, 0.5)';
for (const h of horiz) {
  context.beginPath();
  context.moveTo(h.x1, h.y);
  context.lineTo(h.x2, h.y);
  context.stroke();
}
context.strokeStyle = 'rgba(0, 100, 255, 0.5)';
for (const v of vert) {
  context.beginPath();
  context.moveTo(v.x, v.y1);
  context.lineTo(v.x, v.y2);
  context.stroke();
}
const buf = canvas.toBuffer('image/png');
await writeFile('/tmp/pdf-proto/page1-overlay.png', buf);
console.log('saved /tmp/pdf-proto/page1-overlay.png');

// Render plain version too
const cf2 = new NodeCanvasFactory();
const { canvas: c2, context: ctx2 } = cf2.create(viewport.width, viewport.height);
await page.render({ canvasContext: ctx2, viewport, canvasFactory: cf2 }).promise;
await writeFile('/tmp/pdf-proto/page1-plain.png', c2.toBuffer('image/png'));
console.log('saved /tmp/pdf-proto/page1-plain.png');
