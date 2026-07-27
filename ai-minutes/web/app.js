/* ============================================================
   app.js — AI議事録 自動作成 オーケストレーション
   入力 (音声 / 資料 / 文字起こし) → 処理 (Gemini or ブラウザ) → 描画 (2 スタイル)
   ============================================================ */
import { generateWithGemini, translateMinutes } from './lib/gemini.js';
import { transcribeAudio, structureHeuristically } from './lib/transcribe.js';
import { mountMinutes, minutesToText } from './lib/render.js';
import { t, setLang, getLang } from './lib/i18n.js';
import { MicRecorder, SegmentedMicRecorder, MicTester, listMicrophones, onDeviceChange, formatDuration } from './lib/recorder.js';
import { SegmentSaver } from './lib/saver.js';
import { mergeSegments, segmentLabel } from './lib/merge.js';

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
  translatedByLang: {},   // 言語コード → 翻訳済み議事録データ (キャッシュ)
  translating: false,
};

const recorder = new MicRecorder();
const tester = new MicTester();
let _previewUrl = null;

// 長時間モード（10分ごとに自動分割・保存・Gemini処理・結合）の状態
const segRecorder = new SegmentedMicRecorder();
const longrec = {
  active: false,
  saver: new SegmentSaver(),
  saveMode: 'download', // 'folder' | 'download'
  intervalMin: 10,
  sessionLabel: '',
  segments: [],         // index → { index, startSec, durationSec, status, data, err }
  queue: Promise.resolve(), // 保存→Gemini 処理を直列化
  eventLogged: false,
};

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
const MIC_METER_SEGMENTS = 24;

// セグメント（LED 風の目盛り）を一度だけ生成する。
function buildMicMeter() {
  const scale = $('mic-meter-scale');
  if (!scale || scale._built) return;
  for (let i = 0; i < MIC_METER_SEGMENTS; i++) {
    const seg = document.createElement('span');
    seg.className = 'mic-seg';
    scale.appendChild(seg);
  }
  scale._built = true;
}

// 入力レベル(0..1)に応じてセグメントを点灯。
function setMicMeterLevel(level) {
  const scale = $('mic-meter-scale');
  if (!scale || !scale._built) return;
  const segs = scale.children;
  const on = Math.round(Math.max(0, Math.min(1, level)) * segs.length);
  for (let i = 0; i < segs.length; i++) {
    segs[i].classList.toggle('on', i < on);
  }
}

