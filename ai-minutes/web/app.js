/* ============================================================
   app.js — AI イラスト議事録 オーケストレーション
   入力 (音声 / 資料 / 文字起こし) → 処理 (Gemini or ブラウザ) → 描画 (2 スタイル)
   ============================================================ */
import { generateWithGemini } from './lib/gemini.js';
import { transcribeAudio, structureHeuristically } from './lib/transcribe.js';
import { mountMinutes, minutesToText } from './lib/render.js';

const $ = (id) => document.getElementById(id);
const APIKEY_STORE = 'ai-minutes-gemini-key';

const state = {
  audioFile: null,
  materialFiles: [],
  style: 'figure',
  lastData: null,
};

/* ---------- 入力: 音声 ---------- */
function setupAudioInput() {
  const dz = $('audio-dropzone');
  const input = $('audio-input');
  const title = $('audio-dz-title');

  input.addEventListener('change', () => {
    state.audioFile = input.files[0] || null;
    if (state.audioFile) {
      title.textContent = `🎙️ ${state.audioFile.name}`;
      dz.classList.add('has-file');
    } else {
      title.textContent = '音声ファイルを選択';
      dz.classList.remove('has-file');
    }
    updateSummary();
  });
  setupDragDrop(dz, input);
}

/* ---------- 入力: 資料画像 ---------- */
function setupMaterialInput() {
  const dz = $('material-dropzone');
  const input = $('material-input');
  const title = $('material-dz-title');
  const thumbs = $('material-thumbs');

  input.addEventListener('change', () => {
    state.materialFiles = Array.from(input.files || []);
    thumbs.innerHTML = '';
    if (state.materialFiles.length) {
      title.textContent = `📐 ${state.materialFiles.length} 枚の資料`;
      dz.classList.add('has-file');
      state.materialFiles.forEach(f => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        img.alt = f.name;
        thumbs.appendChild(img);
      });
    } else {
      title.textContent = '図面・資料の画像を選択';
      dz.classList.remove('has-file');
    }
    updateSummary();
  });
  setupDragDrop(dz, input);
}

function setupDragDrop(dz, input) {
  ['dragover', 'dragenter'].forEach(ev =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(ev =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change'));
    }
  });
}

/* ---------- 処理モード切替 ---------- */
function setupModeSwitch() {
  const block = $('apikey-block');
  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.addEventListener('change', () => {
      block.classList.toggle('hidden', getMode() !== 'gemini');
      updateSummary();
    });
  });
  block.classList.toggle('hidden', getMode() !== 'gemini');
}
const getMode = () => document.querySelector('input[name="mode"]:checked').value;

/* ---------- API キー ---------- */
function setupApiKey() {
  const input = $('apikey-input');
  const remember = $('apikey-remember');
  const toggle = $('apikey-toggle');

  const saved = localStorage.getItem(APIKEY_STORE);
  if (saved) { input.value = saved; remember.checked = true; }

  toggle.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  const persist = () => {
    if (remember.checked && input.value.trim()) {
      localStorage.setItem(APIKEY_STORE, input.value.trim());
    } else {
      localStorage.removeItem(APIKEY_STORE);
    }
  };
  input.addEventListener('change', persist);
  remember.addEventListener('change', persist);
}

/* ---------- スタイル切替 ---------- */
function setupStyleToggle() {
  $('style-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.style-btn');
    if (!btn) return;
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.style = btn.dataset.style;
    if (state.lastData) {
      mountMinutes($('minutes-output'), state.lastData, state.style);
    }
  });
}

/* ---------- 入力サマリ ---------- */
function updateSummary() {
  const parts = [];
  if (state.audioFile) parts.push('音声1');
  if (state.materialFiles.length) parts.push(`資料${state.materialFiles.length}`);
  if ($('transcript-input').value.trim()) parts.push('文字起こし');
  $('input-summary').textContent = parts.length
    ? `入力: ${parts.join(' / ')}（${getMode() === 'gemini' ? 'Gemini' : '簡易版'}）`
    : '';
}

