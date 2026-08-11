/* ============================================================
   app.js — AI議事録 自動作成 オーケストレーション
   入力 (音声 / 資料 / 文字起こし) → 処理 (Gemini or ブラウザ) → 描画 (4 スタイル)
   ============================================================ */
import { generateWithGemini, translateMinutes, generateVisualImage } from './lib/gemini.js';
import { transcribeAudio, structureHeuristically } from './lib/transcribe.js';
import { mountMinutes, minutesToText } from './lib/render.js';
import { t, setLang, getLang } from './lib/i18n.js';
import { MicRecorder, SegmentedMicRecorder, MicTester, listMicrophones, onDeviceChange, formatDuration } from './lib/recorder.js';
import { SegmentSaver } from './lib/saver.js';
import { mergeSegments, segmentLabel } from './lib/merge.js';
import { readTranscriptFile } from './lib/transcript-files.js';

const $ = (id) => document.getElementById(id);
const APIKEY_STORE = 'ai-minutes-gemini-key';

// HTML 保存時の埋め込み用エスケープ
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  visual: null,           // 生成済みビジュアル資料 { dataUrl, mimeType }
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
  updateMicValue();
}

// 選択中のマイク名を、設定行の現在値と状態チップに反映する。
function updateMicValue() {
  const sel = $('mic-select');
  if (!sel) return;
  const label = (sel.selectedOptions[0] && sel.selectedOptions[0].textContent) || t('mic-default');
  setText('v-mic', label);
  setText('chip-mic-val', label);
}

/* ---------- レベルメーター (マイクテスト / 録音中で共用) ---------- */
const MIC_METER_SEGMENTS = 24;

// セグメント（LED 風の目盛り）を一度だけ生成する。
function buildMeter(el) {
  if (!el || el._built) return;
  for (let i = 0; i < MIC_METER_SEGMENTS; i++) {
    const seg = document.createElement('span');
    seg.className = 'mic-seg';
    el.appendChild(seg);
  }
  el._built = true;
}

// 入力レベル(0..1)に応じてセグメントを点灯。
function setMeter(el, level) {
  if (!el || !el._built) return;
  const segs = el.children;
  const on = Math.round(Math.max(0, Math.min(1, level)) * segs.length);
  for (let i = 0; i < segs.length; i++) {
    segs[i].classList.toggle('on', i < on);
  }
}

const buildMicMeter = () => buildMeter($('mic-meter-scale'));
const setMicMeterLevel = (level) => setMeter($('mic-meter-scale'), level);

/* ---------- 録音中の入力レベル ----------
   録音そのものは MediaRecorder が行う。ここでは同じ MediaStream に
   AnalyserNode をぶら下げて「今マイクが拾えているか」だけを表示する。
   取得できない環境ではメーター無しで録音を続ける（失敗させない）。 */
let recMeter = null;
function startRecLevel(stream) {
  stopRecLevel();
  const el = $('rec-level');
  if (!el || !stream) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    buildMeter(el);
    el.hidden = false;
    let raf = 0;
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      setMeter(el, Math.min(1, peak * 2.2));
      raf = requestAnimationFrame(loop);
    };
    loop();
    recMeter = { stop() { cancelAnimationFrame(raf); ctx.close().catch(() => {}); } };
  } catch (e) {
    el.hidden = true; // メーターは諦めて録音は続行
  }
}
function stopRecLevel() {
  if (recMeter) { recMeter.stop(); recMeter = null; }
  const el = $('rec-level');
  if (el) { el.hidden = true; setMeter(el, 0); }
}