function setupMicTest() {
  const btn = $('mic-test-btn');
  buildMicMeter();
  btn.addEventListener('click', async () => {
    if (tester.isActive) { stopMicTest(); return; }
    try {
      buildMicMeter();
      await tester.start(getSelectedDeviceId(), (level) => {
        setMicMeterLevel(level);
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
  setMicMeterLevel(0);
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

/* ---------- 録音（メイン動線: 1 ボタンで開始/停止、停止で自動作成） ----------
   ・高精度版(Gemini)  → 長時間モード（自動分割・保存・区間ごとに Gemini・結合）
   ・簡易版(ブラウザ)  → 通常録音し、停止時にブラウザ内で自動作成
   どちらも「停止したら自動で議事録が最下部に出る」動線に統一。
*/
function setupRecord() {
  const btn = $('record-btn');
  const status = $('record-status');

  btn.addEventListener('click', async () => {
    // --- 停止（動作中のレコーダーに委譲） ---
    if (segRecorder.isRecording) { await stopGeminiLongRec(btn, status); return; }
    if (recorder.isRecording)    { await stopSimpleRec(btn, status); return; }
    // --- 開始（処理方法で分岐） ---
    if (getMode() === 'gemini') await startGeminiLongRec(btn, status);
    else                        await startSimpleRec(btn, status);
  });
}

// 録音ボタンの見た目（アイコン＋ラベル＋赤色）を切替。
// 待機時は録音マーク（赤丸）、録音中は停止マーク（■）。
function setRecBtn(recording) {
  const ico = $('rec-hero-ico'), label = $('rec-hero-label'), btn = $('record-btn');
  if (recording) {
    if (ico) ico.textContent = '⏹';
    if (label) label.textContent = t('rec-hero-stop');
    if (btn) btn.classList.add('recording');
  } else {
    if (ico) ico.textContent = '🔴';
    if (label) label.textContent = t('rec-hero-start');
    if (btn) btn.classList.remove('recording');
  }
}

/* ---------- 簡易版（ブラウザ完結）: 通常録音 → 停止で自動作成 ---------- */
async function startSimpleRec(btn, status) {
  if (tester.isActive) stopMicTest();
  try {
    await recorder.start((sec) => {
      lastTickSec = sec;
      status.textContent = t('rec-recording', { time: formatDuration(sec) });
    }, getSelectedDeviceId());
    setRecBtn(true);
    populateMics(); // 許可後にラベルが取れる
  } catch (err) {
    console.error(err);
    status.textContent = '❌ ' + err.message;
  }
}

async function stopSimpleRec(btn, status) {
  btn.disabled = true;
  status.textContent = t('rec-converting');
  try {
    const file = await recorder.stop();
    applyRecordedFile(file, lastTickSec);
    status.textContent = t('rec-done', { time: formatDuration(lastTickSec) });
    await generate(); // 停止したら自動で議事録を作成（最下部に表示）
  } catch (err) {
    console.error(err);
    status.textContent = '❌ ' + err.message;
  } finally {
    setRecBtn(false);
    btn.disabled = false;
  }
}

/* ---------- 詳細パネルの補助 UI（処理方法・保存先・セットアップ帯） ---------- */
function setupLongRec() {
  // 記憶済みフォルダを復元して表示（許可はまだ取らない）
  longrec.saver.loadRemembered().then(updateFolderStatus).catch(() => {});
  updateFolderStatus();

  // 保存先フォルダの選択/変更（詳細パネル内）
  const fc = $('folder-choose');
  if (fc) fc.addEventListener('click', async () => {
    if (!longrec.saver.supported) { alert(t('lr-folder-unsupported')); return; }
    try { await longrec.saver.chooseFolder(); } catch (e) { return; /* キャンセル */ }
    updateFolderStatus();
  });

  // 「キーを入力」→ 詳細パネルを開いてキー欄にフォーカス
  const sk = $('setup-open-key');
  if (sk) sk.addEventListener('click', () => {
    const adv = $('advanced-panel');
    if (adv) adv.open = true;
    const key = $('apikey-input');
    if (key) { key.focus(); key.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  });

  // 処理方法の変更でセットアップ帯を出し分け
  document.querySelectorAll('input[name="mode"]').forEach(r =>
    r.addEventListener('change', updateSetupStrip));

  updateSetupStrip();
}

// 高精度版かつ API キー未保存のときだけ、録音ボタン下にセットアップ帯を表示。
function updateSetupStrip() {
  const strip = $('setup-strip');
  if (!strip) return;
  const needKey = getMode() === 'gemini' && !$('apikey-input').value.trim();
  strip.classList.toggle('hidden', !needKey);
}

// 保存先フォルダの表示を更新。
function updateFolderStatus() {
  const el = $('folder-status');
  if (!el) return;
  if (!longrec.saver.supported) { el.textContent = t('lr-folder-unsupported'); return; }
  const name = longrec.saver.folderName || longrec.saver.rememberedName;
  el.textContent = name ? t('lr-folder-current', { name }) : t('lr-folder-none');
}

// 「デスクトップ_議事録_20260727-1530」のようなセッション接頭辞。
function sessionLabelNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${t('lr-file-prefix')}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

// 停止: 最後のセグメントを確定し、全処理の完了を待って最終結合を表示。
async function stopGeminiLongRec(btn, status) {
  btn.disabled = true;
  status.textContent = t('lr-finishing');
  try {
    await segRecorder.stop();     // 最後のセグメントを確定
    await longrec.queue;          // 保存・Gemini 処理の完了を待つ
    finalizeLongRec();
  } catch (err) {
    console.error(err);
    status.textContent = '❌ ' + err.message;
  } finally {
    longrec.active = false;
    setRecBtn(false);
    btn.disabled = false;
  }
}

// 開始: 高精度版＋キー確認 → 保存先確保 → セグメント録音開始。
async function startGeminiLongRec(btn, status) {
  // --- キー必須（無ければ詳細を開いて入力を促す） ---
  const apiKey = $('apikey-input').value.trim();
  if (!apiKey) {
    updateSetupStrip();
    const adv = $('advanced-panel'); if (adv) adv.open = true;
    const key = $('apikey-input'); if (key) { key.focus(); key.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    status.textContent = t('lr-need-key-inline');
    return;
  }

  // --- 保存先フォルダを確保（記憶済みがあれば許可のみ・無ければ選択） ---
  longrec.saver.reset();
  if (longrec.saver.supported) {
    let ok = false;
    try { ok = await longrec.saver.useRememberedWithPermission(); } catch (e) { ok = false; }
    if (!ok) {
      try { await longrec.saver.chooseFolder(); }
      catch (e) { status.textContent = t('lr-folder-cancel'); return; } // キャンセル → 中止
    }
    updateFolderStatus();
  }
  longrec.saveMode = longrec.saver.mode;

  // --- 状態リセット & 録音開始 ---
  if (tester.isActive) stopMicTest();
  longrec.active = true;
  longrec.eventLogged = false;
  longrec.intervalMin = parseInt(($('longrec-interval') || {}).value, 10) || 10;
  longrec.sessionLabel = sessionLabelNow();
  longrec.segments = [];
  longrec.queue = Promise.resolve();
  state.lastData = null;
  state.translatedByLang = {};

  const panel = $('longrec-panel');
  if (panel) panel.classList.remove('hidden');
  $('output-section').style.display = 'none'; // 前回の議事録は隠し、停止後に出す
  renderSegmentList();
  logEl.textContent = '';
  showStatus(t('lr-recording-start', {
    min: longrec.intervalMin,
    where: longrec.saveMode === 'folder' ? t('lr-how-folder') : t('lr-how-download'),
  }));
  log(t('lr-log-start', {
    min: longrec.intervalMin,
    where: longrec.saveMode === 'folder' ? t('lr-how-folder') : t('lr-how-download'),
  }));

  try {
    await segRecorder.start({
      onTick: (sec) => {
        status.textContent = t('lr-recording', {
          time: formatDuration(sec),
          part: longrec.segments.length + 1,
        });
      },
      onSegment: (seg) => onSegmentReady(seg, apiKey),
      deviceId: getSelectedDeviceId(),
      segmentMs: longrec.intervalMin * 60 * 1000,
    });
    setRecBtn(true);
    populateMics();
  } catch (err) {
    console.error(err);
    longrec.active = false;
    setRecBtn(false);
    status.textContent = '❌ ' + err.message;
  }
}

// セグメントが確定したら: 音声を保存 → Gemini で議事録化 → 結合して逐次描画。
function onSegmentReady(seg, apiKey) {
  const rec = {
    index: seg.index,
    startSec: seg.startSec,
    durationSec: seg.durationSec,
    status: 'saving',
    data: null,
    err: null,
  };
  longrec.segments[seg.index] = rec;
  renderSegmentList();

  if (seg.error || !seg.file) {
    rec.status = 'error';
    rec.err = (seg.error && seg.error.message) || t('lr-seg-rec-fail');
    renderSegmentList();
    return;
  }

  const nn = String(seg.index + 1).padStart(2, '0');
  const named = new File([seg.file], `${longrec.sessionLabel}_part${nn}.wav`, { type: 'audio/wav' });

  // 保存 → 処理を直列化（順序保持・API 競合回避）。区切りは 10 分間隔なので詰まらない。
  longrec.queue = longrec.queue.then(async () => {
    // 1) まず音声を確実に保存（Gemini が失敗しても手元に残す安全網）
    try {
      const how = await longrec.saver.save(named);
      log(t('lr-saved', { name: named.name, how: t(how === 'folder' ? 'lr-how-folder' : 'lr-how-download') }));
    } catch (e) {
      log(t('lr-save-fail', { name: named.name }));
    }

    // 2) Gemini で議事録化
    rec.status = 'processing';
    renderSegmentList();
    try {
      const data = await generateWithGemini(
        { apiKey, audioFile: named, materialFiles: [], transcript: '' },
        (m) => log(`[part${nn}] ${m}`)
      );
      rec.data = data;
      rec.status = 'done';
      if (!longrec.eventLogged && typeof logToolEvent === 'function') {
        logToolEvent('minutes-create');
        longrec.eventLogged = true;
      }
      renderMergedProgress();
    } catch (e) {
      console.error(e);
      rec.status = 'error';
      rec.err = e.message;
      log(t('lr-seg-fail', { n: nn, msg: e.message }));
    }
    renderSegmentList();
  });
}

// 途中経過をその都度、結合して描画（翻訳はかけず会議の言語のまま）。
function renderMergedProgress() {
  const merged = mergeSegments(longrec.segments);
  if (!merged) return;
  state.lastData = merged;
  state.translatedByLang = { [detectContentLang(merged)]: merged };
  $('output-section').style.display = 'block';
  mountMinutes($('minutes-output'), merged, state.style);
}

// 録音停止後の最終処理: 結合結果を確定し、UI 言語に合わせて表示。
function finalizeLongRec() {
  const merged = mergeSegments(longrec.segments);
  const doneCount = longrec.segments.filter(s => s && s.status === 'done').length;
  const errCount = longrec.segments.filter(s => s && s.status === 'error').length;

  if (!merged) {
    showStatus(t('lr-none-done'));
    return;
  }
  state.lastData = merged;
  state.translatedByLang = { [detectContentLang(merged)]: merged };
  renderOutput(); // UI 言語に合わせて表示（必要なら翻訳）
  showStatus(errCount
    ? t('lr-done-with-err', { done: doneCount, err: errCount })
    : t('lr-all-done', { n: doneCount }));
}

// セグメントの進捗リストを描画。
function renderSegmentList() {
  const box = $('longrec-segments');
  if (!box) return;
  const segs = longrec.segments.filter(Boolean);
  if (!segs.length) {
    box.innerHTML = `<p class="lr-seg-empty">${t('lr-waiting')}</p>`;
    return;
  }
  const icon = { saving: '💾', processing: '⏳', done: '✅', error: '⚠️' };
  box.innerHTML = segs.map(s => {
    const label = segmentLabel(s);
    const st = t('lr-status-' + s.status);
    const detail = s.status === 'error' && s.err ? ` <span class="lr-seg-err">(${escapeHtml(s.err)})</span>` : '';
    return `<div class="lr-seg lr-seg-${s.status}">
      <span class="lr-seg-ico">${icon[s.status] || '•'}</span>
      <span class="lr-seg-name">${t('lr-seg-name', { n: s.index + 1, label })}</span>
      <span class="lr-seg-status">${st}${detail}</span>
    </div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    updateSetupStrip();
  };
  input.addEventListener('change', persist);
  input.addEventListener('input', updateSetupStrip);
  remember.addEventListener('change', persist);
}

// 現在の言語で表示すべき議事録データ (翻訳済みがあればそれ、なければ元データ)
function currentData() {
  return state.translatedByLang[getLang()] || state.lastData;
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
      mountMinutes($('minutes-output'), currentData(), state.style);
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
    // 翻訳キャッシュをリセットし、「中身の言語」を判定して元データを登録
    // (UI 言語と中身の言語は異なる。例: UI=英語 でも会議は日本語)
    state.translatedByLang = { [detectContentLang(data)]: data };
    showStatus(t('st-done'));
    // アナリティクス: 議事録作成イベントを記録 (page = /_event/minutes-create)
    if (typeof logToolEvent === 'function') logToolEvent('minutes-create');
    renderOutput(); // 現在の UI 言語に合わせて表示 (必要なら翻訳)
  } catch (err) {
    console.error(err);
    log('Error: ' + err.message);
    showStatus('❌ ' + err.message);
  } finally {
    btn.disabled = false;
  }
}

// 議事録データの「中身の言語」を判定 (かな→ja, 漢字のみ→zh, それ以外→en)
function detectContentLang(data) {
  const s = JSON.stringify(data || {});
  if (/[぀-ヿ]/.test(s)) return 'ja';  // ひらがな/カタカナ
  if (/[一-鿿]/.test(s)) return 'zh';  // 漢字のみ
  return 'en';
}

function renderOutput() {
  $('output-section').style.display = 'block';
  renderMinutesForCurrentLang(); // 現在の UI 言語で表示 (未翻訳かつキーがあれば翻訳)
  $('output-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- 言語切替時の議事録の翻訳 ---------- */
// 現在の言語に合わせて議事録を表示する。未翻訳かつ Gemini キーがあれば翻訳する。
async function renderMinutesForCurrentLang() {
  if (!state.lastData) return;
  const lang = getLang();

  // キャッシュ済み (生成時の言語 or 既に翻訳済み) ならそのまま描画
  if (state.translatedByLang[lang]) {
    mountMinutes($('minutes-output'), state.translatedByLang[lang], state.style);
    return;
  }

  const apiKey = $('apikey-input').value.trim();
  if (!apiKey) {
    // キー無し: 見出しだけ翻訳 (中身は元のまま)
    mountMinutes($('minutes-output'), state.lastData, state.style);
    log(t('tl-needkey'));
    return;
  }

  // Gemini で内容を翻訳
  const langLabel = t('tl-lang-' + lang);
  if (state.translating) return;
  state.translating = true;
  showStatus(t('tl-translating', { lang: langLabel }));
  // まず見出しだけ即時反映 (体感を良く)
  mountMinutes($('minutes-output'), state.lastData, state.style);
  try {
    const translated = await translateMinutes(apiKey, state.lastData, lang);
    state.translatedByLang[lang] = translated;
    if (getLang() === lang) { // 翻訳中にさらに切替えられていなければ反映
      mountMinutes($('minutes-output'), translated, state.style);
      showStatus(t('tl-done', { lang: langLabel }));
    }
  } catch (err) {
    console.error(err);
    showStatus('❌ ' + err.message);
  } finally {
    state.translating = false;
  }
}

/* ---------- 出力アクション ---------- */
function setupOutputActions() {
  $('copy-btn').addEventListener('click', async () => {
    if (!state.lastData) return;
    try {
      await navigator.clipboard.writeText(minutesToText(currentData()));
      $('copy-btn').textContent = t('btn-copied');
      setTimeout(() => { $('copy-btn').textContent = t('btn-copy'); }, 1800);
    } catch (e) { alert(t('al-copy-fail')); }
  });

  $('print-btn').addEventListener('click', () => window.print());

  $('html-btn').addEventListener('click', () => {
    if (!state.lastData) return;
    const node = $('minutes-output').cloneNode(true);
    // マインドマップの SVG もクローンに含まれるのでそのまま使える
    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<title>${(currentData().meta?.title) || '議事録'}</title>
<style>${MINUTES_INLINE_CSS}</style></head>
<body><div class="minutes-output ${state.style === 'mindmap' ? 'style-mindmap' : 'style-figure'}">${node.innerHTML}</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `議事録_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
  });
}

// HTML 保存用のインライン CSS（アイコンなし・A4 印刷を意識した書面デザイン）
const MINUTES_INLINE_CSS = `
:root{--g:#27ae60;--b:#3498db;--o:#e67e22;--s:#34495e;--c:#2c3e50;--l:#ecf0f1;--d:#95a5a6}
*{box-sizing:border-box}
body{font-family:'Noto Sans JP','Yu Gothic',sans-serif;background:#f4f6f8;margin:0;padding:24px;color:var(--c)}
.minutes-output{max-width:820px;margin:0 auto;background:#fff;border-radius:14px;padding:48px 52px;box-shadow:0 2px 12px rgba(0,0,0,.1);font-size:15px;line-height:1.7}
.mn-header{text-align:center;margin:0 0 30px;border-bottom:2px solid var(--c);padding-bottom:20px}
.mn-title{font-size:1.7rem;font-weight:700;margin:0 0 12px;letter-spacing:.02em}
.mn-meta{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 20px;font-size:.85rem;color:var(--s)}
.mn-meta-tag{display:inline-flex;align-items:baseline;gap:6px}
.mn-meta-tag-label{font-size:.72rem;color:var(--d);font-weight:700}
.mn-section{margin:0 0 26px}
.mn-section-head{display:flex;align-items:center;gap:10px;font-size:1.08rem;font-weight:700;color:var(--c);margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid var(--l)}
.mn-sec-bar{width:5px;height:1.05em;border-radius:3px;background:var(--s);flex-shrink:0}
.mn-sec-count{font-size:.82rem;font-weight:500;color:var(--d)}
.mn-sec-decisions .mn-sec-bar{background:var(--g)}.mn-sec-todos .mn-sec-bar{background:var(--b)}
.mn-sec-issues .mn-sec-bar{background:var(--o)}.mn-sec-discussions .mn-sec-bar{background:var(--s)}
.mn-sec-summary .mn-sec-bar{background:var(--c)}
.mn-summary{margin:0;color:var(--s);line-height:1.9}
.mn-item{display:flex;gap:12px;align-items:baseline;padding:9px 0;border-bottom:1px dotted var(--l)}
.mn-item:last-child{border-bottom:none}
.mn-item-num{flex-shrink:0;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.74rem;font-weight:700;color:#fff;background:var(--s)}
.mn-sec-decisions .mn-item-num{background:var(--g)}.mn-sec-todos .mn-item-num{background:var(--b)}.mn-sec-issues .mn-item-num{background:var(--o)}
.mn-item-body{flex:1;min-width:0}.mn-item-text{margin:0;line-height:1.7}
.mn-item-meta{margin:4px 0 0;font-size:.8rem;color:var(--s);display:flex;flex-wrap:wrap;gap:3px 16px}
.mn-topic{margin:0 0 12px;padding-left:12px;border-left:2px solid var(--l)}
.mn-topic-title{font-weight:600;color:var(--c);margin-bottom:4px}
.mn-topic-speaker{font-size:.78rem;font-weight:500;color:var(--d);margin-left:8px}
.mn-topic ul{margin:0;padding-left:1.4em;color:var(--s);line-height:1.75}.mn-topic li{margin-bottom:2px}
.mn-empty{color:var(--d);font-size:.9rem;margin:0}
.mn-mm-meta{text-align:center;color:var(--s);font-size:.9rem;margin-bottom:12px}
.mn-mindmap-wrap{overflow-x:auto;text-align:center}.mn-mindmap-wrap svg{max-width:100%;height:auto}
.mn-footnote{margin-top:30px;padding-top:14px;border-top:1px solid var(--l);font-size:.78rem;color:var(--d);text-align:center}
@page{size:A4;margin:18mm 16mm}
@media print{
 body{background:#fff;padding:0}
 .minutes-output{max-width:none;box-shadow:none;border-radius:0;padding:0;font-size:10.6pt;line-height:1.55;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 .mn-title{font-size:16pt}.mn-section-head{font-size:12pt}.mn-section{margin-bottom:18px}
 .mn-section,.mn-item,.mn-topic{break-inside:avoid;page-break-inside:avoid}
 .mn-header,.mn-section-head{break-after:avoid;page-break-after:avoid}
 .mn-footnote{break-before:avoid}
}
`;

/* ---------- 言語適用 ---------- */
// JS が管理する動的テキスト (data-lang-key 非対象) を現在の言語で再描画する。
function applyDynamicLang() {
  applyAudioTitle();
  applyMaterialTitle();
  $('copy-btn').textContent = t('btn-copy');
  // 録音ボタンのラベル（アイコン＋テキスト構造なので setRecBtn で更新）
  setRecBtn(recorder.isRecording || segRecorder.isRecording);
  if (!tester.isActive) $('mic-test-btn').textContent = t('mic-test');
  populateMics();
  updateSummary();
  updateSetupStrip();
  updateFolderStatus();
  if (longrec.active || longrec.segments.length) renderSegmentList();
  if (state.lastData) {
    renderMinutesForCurrentLang();
  }
}

/* ---------- init ---------- */
function init() {
  setLang(detectLang());
  setupAudioInput();
  setupRecord();
  setupLongRec();
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
