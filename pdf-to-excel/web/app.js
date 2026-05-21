// PDF → Excel browser prototype — entry point + UI orchestration.
// All processing happens in the browser; no data is sent to any server.

import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
const CMAP_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/';

import {
  isObfuscated,
  detectPageCategory,
  detectOcrCategory,
  detectMaterials,
  toItems,
  extractRcBeams,
  extractSBeams,
  extractColumnsFromOcr,
  extractSmallBeamsFromOcr,
} from './lib/extractors.js';

import { buildExcelBlob } from './lib/excel.js';

// UI references
const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const progressBar = document.getElementById('progress-bar');
const tabsEl = document.getElementById('tabs');
const previewEl = document.getElementById('preview');
const previewSection = document.getElementById('preview-section');
const actionsEl = document.getElementById('actions');
const downloadBtn = document.getElementById('download-btn');
const summaryEl = document.getElementById('result-summary');

let extractedData = null;
let activeTab = null;
const SHEET_KEYS = {
  '基礎大梁 (RC)': 'rcBeams',
  '大梁 (S)':       'sBeams',
  '小梁 (S)':       'smallBeams',
  '柱 (S)':          'columns',
};

function showStatus(msg) {
  statusEl.classList.add('show');
  statusEl.querySelector('.status-msg').textContent = msg;
}
function setProgress(pct) { progressBar.style.width = pct + '%'; }
function log(msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// --- drag & drop wiring ---
dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', async e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const f = e.dataTransfer.files[0];
  if (f && /\.pdf$/i.test(f.name)) await processPdf(f);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) processPdf(fileInput.files[0]);
});

// SHA-256 of buffer (hex) for cache key
async function sha256(buffer) {
  const h = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2,'0')).join('');
}