function setupMicTest() {
  const btn = $('mic-test-btn');
  buildMicMeter();
  const sel = $('mic-select');
  if (sel) sel.addEventListener('change', () => {
    updateMicValue();
    if (tester.isActive) stopMicTest(); // 別のマイクに切り替えたらテストは仕切り直す
  });
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

/* ---------- 入力: 文字起こしファイル (.txt/.vtt/.srt/.docx) ---------- */
function setupTranscriptFile() {
  const input = $('transcript-file');
  const status = $('transcript-file-status');
  if (!input) return;
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (status) status.textContent = t('tf-reading', { name: file.name });
    try {
      const text = await readTranscriptFile(file);
      if (!text || !text.trim()) throw new Error(t('tf-empty'));
      const ta = $('transcript-input');
      // 既存テキストがあれば追記、無ければ差し込み
      ta.value = ta.value.trim() ? (ta.value.trim() + '\n' + text) : text;
      if (status) status.textContent = t('tf-loaded', { name: file.name, n: text.length });
      updateSummary();
    } catch (err) {
      console.error(err);
      if (status) status.textContent = '⚠️ ' + t('tf-error', { name: file.name });
    } finally {
      input.value = ''; // 同じファイルを再選択できるように
    }
  });
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

// 録音ボタンの見た目を切替。待機時は丸（録音）、録音中は四角（停止）。
// 形は CSS 側 (.rec-btn.recording) が担当し、ここでは状態とラベルだけ扱う。
function setRecBtn(recording) {
  const btn = $('record-btn'), cap = $('rec-caption'), timer = $('rec-timer');
  if (btn) {
    btn.classList.toggle('recording', recording);
    btn.setAttribute('aria-label', recording ? t('rec-hero-stop') : t('rec-hero-start'));
  }
  if (cap) cap.textContent = recording ? t('rec-hero-stop-hint') : t('rec-hero-hint');
  if (timer) {
    timer.classList.toggle('on', recording);
    if (!recording) timer.textContent = formatDuration(0);
  }
  if (!recording) stopRecLevel();
  updateSetupStrip();
}

// 録音経過時間（大きく表示する方）。
function setRecTime(sec) {
  const timer = $('rec-timer');
  if (timer) timer.textContent = formatDuration(sec);
}

/* ---------- 簡易版（ブラウザ完結）: 通常録音 → 停止で自動作成 ---------- */
async function startSimpleRec(btn, status) {
  if (tester.isActive) stopMicTest();
  try {
    await recorder.start((sec) => {
      lastTickSec = sec;
      setRecTime(sec);
      status.textContent = t('rec-recording-plain');
    }, getSelectedDeviceId());
    setRecBtn(true);
    startRecLevel(recorder.stream);
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

  // 「キーを設定する →」→ キーの行を開いて入力欄にフォーカス
  const sk = $('setup-open-key');
  if (sk) sk.addEventListener('click', () => openRow('key', true));

  // 分割間隔の変更を行の現在値に反映
  const iv = $('longrec-interval');
  if (iv) iv.addEventListener('change', updateIntervalValue);
  updateIntervalValue();

  // 処理方法の変更でセットアップ帯・チップを出し分け
  document.querySelectorAll('input[name="mode"]').forEach(r =>
    r.addEventListener('change', updateSetupStrip));

  updateSetupStrip();
}

// 高精度版かつ API キー未入力のときは、実行ボタンを無効にして
// 「次に何をすればいいか」だけを 1 行で示す（押せるものは必ず動く状態にする）。
function updateSetupStrip() {
  const input = $('apikey-input');
  if (!input) return;
  const gemini = getMode() === 'gemini';
  const needKey = gemini && !input.value.trim();

  const strip = $('setup-strip');
  if (strip) strip.classList.toggle('hidden', !needKey || recorder.isRecording || segRecorder.isRecording);

  const rec = $('record-btn');
  if (rec) rec.disabled = needKey && !recorder.isRecording && !segRecorder.isRecording;
  const gen = $('generate-btn');
  if (gen) gen.disabled = needKey;

  // 状態チップ
  setText('chip-mode-val', gemini ? t('mode-gemini') : t('mode-simple'));
  setText('v-mode', gemini ? t('mode-gemini-full') : t('mode-simple-full'));
  const keyChip = $('chip-key');
  if (keyChip) {
    keyChip.classList.toggle('warn', needKey);
    keyChip.hidden = !gemini;
  }
  setText('chip-key-val', input.value.trim() ? t('key-set') : t('key-unset'));

  // 設定行の現在値
  const keyVal = $('v-key');
  if (keyVal) {
    keyVal.textContent = input.value.trim() ? t('key-set') : t('key-unset');
    const wrap = keyVal.parentElement;
    if (wrap) {
      wrap.classList.toggle('need', needKey);
      wrap.classList.toggle('ok', !!input.value.trim());
    }
  }
}

const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };

