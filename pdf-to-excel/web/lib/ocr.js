// Tesseract.js wrapper, lazy-loaded only when text extraction fails.
//
// High-precision configuration:
//   - DPI 500 (vs default 400) — sharper glyph edges on small CJK text
//   - "best" LSTM models from tessdata_best (vs default "fast") — recovers
//     significantly more characters on CAD drawings; larger download
//     (~20MB jpn_best vs ~5MB jpn_fast) but cached after first use.
//   - jpn + eng combined languages — handles mixed "鋼材は、SN490Bとする"
//   - 3-PSM merge (11 sparse / 6 block / 3 auto) — different segmenters
//     catch different things; bbox-bucket de-dup at merge time.
//   - preserve_interword_spaces=1 — keeps word boundaries intact, helps
//     the downstream token logic in detectMaterials().

let workerPromise = null;
let TesseractRef = null;

async function loadTesseract() {
  if (TesseractRef) return TesseractRef;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  TesseractRef = window.Tesseract;
  return TesseractRef;
}

async function getWorker(onStatus) {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const Tesseract = await loadTesseract();
    // Point langPath at tessdata_best (more accurate, larger).
    // The standard projectnaptha CDN hosts both "fast" and "best" variants.
    const worker = await Tesseract.createWorker(['jpn', 'eng'], 1, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0_best',
      logger: m => {
        if (onStatus && m.status) onStatus(m.status, m.progress ?? 0);
      },
    });
    // Helpful tuning: keep word spacing in the recognized output so
    // detectMaterials' token logic sees real word boundaries.
    await worker.setParameters({
      preserve_interword_spaces: '1',
    });
    return worker;
  })();
  return workerPromise;
}

// Render to a white-backed canvas. We deliberately do NOT pre-process
// the pixels here — Tesseract.js has its own Leptonica preprocessing
// that handles binarization, grayscale, and contrast adaptively. Our
// own threshold pass was actually hurting accuracy on faint glyphs.
async function renderPage(page, dpi) {
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

// Merge two OCR result word lists, de-duplicating by approximate bbox.
// (Same word recognized at slightly different y in two PSM modes still
// counts once.)
function mergeWords(a, b) {
  const out = [...a];
  const key = w => `${w.str}@${(w.x/20)|0},${(w.y/20)|0}`;
  const seen = new Set(out.map(key));
  for (const w of b) {
    const k = key(w);
    if (!seen.has(k)) { seen.add(k); out.push(w); }
  }
  return out;
}

function tessWordsToEntries(words) {
  return (words || []).map(w => ({
    str: (w.text || '').trim(),
    x: w.bbox?.x0 ?? 0,
    y: w.bbox?.y0 ?? 0,
    w: (w.bbox?.x1 ?? 0) - (w.bbox?.x0 ?? 0),
    h: (w.bbox?.y1 ?? 0) - (w.bbox?.y0 ?? 0),
    conf: w.confidence ?? 0,
  })).filter(w => w.str && w.conf >= 35);
}

/**
 * Render the page and OCR it with three PSM modes (sparse + block + auto).
 * Returns merged unique words. Three passes take ~3x the time of one but
 * recover text that any single segmentation mode would miss.
 */
export async function ocrPage(page, onStatus, dpi = 500) {
  onStatus && onStatus('PDFページ描画', 0);
  const canvas = await renderPage(page, dpi);

  const worker = await getWorker(onStatus);

  onStatus && onStatus('OCR pass 1/3 (sparse, 高精度)', 0.05);
  await worker.setParameters({ tessedit_pageseg_mode: '11' });
  const r1 = await worker.recognize(canvas);
  const w1 = tessWordsToEntries(r1.data.words);

  onStatus && onStatus('OCR pass 2/3 (block, 高精度)', 0.35);
  await worker.setParameters({ tessedit_pageseg_mode: '6' });
  const r2 = await worker.recognize(canvas);
  const w2 = tessWordsToEntries(r2.data.words);

  onStatus && onStatus('OCR pass 3/3 (auto, 高精度)', 0.7);
  await worker.setParameters({ tessedit_pageseg_mode: '3' });
  const r3 = await worker.recognize(canvas);
  const w3 = tessWordsToEntries(r3.data.words);

  return mergeWords(mergeWords(w1, w2), w3);
}
