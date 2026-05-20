// Build a cell grid from all detected lines, assign text, dump as CSV.
// Pragmatic naive approach: use all clustered row/col positions as grid lines.

import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile, writeFile } from 'node:fs/promises';

const PDF = '/root/.claude/uploads/63fa573a-2b05-466d-ab28-870307f65d0a/74c39286-test________________.pdf';
const PAGE_NUM = 1;

function multiply(m1, m2) {
  return [m1[0]*m2[0]+m1[2]*m2[1], m1[1]*m2[0]+m1[3]*m2[1],
          m1[0]*m2[2]+m1[2]*m2[3], m1[1]*m2[2]+m1[3]*m2[3],
          m1[0]*m2[4]+m1[2]*m2[5]+m1[4], m1[1]*m2[4]+m1[3]*m2[5]+m1[5]];
}
function applyT(m, x, y) { return [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]]; }

const data = new Uint8Array(await readFile(PDF));
const doc = await getDocument({ data, disableFontFace: true }).promise;
const page = await doc.getPage(PAGE_NUM);
const viewport = page.getViewport({ scale: 1 });
const VPX = viewport.transform;
const PAGE_W = viewport.width, PAGE_H = viewport.height;
const opList = await page.getOperatorList();

const horiz = [], vert = [];
let ctm=[1,0,0,1,0,0]; const stack=[]; let lastPath=null;
const LINE_THICK=1.0, MIN_LEN=3;
const PO_M=13,PO_L=14,PO_C=15,PO_C2=16,PO_C3=17,PO_Z=18,PO_R=19;
function pushSeg(x1,y1,x2,y2){
  const dx=Math.abs(x2-x1),dy=Math.abs(y2-y1);
  if(dy<0.7&&dx>=MIN_LEN)horiz.push({y:(y1+y2)/2,x1:Math.min(x1,x2),x2:Math.max(x1,x2)});
  else if(dx<0.7&&dy>=MIN_LEN)vert.push({x:(x1+x2)/2,y1:Math.min(y1,y2),y2:Math.max(y1,y2)});
}
function emitLine(x1,y1,x2,y2){
  const[a,b]=applyT(ctm,x1,y1);const[c,d]=applyT(ctm,x2,y2);
  const[pa,pb]=applyT(VPX,a,b);const[pc,pd]=applyT(VPX,c,d);
  pushSeg(pa,pb,pc,pd);
}
function emitRect(rx,ry,rw,rh){
  const ps=[applyT(VPX,...applyT(ctm,rx,ry)),applyT(VPX,...applyT(ctm,rx+rw,ry)),
            applyT(VPX,...applyT(ctm,rx+rw,ry+rh)),applyT(VPX,...applyT(ctm,rx,ry+rh))];
  const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);
  const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
  const w=xmax-xmin,h=ymax-ymin;
  if(w>=LINE_THICK&&h>=LINE_THICK)return;if(w<LINE_THICK&&h<LINE_THICK)return;
  if(h<LINE_THICK&&w>=MIN_LEN)horiz.push({y:(ymin+ymax)/2,x1:xmin,x2:xmax});
  else if(w<LINE_THICK&&h>=MIN_LEN)vert.push({x:(xmin+xmax)/2,y1:ymin,y2:ymax});
}
function procPath(ops,coords,stroke){
  let ci=0,cx=0,cy=0,sx=0,sy=0;
  for(const o of ops){
    if(o===PO_M){cx=coords[ci++];cy=coords[ci++];sx=cx;sy=cy;}
    else if(o===PO_L){const nx=coords[ci++],ny=coords[ci++];if(stroke)emitLine(cx,cy,nx,ny);cx=nx;cy=ny;}
    else if(o===PO_C){ci+=6;cx=coords[ci-2];cy=coords[ci-1];}
    else if(o===PO_C2||o===PO_C3){ci+=4;cx=coords[ci-2];cy=coords[ci-1];}
    else if(o===PO_Z){cx=sx;cy=sy;}
    else if(o===PO_R){const rx=coords[ci++],ry=coords[ci++],rw=coords[ci++],rh=coords[ci++];if(!stroke)emitRect(rx,ry,rw,rh);}
  }
}
for(let i=0;i<opList.fnArray.length;i++){
  const fn=opList.fnArray[i],args=opList.argsArray[i];
  if(fn===OPS.save)stack.push(ctm);
  else if(fn===OPS.restore)ctm=stack.pop()??[1,0,0,1,0,0];
  else if(fn===OPS.transform)ctm=multiply(ctm,args);
  else if(fn===OPS.constructPath)lastPath={ops:args[0],coords:args[1]};
  else if(fn===OPS.stroke||fn===OPS.closeStroke){if(lastPath)procPath(lastPath.ops,lastPath.coords,true);lastPath=null;}
  else if(fn===OPS.fill||fn===OPS.eoFill){if(lastPath)procPath(lastPath.ops,lastPath.coords,false);lastPath=null;}
}