// 分割間隔（長時間モード）の現在値表示。
function updateIntervalValue() {
  const sel = $('longrec-interval');
  if (!sel) return;
  setText('v-long', t('lr-interval-value', { min: sel.value }));
}

// 保存先フォルダの表示を更新。
function updateFolderStatus() {
  const el = $('folder-status');
  const name = longrec.saver.folderName || longrec.saver.rememberedName;
  const unsupported = !longrec.saver.supported;
  if (el) {
    el.textContent = unsupported ? t('lr-folder-unsupported')
      : (name ? t('lr-folder-current', { name }) : t('lr-folder-none'));
  }
  setText('v-folder', unsupported ? t('lr-folder-download') : (name || t('lr-folder-none')));
}

/* ---------- 注意書き（普段は1行・初回だけ自動で開く） ---------- */
const NOTICE_SEEN = 'ai-minutes-notice-seen';
function setupNotice() {
  const btn = $('notice-toggle'), body = $('notice-body');
  if (!btn || !body) return;

  const apply = (open) => {
    body.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? t('notice-close') : t('notice-more');
  };
  btn.addEventListener('click', () => apply(!body.classList.contains('open')));

  let seen = false;
  try { seen = localStorage.getItem(NOTICE_SEEN) === '1'; } catch (e) { seen = false; }
  apply(!seen); // 初回訪問時だけ開いた状態で見せる
  try { localStorage.setItem(NOTICE_SEEN, '1'); } catch (e) { /* noop */ }
}

/* ---------- 入力タブ（録音する / ファイルから作る） ---------- */
function setupInputTabs() {
  const tabs = $('input-tabs');
  if (!tabs) return;
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    tabs.querySelectorAll('[data-tab]').forEach(b =>
      b.setAttribute('aria-selected', String(b === btn)));
    $('pane-rec').classList.toggle('active', btn.dataset.tab === 'rec');
    $('pane-file').classList.toggle('active', btn.dataset.tab === 'file');
  });
}

