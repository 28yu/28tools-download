// Tesseract.js wrapper, lazy-loaded only when text extraction fails.
// Renders a pdf.js page to a canvas with light pre-processing (grayscale +
// adaptive threshold), then passes it to Tesseract and returns per-word
// entries normalized to {str, x, y, w, h, conf} in image pixels.
//
// Tuning compared to the first pass:
//   - DPI raised 300 → 400 for sharper glyph boundaries on small CJK text
//   - Grayscale + threshold preprocessing improves contrast on noisy scans
//   - Languages 'jpn+eng' so ASCII strings (SS400, BCP325, H-198×99…)
//     decode without leaking into the CJK model
//   - Two-pass: PSM 11 (sparse) for finding scattered anchors, plus PSM 6
//     (uniform block) merged in for clean tabular text

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
    // jpn + eng combined: handles "鋼材は、SN490B" mixed strings cleanly.
    const worker = await Tesseract.createWorker(['jpn', 'eng'], 1, {
      logger: m => {
        if (onStatus && m.status) onStatus(m.status, m.progress ?? 0);
      },
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
export async function ocrPage(page, onStatus, dpi = 400) {
  onStatus && onStatus('PDFページ描画', 0);
  const canvas = await renderPage(page, dpi);

  const worker = await getWorker(onStatus);

  onStatus && onStatus('OCR pass 1/3 (sparse)', 0.05);
  await worker.setParameters({ tessedit_pageseg_mode: '11' });
  const r1 = await worker.recognize(canvas);
  const w1 = tessWordsToEntries(r1.data.words);

  onStatus && onStatus('OCR pass 2/3 (block)', 0.35);
  await worker.setParameters({ tessedit_pageseg_mode: '6' });
  const r2 = await worker.recognize(canvas);
  const w2 = tessWordsToEntries(r2.data.words);

  onStatus && onStatus('OCR pass 3/3 (auto)', 0.7);
  await worker.setParameters({ tessedit_pageseg_mode: '3' });
  const r3 = await worker.recognize(canvas);
  const w3 = tessWordsToEntries(r3.data.words);

  return mergeWords(mergeWords(w1, w2), w3);
}