// Cache: same PDF re-uploaded? Return cached result so the user gets
// an instant load on iteration. Uses the Cache API (lighter than IDB).
// Bump suffix when extraction logic changes so old caches invalidate.
const CACHE_NAME = 'pdf-extract-v8';
async function loadCache(key) {
  try {
    const c = await caches.open(CACHE_NAME);
    const r = await c.match('/cache/' + key);
    return r ? await r.json() : null;
  } catch { return null; }
}
async function saveCache(key, data) {
  try {
    const c = await caches.open(CACHE_NAME);
    await c.put('/cache/' + key, new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch {}
}

// Concatenate text items from a PDF page into a single material-scan-ready
// list. We strip control chars and project to PDF-point coordinates so
// detectMaterials() can group items by Y line.
async function pageTextItems(page) {
  const tc = await page.getTextContent({ includeMarkedContent: false });
  const viewport = page.getViewport({ scale: 1 });
  return { items: toItems(tc.items, viewport), tcItems: tc.items, viewport };
}

async function processPdf(file) {
  try {
    logEl.innerHTML = '';
    actionsEl.style.display = 'none';
    previewSection.style.display = 'none';
    tabsEl.innerHTML = '';
    previewEl.innerHTML = '';
    showStatus('PDF 読み込み中...');
    setProgress(5);

    const buf = await file.arrayBuffer();
    const cacheKey = await sha256(buf);
    const cached = await loadCache(cacheKey);
    if (cached) {
      log(`📄 ${file.name} — キャッシュから即座にロード`);
      extractedData = cached;
      renderTabs(cached);
      setProgress(100);
      showStatus('✅ キャッシュロード完了');
      actionsEl.style.display = 'flex';
      summaryEl.textContent =
        `基礎大梁 ${cached.rcBeams.length} / ` +
        `大梁 ${cached.sBeams.length} / ` +
        `小梁 ${cached.smallBeams.length} / ` +
        `柱 ${cached.columns.length}`;
      return;
    }

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buf),
      cMapUrl: CMAP_URL,
      cMapPacked: true,
      disableFontFace: true,
    }).promise;
    log(`📄 ${file.name} — ${pdf.numPages} ページ`);

    const result = {
      rcBeams: [],
      sBeams: [],
      smallBeams: [],
      columns: [],
      sourceFile: file.name,
    };

    for (let p = 1; p <= pdf.numPages; p++) {
      setProgress(10 + (p - 1) / pdf.numPages * 80);
      showStatus(`ページ ${p}/${pdf.numPages} 処理中...`);
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent({ includeMarkedContent: false });
      const viewport = page.getViewport({ scale: 1 });

      // Per-page material diagnostic — extractors already run
      // detectMaterials() internally; this just logs what each page
      // contributed so the user can verify by eye.
      const pageItems = toItems(tc.items, viewport);
      const pageMats = detectMaterials(pageItems);
      if (pageMats._all.length) {
        log(`🔍 P${p} マテリアル検出: ${pageMats._all.join(', ')}`);
      }

      // Try text extraction first (fast).
      let extracted = false;
      const obfuscated = isObfuscated(tc.items);
      if (!obfuscated) {
        const cat = detectPageCategory(tc.items, viewport);
        if (cat === 'rc-beam') {
          const beams = extractRcBeams(tc.items, viewport);
          if (beams.length > 0) {
            result.rcBeams.push(...beams);
            log(`P${p}: rc-beam ${beams.length}件 (テキスト)`);
            extracted = true;
          }
        } else if (cat === 's-beam') {
          const beams = extractSBeams(tc.items, viewport);
          if (beams.length > 0) {
            result.sBeams.push(...beams);
            log(`P${p}: s-beam ${beams.length}件 (テキスト)`);
            extracted = true;
          }
        }
      }

      // OCR fallback: any page where text extraction yielded nothing AND
      // the page has visible content. Catches glyph-obfuscated, image-only
      // (zero text items), AND ambiguous-layout pages all in one path.
      const shouldOcr = !extracted && (tc.items.length === 0 || tc.items.length >= 20);
      if (shouldOcr) {
        log(`P${p}: テキスト抽出 0件 (${obfuscated ? '難読化' : tc.items.length === 0 ? '画像のみ' : '未認識'}) → OCR フォールバック`);
        const { ocrPage } = await import('./lib/ocr.js');
        const words = await ocrPage(page, (st, frac) => {
          showStatus(`P${p}/${pdf.numPages} OCR (${st})`);
          setProgress(10 + ((p - 1) + (frac || 0)) / pdf.numPages * 80);
        });
        const { category, counts } = detectOcrCategory(words);
        log(`  OCR: ${words.length}語 (SC=${counts.sc}, SB=${counts.sb}) → ${category}`);

        // Per-page material detection from OCR output too. Image-only
        // specification pages (e.g. "鋼材は、SN490Bとする。") yield no
        // beam anchors but still contribute material info — surface it.
        const ocrMats = detectMaterials(words);
        if (ocrMats._all.length) {
          log(`🔍 P${p} OCR マテリアル検出: ${ocrMats._all.join(', ')}`);
          // Stash for the summary so it's visible even if no beams found.
          result.pageMaterials = result.pageMaterials || [];
          result.pageMaterials.push({ page: p, materials: ocrMats._all });
        }
        if (category === 'column') {
          const cols = extractColumnsFromOcr(words);
          result.columns.push(...cols);
          log(`  柱 ${cols.length} 件抽出`);
        } else if (category === 'small-beam') {
          const sbs = extractSmallBeamsFromOcr(words);
          result.smallBeams.push(...sbs);
          log(`  小梁 ${sbs.length} 件抽出`);
        } else {
          const cols = extractColumnsFromOcr(words);
          const sbs = extractSmallBeamsFromOcr(words);
          if (sbs.length > cols.length) {
            result.smallBeams.push(...sbs);
            log(`  → 小梁として ${sbs.length} 件採用 (両側試行)`);
          } else if (cols.length > 0) {
            result.columns.push(...cols);
            log(`  → 柱として ${cols.length} 件採用 (両側試行)`);
          } else {
            log(`  ⚠ OCR でも抽出できず`);
          }
        }
      } else if (!extracted) {
        log(`P${p}: 内容なし — スキップ`);
      }
    }

    // Cross-page material fallback. Per-page detection runs first (each
    // beam carries the material it found on ITS own page). After the loop
    // we collect every material seen anywhere — including OCR-only spec
    // pages — and use them to fill beams whose own page had nothing.
    // Steel-prefix materials go to S beams, concrete to RC beams.
    const STEEL_PRIORITY = ['SN', 'SM', 'BCP', 'BCR', 'STKR', 'STK', 'SS'];
    const sortByPriority = (a, b) => {
      const ia = STEEL_PRIORITY.findIndex(p => a.startsWith(p));
      const ib = STEEL_PRIORITY.findIndex(p => b.startsWith(p));
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    };

    const allSteel = new Set();
    const allConcrete = new Set();
    const allRebar = new Set();
    const classify = m => {
      if (!m) return;
      if (/^Fc/.test(m)) allConcrete.add(m);
      else if (/^SD/.test(m)) allRebar.add(m);
      else allSteel.add(m);
    };
    for (const arr of [result.rcBeams, result.sBeams, result.smallBeams, result.columns]) {
      for (const b of arr) {
        classify(b.原文?.構造マテリアル);
        classify(b.原文?.主筋材質);
      }
    }
    for (const pm of result.pageMaterials || []) for (const m of pm.materials) classify(m);

    const steelFallback = [...allSteel].sort(sortByPriority)[0] ?? null;
    const concreteFallback = [...allConcrete][0] ?? null;
    const rebarFallback = [...allRebar][0] ?? null;

    const applyFallback = (beams, materialField, fallback, label) => {
      if (!fallback) return;
      let n = 0;
      for (const b of beams) {
        if (!b.原文[materialField]) { b.原文[materialField] = fallback; n++; }
      }
      if (n) log(`💡 ${label}: ${fallback} を ${n} 件に補完 (他ページから)`);
    };
    applyFallback(result.rcBeams, '構造マテリアル', concreteFallback, '基礎大梁(RC)');
    applyFallback(result.rcBeams, '主筋材質',        rebarFallback,    '基礎大梁(RC) 主筋');
    applyFallback(result.sBeams, '構造マテリアル', steelFallback,    '大梁(S)');
    applyFallback(result.smallBeams, '構造マテリアル', steelFallback, '小梁(S)');
    applyFallback(result.columns, '構造マテリアル', steelFallback,   '柱');

    // Persist to cache so re-uploads of this PDF skip processing entirely.
    saveCache(cacheKey, result);

    extractedData = result;
    setProgress(95);
    showStatus('プレビュー作成中...');
    renderTabs(result);
    setProgress(100);
    const total = result.rcBeams.length + result.sBeams.length +
                  result.smallBeams.length + result.columns.length;
    const detectedMats = (result.pageMaterials || [])
      .flatMap(p => p.materials)
      .filter((v, i, a) => a.indexOf(v) === i);
    showStatus(total === 0
      ? (detectedMats.length
        ? `⚠ 梁/柱は認識できませんでしたが、マテリアル候補を検出: ${detectedMats.join(', ')}`
        : '⚠ データを認識できませんでした')
      : `✅ 抽出完了 — 計 ${total} 件`);
    actionsEl.style.display = 'flex';
    summaryEl.textContent =
      `基礎大梁 ${result.rcBeams.length} / ` +
      `大梁 ${result.sBeams.length} / ` +
      `小梁 ${result.smallBeams.length} / ` +
      `柱 ${result.columns.length}` +
      (detectedMats.length ? ` / マテリアル候補: ${detectedMats.join(', ')}` : '');
  } catch (err) {
    log(`❌ エラー: ${err.message}`);
    showStatus(`❌ ${err.message}`);
    console.error(err);
  }
}

