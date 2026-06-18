/* ============================================================
   app.js — AI イラスト議事録 オーケストレーション
   入力 (音声 / 資料 / 文字起こし) → 処理 (Gemini or ブラウザ) → 描画 (2 スタイル)
   ============================================================ */
import { generateWithGemini } from './lib/gemini.js';
import { transcribeAudio, structureHeuristically } from './lib/transcribe.js';
import { mountMinutes, minutesToText } from './lib/render.js';
import { t, setLang } from './lib/i18n.js';
import { MicRecorder, MicTester, listMicrophones, onDeviceChange, formatDuration } from './lib/recorder.js';

const $ = (id) => document.getElementById(id);
const APIKEY_STORE = 'ai-minutes-gemini-key';

// js/main.js と同じ言語設定を参照（タイミングに依存しないよう localStorage を直接読む）
function detectLang() {
  try { return localStorage.getItem('28tools-language') || 'ja'; }
  catch (e) { return 'ja'; }
}

const state = {
  audioFile: null,
  materialFiles: [],
  style: 'figure',
  lastData: null,
  recordedDuration: null, // 録音由来なら秒数 (それ以外は null)
};

const recorder = new MicRecorder();
const tester = new MicTester();
let _previewUrl = null;

const getSelectedDeviceId = () => $('mic-select').value || undefined;

/* ---------- マイク選択 ---------- */
async function populateMics() {
  const sel = $('mic-select');
  let mics = [];
  try { mics = await listMicrophones(); } catch (e) { mics = []; }
  const prev = sel.value;
  sel.innerHTML = '';
  const def = document.createElement('option');
  def.value = '';
  def.textContent = t('mic-default');
  sel.appendChild(def);
  mics.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = m.deviceId;
    o.textContent = m.label || t('mic-label-n', { n: i + 1 });
    sel.appendChild(o);
  });
  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
}

/* ---------- マイクテスト (レベルメーター) ---------- */
function setupMicTest() {
  const btn = $('mic-test-btn');
  const bar = $('mic-meter-bar');
  btn.addEventListener('click', async () => {
    if (tester.isActive) { stopMicTest(); return; }
    try {
      await tester.start(getSelectedDeviceId(), (level) => {
        bar.style.width = (level * 100).toFixed(0) + '%';
      });
      $('mic-meter').style.display = 'block';
      btn.textContent = t('mic-test-stop');
      btn.classList.add('recording');
      $('record-status').textContent = t('mic-test-hint');
      await populateMics(); // 許可後にラベルが取れる
    } catch (err) {
      console.error(err);
      $('record-status').textContent = '❌ ' + err.message;
    }
  });
}

function stopMicTest() {
  tester.stop();
  $('mic-meter').style.display = 'none';
  $('mic-meter-bar').style.width = '0';
  $('mic-test-btn').textContent = t('mic-test');
  $('mic-test-btn').classList.remove('recording');
  if (!recorder.isRecording) $('record-status').textContent = '';
}

/* ---------- 入力: 音声 (ファイル) ---------- */
function setupAudioInput() {
  const dz = $('audio-dropzone');
  const input = $('audio-input');

  input.addEventListener('change', () => {
    state.audioFile = input.files[0] || null;
    if (state.audioFile) clearRecordingPreview(); // ファイル選択時は録音を破棄
    state.recordedDuration = null;
    dz.classList.toggle('has-file', !!state.audioFile);
    applyAudioTitle();
    updateSummary();
  });
  setupDragDrop(dz, input);
}

function applyAudioTitle() {
  const el = $('audio-dz-title');
  if (state.audioFile && state.recordedDuration != null) {
    el.textContent = t('dz-audio-recorded', { time: formatDuration(state.recordedDuration) });
  } else if (state.audioFile) {
    el.textContent = t('dz-audio-selected', { name: state.audioFile.name });
  } else {
    el.textContent = t('dz-audio-default');
  }
}

/* ---------- 入力: マイク録音 (録音 → 停止 → メモリ内 WAV) ---------- */
function setupRecorder() {
  const btn = $('record-btn');
  const status = $('record-status');

  btn.addEventListener('click', async () => {
    if (recorder.isRecording) {
      // 停止 → 変換
      btn.disabled = true;
      status.textContent = t('rec-converting');
      try {
        const file = await recorder.stop();
        applyRecordedFile(file, lastTickSec);
        status.textContent = t('rec-done', { time: formatDuration(lastTickSec) });
      } catch (err) {
        console.error(err);
        status.textContent = '❌ ' + err.message;
      } finally {
        btn.classList.remove('recording');
        btn.textContent = t('rec-start');
        btn.disabled = false;
      }
      return;
    }

    // 録音開始 (テスト中なら止めてから)
    if (tester.isActive) stopMicTest();
    try {
      await recorder.start((sec) => {
        lastTickSec = sec;
        status.textContent = t('rec-recording', { time: formatDuration(sec) });
      }, getSelectedDeviceId());
      btn.classList.add('recording');
      btn.textContent = t('rec-stop');
      populateMics(); // 許可後にラベルが取れる
    } catch (err) {
      console.error(err);
      status.textContent = '❌ ' + err.message;
    }
  });
}