/* ---------- 設定リスト（1行ずつ開く・現在値は常に見える） ---------- */
function setupRows() {
  document.querySelectorAll('.row-head').forEach(head => {
    head.addEventListener('click', () => {
      const row = head.closest('.row');
      const willOpen = !row.classList.contains('open');
      closeAllRows();
      if (willOpen) {
        row.classList.add('open');
        head.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // 状態チップ → 対応する設定行へ（表示がそのまま近道になる）
  document.querySelectorAll('.chip[data-open]').forEach(chip => {
    chip.addEventListener('click', () => openRow(chip.dataset.open));
  });
}

function closeAllRows() {
  document.querySelectorAll('.row').forEach(r => {
    r.classList.remove('open');
    const h = r.querySelector('.row-head');
    if (h) h.setAttribute('aria-expanded', 'false');
  });
}

// 指定の設定行を開いてスクロールする。focusInput=true ならキー入力欄にフォーカス。
function openRow(name, focusInput) {
  const row = document.querySelector('.row[data-row="' + name + '"]');
  if (!row) return;
  closeAllRows();
  row.classList.add('open');
  const head = row.querySelector('.row-head');
  if (head) head.setAttribute('aria-expanded', 'true');
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (focusInput && name === 'key') {
    const key = $('apikey-input');
    if (key) setTimeout(() => key.focus(), 260);
  }
}

/* ---------- 進捗ログの開閉 ---------- */
function setupLogToggle() {
  const btn = $('log-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const on = $('log').classList.toggle('open');
    btn.textContent = on ? t('log-hide') : t('log-show');
  });
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
    openRow('key', true);
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
        setRecTime(sec);
        status.textContent = t('lr-recording-part', { part: longrec.segments.length + 1 });
      },
      onSegment: (seg) => onSegmentReady(seg, apiKey),
      deviceId: getSelectedDeviceId(),
      segmentMs: longrec.intervalMin * 60 * 1000,
    });
    setRecBtn(true);
    startRecLevel(segRecorder.stream);
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
  if (state.visual) resetVisual(); // 内容が更新されたので前回の画像は破棄
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

/* ---------- 表示スタイル切替 ----------
   figure / timeline / matrix は同じ議事録の見せ方を変えるだけ。
   visual だけは AI 画像生成を伴うので、切り替えても生成はせず
   （課金・待ち時間が発生するため）操作パネルを出すだけにする。 */
function setupStyleToggle() {
  $('style-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.style-btn');
    if (!btn) return;
    document.querySelectorAll('.style-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    applyStyle(btn.dataset.style);
  });
}

function applyStyle(style) {
  const visual = style === 'visual';
  $('visual-panel').classList.toggle('hidden', !visual);
  $('minutes-output').classList.toggle('hidden', visual);
  if (visual) return;         // 議事録の描画スタイルは変えない
  state.style = style;
  if (state.lastData) mountMinutes($('minutes-output'), currentData(), state.style);
}

/* ---------- 共有・保存メニュー ---------- */
function setupShareMenu() {
  const btn = $('share-btn'), pop = $('share-pop');
  if (!btn || !pop) return;
  const close = () => { pop.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const on = pop.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(on));
  });
  pop.addEventListener('click', () => close());  // 項目を選んだら閉じる
  document.addEventListener('click', close);
}

/* ---------- ビジュアル資料 (Gemini 画像モデル = 通称ナノバナナ) ---------- */
// 議事録の要点から 1 枚絵を作る。あくまで共有・表紙用の補助資料で、
// 正式な記録は議事録本体 (テキスト) 側という位置づけ。
function setupVisual() {
  $('visual-run').addEventListener('click', async () => {
    if (!state.lastData) return;
    const apiKey = $('apikey-input').value.trim();
    if (!apiKey) {
      $('visual-status').textContent = '❌ ' + t('al-need-key');
      openRow('key', true);
      return;
    }

    const runBtn = $('visual-run');
    runBtn.disabled = true;
    runBtn.textContent = t('vis-btn-running');
    $('visual-status').textContent = t('vis-generating');

    try {
      const img = await generateVisualImage({
        apiKey,
        data: currentData(),
        model: $('visual-model').value,
        kind: $('visual-kind').value,
        lang: getLang(),
      }, log);

      state.visual = {
        dataUrl: `data:${img.mimeType};base64,${img.base64}`,
        mimeType: img.mimeType,
      };
      showVisual();
      $('visual-status').textContent = t('vis-done');
      if (typeof logToolEvent === 'function') logToolEvent('minutes-visual');
    } catch (err) {
      console.error(err);
      log('Error: ' + err.message);
      $('visual-status').textContent = '❌ ' + err.message;
      statusEl.classList.add('show'); // API が返した詳細をログで追えるようにする
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = t('vis-btn-run');
    }
  });

  $('visual-download').addEventListener('click', () => {
    if (!state.visual) return;
    const ext = state.visual.mimeType.includes('jpeg') ? 'jpg' : 'png';
    const a = document.createElement('a');
    a.href = state.visual.dataUrl;
    a.download = `${minutesFileBase()}_visual.${ext}`;
    a.click();
  });
}

// 生成済み画像を表示する (言語切替後の再適用にも使う)
function showVisual() {
  const has = !!state.visual;
  $('visual-result').classList.toggle('hidden', !has);
  $('visual-actions').classList.toggle('hidden', !has);
  if (!has) return;
  const img = $('visual-img');
  img.src = state.visual.dataUrl;
  img.alt = t('vis-alt');
  $('visual-caption').textContent = t('vis-caption');
  $('visual-download').textContent = t('vis-btn-download');
}

