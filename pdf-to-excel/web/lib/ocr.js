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
let workerDpi = null;

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

async function getWorker(onStatus, dpi) {
  if (workerPromise) {
    // Effective DPI may differ between pages (we auto-reduce for huge
    // pages). Re-set user_defined_dpi when it changes so Tesseract's
    // glyph-size heuristics stay aligned with the actual rendered DPI.
    const w = await workerPromise;
    if (dpi !== workerDpi) {
      await w.setParameters({ user_defined_dpi: String(dpi) });
      workerDpi = dpi;
    }
    return w;
  }
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
    // Critical tuning:
    //   - user_defined_dpi forces Tesseract to trust the actual DPI we
    //     rendered at. Without this it auto-estimates ~400 DPI and
    //     rejects text rows as "too small to scale". We pass the
    //     effective DPI (which may be lower than 600 for A1 sheets).
    //   - preserve_interword_spaces keeps word boundaries intact, helps
    //     the downstream token logic in detectMaterials().
    await worker.setParameters({
      user_defined_dpi: String(dpi),
      preserve_interword_spaces: '1',
    });
    workerDpi = dpi;
    return worker;
  })();
  return workerPromise;
}

// Render to a white-backed canvas. We deliberately do NOT pre-process
// the pixels here — Tesseract.js has its own Leptonica preprocessing
// that handles binarization, grayscale, and contrast adaptively. Our
// own threshold pass was actually hurting accuracy on faint glyphs.
//
// Canvas size is capped so we stay under both:
//   - Browser canvas limit: ~268M pixels area (16384²) on Chrome
//   - Tesseract.js WASM memory: practical limit varies by environment;
//     conservative cap ~24M pixels avoids "Error attempting to read
//     image" failures we have observed on A1-sized pages.
//
// Empirically, 60-70 MP canvases caused failures even with a 0.7×
// retry (which still produces 31 MP). 24 MP gives plenty of headroom
// while keeping A1 readable: A1 = 1684×2384 pt → ~174 DPI, A3 → ~400
// DPI, Letter → 600 DPI (no cap needed).
async function renderPage(page, dpi) {
  const MAX_DIM = 10000;
  const MAX_AREA = 24_000_000;
  const baseVP = page.getViewport({ scale: 1 });
  let scale = dpi / 72;
  const projW = baseVP.width * scale;
  const projH = baseVP.height * scale;
  const dimCap = Math.min(MAX_DIM / projW, MAX_DIM / projH, 1);
  const areaCap = Math.sqrt(MAX_AREA / (projW * projH));
  const cap = Math.min(dimCap, areaCap, 1);
  let effectiveDpi = dpi;
  if (cap < 1) {
    scale *= cap;
    effectiveDpi = Math.round(72 * scale);
    console.warn(`[renderPage] Page too large for ${dpi} DPI (${Math.round(projW)}×${Math.round(projH)}); reducing to ${effectiveDpi} DPI`);
  }
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error(`Canvas creation failed at ${dpi} DPI (page ${Math.round(baseVP.width)}×${Math.round(baseVP.height)} points)`);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(`Canvas 2D context unavailable (size ${canvas.width}×${canvas.height})`);
  }
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { canvas, effectiveDpi };
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

function downscale(canvas, factor) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.floor(canvas.width * factor));
  c.height = Math.max(1, Math.floor(canvas.height * factor));
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  return c;
}

function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => {
      if (b) resolve(b);
      else reject(new Error(`canvas.toBlob(${type}) returned null (size ${canvas.width}×${canvas.height})`));
    }, type);
  });
}

async function resetWorker(dpi) {
  if (workerPromise) {
    try {
      const w = await workerPromise;
      await w.terminate?.();
    } catch (e) {
      console.warn('[resetWorker] terminate failed:', e?.message ?? e);
    }
  }
  workerPromise = null;
  workerDpi = null;
  return getWorker(null, dpi);
}

const isImgErr = err => {
  const msg = err?.message || err?.toString?.() || '';
  return /attempting to read image|out of memory|RuntimeError|memory access/i.test(msg);
};