// Cluster
function cluster1D(vals, tol=2.5){
  const sorted=[...vals].sort((a,b)=>a-b); const cs=[];
  for(const v of sorted){
    const l=cs[cs.length-1];
    if(l&&v-l.center<=tol){l.values.push(v);l.center=l.values.reduce((a,b)=>a+b,0)/l.values.length;}
    else cs.push({center:v,values:[v]});
  }
  return cs.map(c=>c.center);
}

// Focus on the top "band" of the page (FG1-FG6 cards): y from ~200 to ~370 in display coords
// We need to scope to one band because the entire page mixes 3 bands with different sub-tables.
const Y_TOP=200, Y_BOT=380;
const X_LEFT=15, X_RIGHT=PAGE_W-15;

const hBand = horiz.filter(h => h.y>=Y_TOP && h.y<=Y_BOT);
const vBand = vert.filter(v => v.y1<=Y_BOT && v.y2>=Y_TOP);  // any vertical that crosses the band
console.log(`band lines: H=${hBand.length}, V=${vBand.length}`);

const rowY = cluster1D(hBand.map(h=>h.y));
const colX = cluster1D(vBand.map(v=>v.x));
console.log(`band grid: rows=${rowY.length}, cols=${colX.length}`);
console.log('rowY:', rowY.map(y=>y.toFixed(1)).join(', '));

// Text
const tc = await page.getTextContent({ includeMarkedContent: false });
const texts = tc.items.filter(it=>it.str&&it.str.trim()).map(it=>{
  const[bx,by]=[it.transform[4],it.transform[5]];
  const[dx,dy]=applyT(VPX,bx,by);
  // text baseline; cell center = dy - height/2 roughly
  return { str: it.str, x: dx, y: dy - it.height*0.5, w: it.width, h: it.height };
});
const textsInBand = texts.filter(t=>t.y>=Y_TOP-5 && t.y<=Y_BOT+5);
console.log(`texts in band: ${textsInBand.length}`);

// Build cells
const cells = []; // [rowIdx][colIdx] = string
for (let r=0; r<rowY.length-1; r++) {
  cells[r] = [];
  for (let c=0; c<colX.length-1; c++) cells[r][c] = '';
}
for (const t of textsInBand) {
  // find row
  let ri = -1;
  for (let r=0; r<rowY.length-1; r++) {
    if (t.y >= rowY[r] && t.y < rowY[r+1]) { ri = r; break; }
  }
  let ci = -1;
  for (let c=0; c<colX.length-1; c++) {
    if (t.x >= colX[c] && t.x < colX[c+1]) { ci = c; break; }
  }
  if (ri>=0 && ci>=0) {
    cells[ri][ci] += (cells[ri][ci]?' ':'') + t.str;
  }
}

// CSV out
let csv = '';
csv += ',' + colX.slice(0,-1).map((x,i)=>`col${i}(x=${x.toFixed(0)}-${colX[i+1].toFixed(0)})`).join(',') + '\n';
for (let r=0; r<rowY.length-1; r++) {
  csv += `row${r}(y=${rowY[r].toFixed(0)}-${rowY[r+1].toFixed(0)}),` +
    cells[r].map(s=>`"${(s||'').replace(/"/g,'""')}"`).join(',') + '\n';
}
await writeFile('/tmp/pdf-proto/band1.csv', csv);
console.log('wrote band1.csv');

// Also print a compact view of just non-empty cells
console.log('\nNon-empty cells (band 1):');
let any=0;
for (let r=0; r<rowY.length-1; r++) {
  for (let c=0; c<colX.length-1; c++) {
    if (cells[r][c]) { console.log(`  [r${r},c${c}] (${colX[c].toFixed(0)},${rowY[r].toFixed(0)}) "${cells[r][c]}"`); any++; }
  }
}
console.log(`total non-empty: ${any}`);