let lastTickSec = 0;

function applyRecordedFile(file, durationSec) {
  // 既存のファイル選択をクリアし、録音を音声入力として採用
  $('audio-input').value = '';
  state.audioFile = file;
  state.recordedDuration = durationSec;
  $('audio-dropzone').classList.add('has-file');
  applyAudioTitle();
  updateSummary();

  // メモリ内 blob URL でプレビュー (端末には保存しない)
  clearRecordingPreview();
  _previewUrl = URL.createObjectURL(file);
  const preview = $('record-preview');
  preview.src = _previewUrl;
  preview.style.display = 'block';
}

function clearRecordingPreview() {
  const preview = $('record-preview');
  preview.pause && preview.pause();
  preview.removeAttribute('src');
  preview.style.display = 'none';
  if (_previewUrl) { URL.revokeObjectURL(_previewUrl); _previewUrl = null; }
}

/* ---------- 入力: 資料画像 ---------- */
function setupMaterialInput() {
  const dz = $('material-dropzone');
  const input = $('material-input');
  const thumbs = $('material-thumbs');

  input.addEventListener('change', () => {
    state.materialFiles = Array.from(input.files || []);
    thumbs.innerHTML = '';
    dz.classList.toggle('has-file', state.materialFiles.length > 0);
    state.materialFiles.forEach(f => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.alt = f.name;
      thumbs.appendChild(img);
    });
    applyMaterialTitle();
    updateSummary();
  });
  setupDragDrop(dz, input);
}

function applyMaterialTitle() {
  $('material-dz-title').textContent = state.materialFiles.length
    ? t('dz-material-selected', { n: state.materialFiles.length })
    : t('dz-material-default');
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
  if (state.audioFile) parts.push(t('sum-audio'));
  if (state.materialFiles.length) parts.push(t('sum-material', { n: state.materialFiles.length }));
  if ($('transcript-input').value.trim()) parts.push(t('sum-transcript'));
  const mode = getMode() === 'gemini' ? t('mode-gemini') : t('mode-simple');
  $('input-summary').textContent = parts.length
    ? t('sum-template', { parts: parts.join(' / '), mode })
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
    alert(t('al-need-input'));
    return;
  }

  btn.disabled = true;
  logEl.textContent = '';
  setProgress(0);
  showStatus(t('st-start'));

  try {
    let data;
    if (mode === 'gemini') {
      const apiKey = $('apikey-input').value.trim();
      if (!apiKey) {
        alert(t('al-need-key'));
        return;
      }
      showStatus(t('st-gemini'));
      setProgress(20);
      data = await generateWithGemini(
        { apiKey, audioFile: state.audioFile, materialFiles: state.materialFiles, transcript },
        log
      );
      setProgress(95);
    } else {
      // 簡易版 (ブラウザ完結)
      if (state.materialFiles.length) {
        log(t('log-simple-no-image'));
      }
      let fullText = transcript.trim();
      if (state.audioFile) {
        showStatus(t('st-transcribing'));
        const asrText = await transcribeAudio(state.audioFile, log, (p) => setProgress(10 + p * 0.7));
        fullText = (fullText ? fullText + '\n' : '') + asrText;
      }
      if (!fullText) throw new Error(t('tr-err-empty'));
      showStatus(t('st-classifying'));
      setProgress(90);
      data = structureHeuristically(fullText);
    }

    setProgress(100);
    state.lastData = data;
    renderOutput(data);
    showStatus(t('st-done'));
  } catch (err) {
    console.error(err);
    log('Error: ' + err.message);
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
      $('copy-btn').textContent = t('btn-copied');
      setTimeout(() => { $('copy-btn').textContent = t('btn-copy'); }, 1800);
    } catch (e) { alert(t('al-copy-fail')); }
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

/* ---------- 言語適用 ---------- */
// JS が管理する動的テキスト (data-lang-key 非対象) を現在の言語で再描画する。
function applyDynamicLang() {
  applyAudioTitle();
  applyMaterialTitle();
  $('copy-btn').textContent = t('btn-copy');
  if (!recorder.isRecording) $('record-btn').textContent = t('rec-start');
  if (!tester.isActive) $('mic-test-btn').textContent = t('mic-test');
  populateMics();
  updateSummary();
  if (state.lastData) {
    mountMinutes($('minutes-output'), state.lastData, state.style);
  }
}

/* ---------- init ---------- */
function init() {
  setLang(detectLang());
  setupAudioInput();
  setupRecorder();
  setupMicTest();
  populateMics();
  onDeviceChange(populateMics);
  setupMaterialInput();
  setupModeSwitch();
  setupApiKey();
  setupStyleToggle();
  setupOutputActions();
  $('generate-btn').addEventListener('click', generate);
  $('transcript-input').addEventListener('input', updateSummary);

  // 言語切替 (js/main.js の changeLanguage が dispatch) に追従
  window.addEventListener('28tools-langchange', (e) => {
    setLang((e && e.detail) || detectLang());
    applyDynamicLang();
  });

  applyDynamicLang();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
