// Tesseract.js wrapper, lazy-loaded only when an obfuscated page is detected.
// Renders the pdf.js page to a canvas, hands it to Tesseract, and returns
// per-word entries normalized to {str, x, y, w, h, conf} in image pixels.

let workerPromise = null;

async function loadTesseract() {
  // UMD build is the simplest path — assigns window.Tesseract
  if (window.Tesseract) return window.Tesseract;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.Tesseract;
}

async function getWorker(onStatus) {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const Tesseract = await loadTesseract();
    const worker = await Tesseract.createWorker('jpn', 1, {
      logger: m => {
        if (onStatus && m.status) onStatus(m.status, m.progress ?? 0);
      },
    });
    // PSM 11 = sparse text, works best for column/small-beam lists.
    await worker.setParameters({ tessedit_pageseg_mode: '11' });
    return worker;
  })();
  return workerPromise;
}

/**
 * Render a pdf.js page at the requested DPI and OCR it.
 * @param page pdf.js PDFPageProxy
 * @param onStatus (status, frac01) progress callback
 * @returns {Array<{str, x, y, w, h, conf}>} OCR'd words with pixel-space coords
 */
export async function ocrPage(page, onStatus, dpi = 300) {
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  onStatus && onStatus('PDFページ描画', 0);
  await page.render({ canvasContext: ctx, viewport }).promise;

  const worker = await getWorker(onStatus);
  onStatus && onStatus('OCR実行', 0.5);
  const { data } = await worker.recognize(canvas);
  return (data.words || []).map(w => ({
    str: (w.text || '').trim(),
    x: w.bbox?.x0 ?? 0,
    y: w.bbox?.y0 ?? 0,
    w: (w.bbox?.x1 ?? 0) - (w.bbox?.x0 ?? 0),
    h: (w.bbox?.y1 ?? 0) - (w.bbox?.y0 ?? 0),
    conf: w.confidence ?? 0,
  })).filter(w => w.str && w.conf >= 40);
}