// 新しい議事録ができたら、前回の画像は破棄する (内容が合わなくなるため)
function resetVisual() {
  state.visual = null;
  $('visual-status').textContent = '';
  showVisual();
  // ビジュアル資料タブを開いたまま新しい議事録ができたら、議事録の表示に戻す
  const visBtn = document.querySelector('.style-btn[data-style="visual"]');
  if (visBtn && visBtn.classList.contains('active')) {
    const target = document.querySelector('.style-btn[data-style="' + state.style + '"]');
    if (target) target.click();
  }
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
  // 進捗が画面外にならないよう、状況表示を見える位置へスクロール
  $('status').scrollIntoView({ behavior: 'smooth', block: 'center' });

  try {
    let data;
    if (mode === 'gemini') {
      const apiKey = $('apikey-input').value.trim();
      if (!apiKey) {
        showStatus('❌ ' + t('al-need-key'));
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
    resetVisual(); // 前回のビジュアル資料は内容が合わなくなるので破棄
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
  // 印刷/PDF 保存時の既定ファイル名を「日付_会議名」に (ブラウザは document.title を使う)
  try { document.title = minutesFileBase(); } catch (e) { /* noop */ }
  $('output-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 出力ファイル名のベース「YYMMDD_会議名」を作る。
// 日付は会議情報(meta.date)の年月日、無ければ本日。会議名は議事録タイトル。
function minutesFileBase() {
  const meta = (currentData() && currentData().meta) || {};
  const p2 = (n) => String(n).padStart(2, '0');
  let ymd = '';
  const m = String(meta.date || '').match(/(\d{4})[^\d]{1,2}(\d{1,2})[^\d]{1,2}(\d{1,2})/);
  if (m) {
    ymd = `${p2(Number(m[1]) % 100)}${p2(Number(m[2]))}${p2(Number(m[3]))}`;
  } else {
    const now = new Date();
    ymd = `${p2(now.getFullYear() % 100)}${p2(now.getMonth() + 1)}${p2(now.getDate())}`;
  }
  const name = String(meta.title || t('mn-default-title'))
    .replace(/[\\/:*?"<>|]/g, '')  // ファイル名に使えない文字を除去
    .replace(/\s+/g, '')
    .trim()
    .slice(0, 80) || t('mn-default-title');
  return `${ymd}_${name}`;
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
    // ビジュアル資料があれば data URL のまま埋め込む (1 ファイルで完結させる)
    const visual = state.visual
      ? `<figure class="mn-visual"><img src="${state.visual.dataUrl}" alt="${esc(t('vis-alt'))}">
<figcaption>${esc(t('vis-caption'))}</figcaption></figure>` : '';
    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<title>${esc((currentData().meta?.title) || '議事録')}</title>
<style>${MINUTES_INLINE_CSS}</style></head>
<body><div class="minutes-output style-${state.style}">${node.innerHTML}${visual}</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${minutesFileBase()}.html`;
    a.click();
  });
}

// HTML 保存用のインライン CSS（アイコンなし・A4 印刷を意識した書面デザイン）
const MINUTES_INLINE_CSS = `
:root{--g:#27ae60;--b:#3498db;--o:#e67e22;--s:#34495e;--c:#2c3e50;--l:#ecf0f1;--d:#95a5a6}
*{box-sizing:border-box}
body{font-family:'Noto Sans JP','Yu Gothic',sans-serif;background:#f4f6f8;margin:0;padding:24px;color:var(--c)}
.minutes-output{max-width:820px;margin:0 auto;background:#fff;border-radius:14px;padding:40px 46px;box-shadow:0 2px 12px rgba(0,0,0,.1);font-size:15px;line-height:1.5}
.mn-header{text-align:center;margin:0 0 18px;border-bottom:2px solid var(--c);padding-bottom:14px}
.mn-title{font-size:1.6rem;font-weight:700;margin:0 0 8px;letter-spacing:.02em}
.mn-meta{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 20px;font-size:.85rem;color:var(--s)}
.mn-meta-tag{display:inline-flex;align-items:baseline;gap:6px}
.mn-meta-tag-label{font-size:.72rem;color:var(--d);font-weight:700}
.mn-section{margin:0 0 16px}
.mn-section-head{display:flex;align-items:center;gap:10px;font-size:1.05rem;font-weight:700;color:var(--c);margin:0 0 6px;padding-bottom:5px;border-bottom:1px solid var(--l)}
.mn-sec-bar{width:5px;height:1.05em;border-radius:3px;background:var(--s);flex-shrink:0}
.mn-sec-count{font-size:.82rem;font-weight:500;color:var(--d)}
.mn-sec-decisions .mn-sec-bar{background:var(--g)}.mn-sec-todos .mn-sec-bar{background:var(--b)}
.mn-sec-issues .mn-sec-bar{background:var(--o)}.mn-sec-discussions .mn-sec-bar{background:var(--s)}
.mn-sec-summary .mn-sec-bar{background:var(--c)}
.mn-summary{margin:0;color:var(--s);line-height:1.55}
.mn-item{display:flex;gap:11px;align-items:baseline;padding:5px 0;border-bottom:1px dotted var(--l)}
.mn-item:last-child{border-bottom:none}
.mn-item-num{flex-shrink:0;width:21px;height:21px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:#fff;background:var(--s)}
.mn-sec-decisions .mn-item-num{background:var(--g)}.mn-sec-todos .mn-item-num{background:var(--b)}.mn-sec-issues .mn-item-num{background:var(--o)}
.mn-item-body{flex:1;min-width:0}.mn-item-text{margin:0;line-height:1.5}
.mn-item-meta{margin:2px 0 0;font-size:.8rem;color:var(--s);display:flex;flex-wrap:wrap;gap:2px 16px}
.mn-topic{margin:0 0 8px;padding-left:12px;border-left:2px solid var(--l)}
.mn-topic-title{font-weight:600;color:var(--c);margin-bottom:2px}
.mn-topic-speaker{font-size:.78rem;font-weight:500;color:var(--d);margin-left:8px}
.mn-topic ul{margin:0;padding-left:1.4em;color:var(--s);line-height:1.5}.mn-topic li{margin-bottom:1px}
.mn-empty{color:var(--d);font-size:.9rem;margin:0}
.mn-footnote{margin-top:18px;padding-top:12px;border-top:1px solid var(--l);font-size:.78rem;color:var(--d);text-align:center}
.mn-tl{list-style:none;margin:0 0 22px;padding:0 0 0 8px}
.mn-tl-step{position:relative;display:flex;gap:14px;padding:0 0 16px}
.mn-tl-step::before{content:'';position:absolute;left:12px;top:26px;bottom:0;width:2px;background:var(--l)}
.mn-tl-step:last-child{padding-bottom:0}.mn-tl-step:last-child::before{display:none}
.mn-tl-dot{flex-shrink:0;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:700;color:#fff;background:var(--s);position:relative;z-index:1}
.mn-tl-body{flex:1;min-width:0;padding-top:2px}
.mn-tl-topic{font-weight:600;color:var(--c)}
.mn-tl-speaker{font-size:.78rem;font-weight:500;color:var(--d);margin-left:8px}
.mn-tl-points{margin:4px 0 0;padding-left:1.3em;color:var(--s);line-height:1.55}
.mn-tl-summary{margin:0 0 18px}
.mn-tl-conclusion{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
.mn-tl-card{border:1px solid var(--l);border-radius:10px;padding:12px 14px;border-top:3px solid var(--s)}
.mn-tl-card-decisions{border-top-color:var(--g)}.mn-tl-card-todos{border-top-color:var(--b)}
.mn-tl-card-head{font-weight:700;font-size:.95rem;color:var(--c);margin-bottom:6px;display:flex;align-items:baseline;gap:8px}
.mn-tl-card-list{margin:0;padding-left:1.2em;line-height:1.5}.mn-tl-card-list li{margin-bottom:4px}
.mn-tl-tag{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:10px;font-size:.74rem;background:var(--l);color:var(--s)}
.mn-tl-tag-due{background:#fdf0e3;color:var(--o)}
.mn-mx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-bottom:20px}
.mn-mx-card{border:1px solid var(--l);border-radius:10px;padding:12px 14px;border-left:4px solid var(--b)}
.mn-mx-card-none{border-left-color:var(--d)}
.mn-mx-head{display:flex;align-items:baseline;gap:8px;margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid var(--l)}
.mn-mx-who{font-weight:700;color:var(--c)}
.mn-mx-list{list-style:none;margin:0;padding:0}
.mn-mx-row{padding:5px 0;border-bottom:1px dotted var(--l);line-height:1.45}
.mn-mx-row:last-child{border-bottom:none}
.mn-mx-text{display:block}
.mn-mx-due{display:inline-block;margin-top:3px;font-size:.76rem;color:var(--o)}
.mn-visual{margin:22px 0 0;text-align:center}
.mn-visual img{max-width:100%;height:auto;border-radius:10px}
.mn-visual figcaption{margin-top:8px;font-size:.78rem;color:var(--d)}
@page{size:A4;margin:22mm 18mm}
@media print{
 html,body{height:auto}
 body{background:#fff;padding:0}
 .minutes-output{max-width:none;box-shadow:none;border-radius:0;padding:0 6mm;margin:0;font-size:10.4pt;line-height:1.4;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 .mn-title{font-size:15pt}.mn-section-head{font-size:11.5pt;margin-bottom:5px;padding-bottom:4px}.mn-section{margin-bottom:12px}
 .mn-header{margin-bottom:14px;padding-bottom:12px}.mn-item{padding:4px 0}
 .mn-summary,.mn-item-text,.mn-topic ul{line-height:1.45}
 .minutes-output>*:last-child{margin-bottom:0}
 .mn-footnote{margin-top:12px}
 .mn-section,.mn-item,.mn-topic,.mn-tl-step,.mn-tl-card,.mn-mx-card{break-inside:avoid;page-break-inside:avoid}
 .mn-header,.mn-section-head{break-after:avoid;page-break-after:avoid}
 .mn-visual{break-before:page;page-break-before:always}
 .mn-visual img{max-height:245mm}
}
`;

/* ---------- 言語適用 ---------- */
// JS が管理する動的テキスト (data-lang-key 非対象) を現在の言語で再描画する。
function applyDynamicLang() {
  applyAudioTitle();
  applyMaterialTitle();
  $('copy-btn').textContent = t('btn-copy');
  // 録音ボタンのラベル・キャプションは setRecBtn で更新
  setRecBtn(recorder.isRecording || segRecorder.isRecording);
  if (!tester.isActive) $('mic-test-btn').textContent = t('mic-test');
  const logBtn = $('log-toggle');
  if (logBtn) logBtn.textContent = $('log').classList.contains('open') ? t('log-hide') : t('log-show');
  const noticeBtn = $('notice-toggle');
  if (noticeBtn) {
    noticeBtn.textContent = $('notice-body').classList.contains('open') ? t('notice-close') : t('notice-more');
  }
  populateMics();
  updateSummary();
  updateSetupStrip();
  updateIntervalValue();
  updateFolderStatus();
  if (longrec.active || longrec.segments.length) renderSegmentList();
  showVisual(); // 画像のキャプション・保存ボタンのラベルを現在の言語に
  if (state.lastData) {
    renderMinutesForCurrentLang();
  }
}

/* ---------- init ---------- */
function init() {
  setLang(detectLang());
  setupNotice();
  setupInputTabs();
  setupRows();
  setupLogToggle();
  setupShareMenu();
  setupAudioInput();
  setupTranscriptFile();
  setupRecord();
  setupLongRec();
  setupMicTest();
  populateMics();
  onDeviceChange(populateMics);
  setupMaterialInput();
  setupModeSwitch();
  setupApiKey();
  setupStyleToggle();
  setupVisual();
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