/**
 * Try to recognize a canvas with progressive fallbacks:
 *   1. canvas at full size
 *   2. canvas at 0.6× (worker reset)
 *   3. canvas at 0.35× via PNG Blob (worker reset)
 *   4. canvas at 0.2× via JPEG Blob (worker reset)
 *
 * Each fallback is tried only if the previous one failed with an
 * "image read" / OOM-type error. Other errors propagate immediately.
 */
async function recognizeWithRetry(worker, canvas, psm, label, onStatus, progress, dpi) {
  await worker.setParameters({ tessedit_pageseg_mode: psm });
  const attempts = [
    { scale: 1.0, via: 'canvas', reset: false },
    { scale: 0.6, via: 'canvas', reset: true  },
    { scale: 0.35, via: 'blob-png', reset: true },
    { scale: 0.2, via: 'blob-jpeg', reset: true },
  ];

  let lastErr = null;
  let activeWorker = worker;
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    const stepLabel = i === 0 ? label : `${label} (リトライ ${i}: ${a.via} ${(a.scale*100)|0}%)`;
    onStatus && onStatus(stepLabel, progress);
    let input;
    let inputDesc;
    try {
      const targetCanvas = a.scale === 1.0 ? canvas : downscale(canvas, a.scale);
      inputDesc = `${targetCanvas.width}×${targetCanvas.height} (${(targetCanvas.width*targetCanvas.height/1e6).toFixed(1)}MP)`;
      if (a.via === 'canvas') {
        input = targetCanvas;
      } else if (a.via === 'blob-png') {
        input = await canvasToBlob(targetCanvas, 'image/png');
        inputDesc += ` PNG blob ${(input.size/1e6).toFixed(1)}MB`;
      } else {
        input = await canvasToBlob(targetCanvas, 'image/jpeg');
        inputDesc += ` JPEG blob ${(input.size/1e6).toFixed(1)}MB`;
      }
      if (a.reset) {
        console.log(`[ocrPage] resetting worker before retry ${i}`);
        activeWorker = await resetWorker(dpi);
        await activeWorker.setParameters({ tessedit_pageseg_mode: psm });
      }
      console.log(`[ocr ${label}] attempt ${i+1}: ${inputDesc}`);
      return await activeWorker.recognize(input);
    } catch (err) {
      lastErr = err;
      const msg = err?.message || err?.toString?.() || String(err);
      console.warn(`[ocr ${label}] attempt ${i+1} (${inputDesc ?? a.via}) failed: ${msg}`);
      if (!isImgErr(err)) throw err; // non-recoverable error type
    }
  }
  throw lastErr ?? new Error(`OCR ${label} failed after all retries`);
}

export async function ocrPage(page, onStatus, dpi = 600) {
  onStatus && onStatus('PDFページ描画', 0);
  const { canvas, effectiveDpi } = await renderPage(page, dpi);
  console.log(`[ocrPage] canvas=${canvas.width}×${canvas.height} (${(canvas.width*canvas.height/1e6).toFixed(1)}MP) effectiveDpi=${effectiveDpi}`);

  let worker = await getWorker(onStatus, effectiveDpi);

  const r1 = await recognizeWithRetry(worker, canvas, '11', 'OCR pass 1/3 (sparse, 高精度)', onStatus, 0.05, effectiveDpi);
  const w1 = tessWordsToEntries(r1.data.words);

  // After a retry, the worker variable may have been replaced internally
  // (workerPromise is reset). Re-fetch to be sure subsequent passes use
  // the current worker.
  worker = await getWorker(onStatus, effectiveDpi);
  const r2 = await recognizeWithRetry(worker, canvas, '6', 'OCR pass 2/3 (block, 高精度)', onStatus, 0.35, effectiveDpi);
  const w2 = tessWordsToEntries(r2.data.words);

  worker = await getWorker(onStatus, effectiveDpi);
  const r3 = await recognizeWithRetry(worker, canvas, '3', 'OCR pass 3/3 (auto, 高精度)', onStatus, 0.7, effectiveDpi);
  const w3 = tessWordsToEntries(r3.data.words);

  return mergeWords(mergeWords(w1, w2), w3);
}