function renderTabs(result) {
  tabsEl.innerHTML = '';
  let first = null;
  for (const [label, key] of Object.entries(SHEET_KEYS)) {
    const n = result[key].length;
    if (n === 0) continue;
    const btn = document.createElement('button');
    btn.innerHTML = `${label}<span class="count">${n}</span>`;
    btn.dataset.tab = label;
    btn.addEventListener('click', () => { activeTab = label; renderTable(); });
    tabsEl.appendChild(btn);
    if (!first) first = label;
  }
  activeTab = first;
  previewSection.style.display = first ? 'block' : 'none';
  renderTable();
}

function renderTable() {
  if (!extractedData || !activeTab) {
    previewEl.innerHTML = '';
    return;
  }
  tabsEl.querySelectorAll('button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === activeTab));

  const data = extractedData[SHEET_KEYS[activeTab]];
  if (!data || data.length === 0) {
    previewEl.innerHTML = '<div class="empty">データなし</div>';
    return;
  }

  let rows;
  // Preview columns mirror what Excel writes (lib/excel.js). This keeps
  // the user's mental model consistent: "what I see is what I get".

  // Inline section parser for preview-only display.
  const parseS = s => {
    if (!s) return {};
    const m = String(s).match(/^(SH|BH|H)[-]?(\d+)[×xX](\d+)[×xX](\d+(?:\.\d+)?)[×xX](\d+(?:\.\d+)?)$/);
    return m ? { 形式: m[1]==='H'?'SH':m[1], 成H: +m[2], 幅B: +m[3], tw: +m[4], tf: +m[5] } : {};
  };
  const parseCol = s => {
    if (!s) return {};
    const h = String(s).match(/^(SH|BH|H)[-]?(\d+)[×xX](\d+)[×xX](\d+)[×xX](\d+)/);
    if (h) return { 形式: h[1]==='H'?'SH':h[1], AH: +h[2], B: +h[3], t1: +h[4], t2: +h[5] };
    const q = String(s).match(/^(?:[□ロ口])?[-]?(\d+)[×xX](\d+)[×xX](\d+)/);
    return q ? { 形式: '□', AH: +q[1], B: +q[2], t1: +q[3], t2: '' } : {};
  };
  const rebarTop1 = s => {
    if (!s || s === '-') return '';
    return String(s).split('(')[0].split('+')[0] || '';
  };
  const rebarTop2 = s => {
    if (!s || s === '-') return '';
    const m = String(s).split('(')[0].split('+');
    return m[1] || '';
  };
  const parseStir = s => {
    if (!s) return { 径: '', 脚数: '', ピッチ: '' };
    const m = String(s).match(/^(D\d+)\[(\d+)\]@(\d+)$/);
    return m ? { 径: m[1], 脚数: m[2], ピッチ: m[3] } : { 径: '', 脚数: '', ピッチ: '' };
  };

  if (activeTab === '基礎大梁 (RC)') {
    const POSLAB = [['a','左端'], ['c','中央'], ['b','右端']];
    rows = data.map(d => {
      const r = d.原文 || {};
      const stir = parseStir(r.あばら筋);
      const row = {
        TypeName: d.符号,
        符号: d.符号,
        幅B: r.幅B?.c ?? r.幅B?.a ?? r.幅B?.b ?? '',
        成D: r.成D ?? '',
        構造マテリアル: r.構造マテリアル ?? '',
        主筋材質: r.主筋材質 ?? '',
        備考: '',
      };
      for (const [k, label] of POSLAB) {
        row[`${label}_主筋径`]    = r.主筋径 ?? '';
        row[`${label}_上_1段`]    = rebarTop1(r.主筋上?.[k]);
        row[`${label}_上_2段`]    = rebarTop2(r.主筋上?.[k]);
        row[`${label}_下_1段`]    = rebarTop1(r.主筋下?.[k]);
        row[`${label}_下_2段`]    = rebarTop2(r.主筋下?.[k]);
        row[`${label}_あばら径`]  = stir.径;
        row[`${label}_脚数`]      = stir.脚数;
        row[`${label}_ピッチ`]    = stir.ピッチ;
      }
      return row;
    });
  } else if (activeTab === '大梁 (S)') {
    rows = data.map(d => {
      const r = d.原文 || {};
      const sec = parseS(r.断面型);
      return {
        TypeName: d.符号, 符号: d.符号,
        形式: sec.形式 ?? '', 成H: sec.成H ?? '', 幅B: sec.幅B ?? '',
        ウェブtw: sec.tw ?? '', フランジtf: sec.tf ?? '',
        通り起点: (r.通り起点_列 || [])[0] ?? '',
        通り終点: (r.通り終点_列 || []).slice(-1)[0] ?? '',
        構造マテリアル: r.構造マテリアル ?? '',
        原文: r.断面型 ?? '',
      };
    });
  } else if (activeTab === '小梁 (S)') {
    rows = data.map(d => {
      const r = d.原文 || {};
      const sec = parseS(r.断面型);
      const sym = String(d.符号).toLowerCase();
      return {
        TypeName: sym, 符号: sym, 構造: 'S',
        形式: sec.形式 ?? '', 成H: sec.成H ?? '', 幅B: sec.幅B ?? '',
        ウェブtw: sec.tw ?? '', フランジtf: sec.tf ?? '',
        構造マテリアル: r.構造マテリアル ?? r.鋼材グレード ?? '',
        原文: r.断面型 ?? '',
      };
    });
  } else if (activeTab === '柱 (S)') {
    const maxSec = Math.max(1, ...data.map(d => (d.原文?.断面型_列 || []).length));
    rows = data.map(d => {
      const sections = (d.原文?.断面型_列 || []).map(parseCol);
      const row = {
        TypeName: d.符号, 符号: d.符号,
      };
      for (let i = 1; i <= maxSec; i++) {
        const s = sections[i-1] || {};
        row[`断面${i}_形式`] = s.形式 ?? '';
        row[`断面${i}_A/H`]  = s.AH ?? '';
        row[`断面${i}_幅B`]  = s.B ?? '';
        row[`断面${i}_t1`]   = s.t1 ?? '';
        row[`断面${i}_t2`]   = s.t2 ?? '';
      }
      row.構造マテリアル = d.原文?.構造マテリアル ?? '';
      row.備考 = 'OCR抽出';
      return row;
    });
  }

  const keys = Object.keys(rows[0]);
  const html = `<table>
    <thead><tr>${keys.map(k => `<th>${escapeHtml(k)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r, ri) => `<tr>${keys.map(k =>
      `<td contenteditable="true" class="editable" data-row="${ri}" data-key="${escapeHtml(k)}">${escapeHtml(r[k] ?? '')}</td>`
    ).join('')}</tr>`).join('')}</tbody>
  </table>`;
  previewEl.innerHTML = html;

  // Wire up edit-back: writing to the underlying data array on blur.
  previewEl.querySelectorAll('td.editable').forEach(td => {
    td.addEventListener('blur', () => {
      const ri = +td.dataset.row;
      const key = td.dataset.key;
      const val = td.textContent.trim();
      // Just stash into a `_edits` map for now; download will pick up edits later.
      if (!data[ri]._edits) data[ri]._edits = {};
      data[ri]._edits[key] = val;
    });
  });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

downloadBtn.addEventListener('click', async () => {
  if (!extractedData) return;
  downloadBtn.disabled = true;
  const orig = downloadBtn.textContent;
  downloadBtn.textContent = 'Excel 生成中...';
  try {
    const blob = await buildExcelBlob(extractedData);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (extractedData.sourceFile || 'extracted').replace(/\.pdf$/i, '') + '.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    log('✅ Excel 出力完了');
  } catch (err) {
    log(`❌ Excel 出力失敗: ${err.message}`);
    console.error(err);
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = orig;
  }
});