/* ---------- 進捗表示 ---------- */
const statusEl = $('status');
const logEl = $('log');
const barEl = $('progress-bar');
function showStatus(msg) {
  statusEl.classList.add('show');
  $('status-msg').textContent = msg;
}
function log(msg) {
  const t = new Date().toLocaleTimeString('ja-JP', { hour12: false });
  logEl.textContent += `[${t}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}
function setProgress(pct) {
  if (typeof pct === 'number') barEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

/* ---------- メイン実行 ---------- */
async function generate() {
  const btn = $('generate-btn');
  const transcript = $('transcript-input').value;
  const mode = getMode();

  if (!state.audioFile && !state.materialFiles.length && !transcript.trim()) {
    alert('音声・資料・文字起こしのいずれかを入力してください。');
    return;
  }

  btn.disabled = true;
  logEl.textContent = '';
  setProgress(0);
  showStatus('処理を開始しています...');

  try {
    let data;
    if (mode === 'gemini') {
      const apiKey = $('apikey-input').value.trim();
      if (!apiKey) {
        alert('高精度版（Gemini）には API キーが必要です。\n簡易版を選ぶか、キーを入力してください。');
        return;
      }
      showStatus('Gemini で解析中...');
      setProgress(20);
      data = await generateWithGemini(
        { apiKey, audioFile: state.audioFile, materialFiles: state.materialFiles, transcript },
        log
      );
      setProgress(95);
    } else {
      // 簡易版 (ブラウザ完結)
      if (state.materialFiles.length) {
        log('※ 簡易版では資料画像は解析されません（高精度版をご利用ください）。');
      }
      let fullText = transcript.trim();
      if (state.audioFile) {
        showStatus('ブラウザ内で文字起こし中...');
        const asrText = await transcribeAudio(state.audioFile, log, (p) => setProgress(10 + p * 0.7));
        fullText = (fullText ? fullText + '\n' : '') + asrText;
      }
      if (!fullText) throw new Error('文字起こし結果が空でした。');
      showStatus('内容を分類中...');
      setProgress(90);
      data = structureHeuristically(fullText);
    }

    setProgress(100);
    state.lastData = data;
    renderOutput(data);
    showStatus('✅ 議事録を作成しました。内容を確認してください。');
  } catch (err) {
    console.error(err);
    log('エラー: ' + err.message);
    showStatus('❌ ' + err.message);
  } finally {
    btn.disabled = false;
  }
}

function renderOutput(data) {
  $('output-section').style.display = 'block';
  mountMinutes($('minutes-output'), data, state.style);
  $('output-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- 出力アクション ---------- */
function setupOutputActions() {
  $('copy-btn').addEventListener('click', async () => {
    if (!state.lastData) return;
    try {
      await navigator.clipboard.writeText(minutesToText(state.lastData));
      $('copy-btn').textContent = '✅ コピーしました';
      setTimeout(() => { $('copy-btn').textContent = '📋 テキストでコピー'; }, 1800);
    } catch (e) { alert('コピーに失敗しました。'); }
  });

  $('print-btn').addEventListener('click', () => window.print());

  $('html-btn').addEventListener('click', () => {
    if (!state.lastData) return;
    const css = document.querySelector('link[href="./minutes.css"]');
    const node = $('minutes-output').cloneNode(true);
    // Rough.js の SVG はクローンに含まれるのでそのまま使える
    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<title>${(state.lastData.meta?.title) || '議事録'}</title>
<style>${MINUTES_INLINE_CSS}</style></head>
<body><div class="minutes-output ${state.style === 'hand' ? 'style-hand' : 'style-figure'}">${node.innerHTML}</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `議事録_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
  });
}

// HTML 保存用の最小インライン CSS (アイコンは絵文字でフォールバック)
const MINUTES_INLINE_CSS = `
body{font-family:'Noto Sans JP',sans-serif;background:#f4f6f8;margin:0;padding:24px;color:#2c3e50}
.minutes-output{max-width:820px;margin:0 auto;background:#fff;border-radius:16px;padding:36px;box-shadow:0 2px 10px rgba(0,0,0,.1)}
.minutes-output.style-hand{background:#fffef9}
.mn-header{text-align:center;margin-bottom:28px;border-bottom:2px solid #ecf0f1;padding-bottom:20px}
.mn-title{font-size:1.7rem;margin:0 0 12px}
.mn-meta{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;font-size:.9rem;color:#34495e}
.mn-summary{background:rgba(52,152,219,.06);border-radius:12px;padding:18px 22px;margin-bottom:28px;line-height:1.8;color:#34495e}
.mn-section{margin-bottom:30px}
.mn-section-head{font-size:1.15rem;font-weight:700;margin-bottom:14px}
.mn-card{display:flex;gap:14px;border:1px solid #ecf0f1;border-radius:12px;padding:14px 18px;margin-bottom:12px}
.mn-card-ico{display:none}
.mn-card-text{margin:0 0 6px;line-height:1.7}
.mn-tags{display:flex;flex-wrap:wrap;gap:6px}
.mn-tag{font-size:.78rem;padding:2px 10px;border-radius:999px;background:#ecf0f1;color:#34495e}
.mn-topic{margin-bottom:14px}.mn-topic-title{font-weight:600;margin-bottom:6px}
.mn-topic ul{margin:0;padding-left:1.3em;color:#34495e;line-height:1.75}
.mn-empty{color:#95a5a6}.svg,svg{display:none}
.mn-footnote{margin-top:28px;padding-top:16px;border-top:1px dashed #ecf0f1;font-size:.8rem;color:#95a5a6;text-align:center}
`;

/* ---------- init ---------- */
function init() {
  setupAudioInput();
  setupMaterialInput();
  setupModeSwitch();
  setupApiKey();
  setupStyleToggle();
  setupOutputActions();
  $('generate-btn').addEventListener('click', generate);
  $('transcript-input').addEventListener('input', updateSummary);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
