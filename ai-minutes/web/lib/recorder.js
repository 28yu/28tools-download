/* ============================================================
   recorder.js — マイク録音 (録音 → 停止 → WAV 変換)
   - getUserMedia + MediaRecorder で端末マイクから録音
   - 録音データは「メモリ上の Blob」のみ。端末ストレージには保存しない
     (localStorage / IndexedDB / ファイル書き出し / 自動DL は一切しない)
   - 停止時に 16kHz mono WAV へ変換し File として返す
     (Gemini が受け付ける形式 & Whisper のデコード互換のため)
   - 停止時にマイクトラックを止め、録音インジケータを消す
   ============================================================ */
import { t } from './i18n.js';

/** deviceId 指定があれば exact 指定、なければ既定マイク。 */
function micConstraint(deviceId) {
  return deviceId ? { deviceId: { exact: deviceId } } : true;
}

/** 接続されている音声入力デバイス一覧。label は許可後にのみ取得できる。 */
export async function listMicrophones() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter(d => d.kind === 'audioinput')
    .map(d => ({ deviceId: d.deviceId, label: d.label }));
}

/** デバイスの抜き差しを監視 (cb を呼ぶ)。 */
export function onDeviceChange(cb) {
  if (navigator.mediaDevices && 'ondevicechange' in navigator.mediaDevices) {
    navigator.mediaDevices.addEventListener('devicechange', cb);
  }
}

/* ============================================================
   MicTester — マイク入力レベルのリアルタイム測定 (テスト用)
   AnalyserNode で RMS を算出し 0..1 を onLevel に流す。録音はしない。
   ============================================================ */
export class MicTester {
  constructor() { this.stream = null; this.ctx = null; this._raf = null; this._running = false; }

  get isActive() { return this._running; }

  async start(deviceId, onLevel) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(t('rec-err-unsupported'));
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraint(deviceId) });
    } catch (e) {
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw new Error(t('rec-err-denied'));
      if (e && (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError')) throw new Error(t('rec-err-nomic'));
      throw new Error(t('rec-err-generic'));
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    src.connect(this.analyser);
    const data = new Uint8Array(this.analyser.fftSize);
    this._running = true;
    const loop = () => {
      if (!this._running) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / data.length);
      onLevel(Math.min(1, rms * 2.8)); // 体感に合わせてスケール
      this._raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this._running = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this.stream) { this.stream.getTracks().forEach(tr => tr.stop()); this.stream = null; }
    if (this.ctx && this.ctx.close) { try { this.ctx.close(); } catch (e) {} }
    this.ctx = null;
  }
}

export class MicRecorder {
  constructor() {
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.startTime = 0;
    this._timer = null;
  }

  get isRecording() {
    return !!this.recorder && this.recorder.state === 'recording';
  }

  async start(onTick, deviceId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      throw new Error(t('rec-err-unsupported'));
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraint(deviceId) });
    } catch (e) {
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw new Error(t('rec-err-denied'));
      if (e && (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError')) throw new Error(t('rec-err-nomic'));
      throw new Error(t('rec-err-generic'));
    }

    this.chunks = [];
    // 端末ごとに対応形式が異なるため、利用可能なものを選ぶ (どれも最後は WAV へ変換)
    let mime = '';
    for (const m of ['audio/webm', 'audio/mp4', 'audio/ogg']) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) { mime = m; break; }
    }
    this.recorder = mime ? new MediaRecorder(this.stream, { mimeType: mime }) : new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.recorder.start();
    this.startTime = Date.now();
    if (onTick) {
      onTick(0);
      this._timer = setInterval(() => onTick(Math.floor((Date.now() - this.startTime) / 1000)), 500);
    }
  }

  /** 録音を停止し、16kHz mono WAV の File を返す。 */
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.recorder) { reject(new Error(t('rec-err-generic'))); return; }
      const recMime = this.recorder.mimeType || 'audio/webm';
      this.recorder.onstop = async () => {
        clearInterval(this._timer);
        const blob = new Blob(this.chunks, { type: recMime });
        this._releaseMic();
        try {
          const wavBlob = await blobToWav16k(blob);
          resolve(new File([wavBlob], `recording-${Date.now()}.wav`, { type: 'audio/wav' }));
        } catch (err) {
          reject(err);
        }
      };
      try { this.recorder.stop(); } catch (e) { reject(new Error(t('rec-err-generic'))); }
    });
  }

  /** 録音を破棄してマイクを解放 (保存しない)。 */
  cancel() {
    clearInterval(this._timer);
    if (this.recorder && this.recorder.state !== 'inactive') {
      try { this.recorder.onstop = null; this.recorder.stop(); } catch (e) {}
    }
    this.chunks = [];
    this._releaseMic();
  }

  _releaseMic() {
    if (this.stream) { this.stream.getTracks().forEach(tr => tr.stop()); this.stream = null; }
    this.recorder = null;
  }
}

/* ============================================================
   SegmentedMicRecorder — 長時間録音を一定間隔で自動分割
   - マイクは録音中ずっと開いたまま（セグメント間で解放しない）
   - segmentMs ごとに MediaRecorder を停止→即再開し、区切りの良い
     「単独で再生できる」WAV ファイルを 1 本ずつ確定する
   - 各セグメント確定時に onSegment({ file, index, startSec, durationSec, isFinal })
     を呼ぶ。呼び出し側はそれを保存・Gemini 処理へ回す
   - MicRecorder と異なり、停止まで録りっぱなしなので 1 時間の打合せでも
     10 分×6 本のように機械的に分割できる
   ============================================================ */
export class SegmentedMicRecorder {
  constructor() {
    this.stream = null;
    this.recorder = null;
    this.mime = '';
    this.segIndex = 0;
    this.startTime = 0;      // 録音全体の開始時刻
    this.segStartTime = 0;   // 現セグメントの開始時刻
    this._tick = null;
    this._seg = null;
    this._onSegment = null;
    this._stopping = false;
    this._q = Promise.resolve(); // レコーダー操作を直列化するキュー
  }

  get isRecording() { return !!this.stream; }

  /**
   * @param {Object} opts { onTick(sec), onSegment({file,index,startSec,durationSec,isFinal,error}), deviceId, segmentMs }
   */
  async start({ onTick, onSegment, deviceId, segmentMs } = {}) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      throw new Error(t('rec-err-unsupported'));
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraint(deviceId) });
    } catch (e) {
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw new Error(t('rec-err-denied'));
      if (e && (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError')) throw new Error(t('rec-err-nomic'));
      throw new Error(t('rec-err-generic'));
    }

    this._onSegment = onSegment || null;
    this._stopping = false;
    this.segIndex = 0;
    this.startTime = Date.now();
    this.mime = '';
    for (const m of ['audio/webm', 'audio/mp4', 'audio/ogg']) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) { this.mime = m; break; }
    }
    this._startSegmentRecorder();

    if (onTick) {
      onTick(0);
      this._tick = setInterval(() => onTick(Math.floor((Date.now() - this.startTime) / 1000)), 500);
    }
    const ms = Math.max(30000, segmentMs || 600000); // 最短 30 秒（既定 10 分）
    this._seg = setInterval(() => { this._rotate(); }, ms);
  }

  _startSegmentRecorder() {
    this.segStartTime = Date.now();
    const rec = this.mime
      ? new MediaRecorder(this.stream, { mimeType: this.mime })
      : new MediaRecorder(this.stream);
    const chunks = [];
    rec._chunks = chunks; // このレコーダー専用のバッファ（次セグメントと混ざらないよう束縛）
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.start();
    this.recorder = rec;
  }

  // 現セグメントを停止して確定し、WAV に変換して onSegment に流す。
  _finalizeCurrent(isFinal) {
    const rec = this.recorder;
    const idx = this.segIndex;
    const startSec = Math.floor((this.segStartTime - this.startTime) / 1000);
    const durationSec = Math.max(0, Math.floor((Date.now() - this.segStartTime) / 1000));
    return new Promise((resolve) => {
      if (!rec) { resolve(); return; }
      const recMime = rec.mimeType || this.mime || 'audio/webm';
      const chunks = rec._chunks || [];
      rec.onstop = async () => {
        // this.recorder は既に次セグメントを指している場合があるので、ここでは触らない
        // (誤って次のレコーダー参照を null にしないため)。解放は stop()/cancel() が担う。
        let file = null, error = null;
        try {
          const blob = new Blob(chunks, { type: recMime });
          const wavBlob = await blobToWav16k(blob);
          file = new File([wavBlob], `segment-${String(idx + 1).padStart(2, '0')}.wav`, { type: 'audio/wav' });
        } catch (err) {
          error = err;
        }
        if (this._onSegment) {
          try { this._onSegment({ file, index: idx, startSec, durationSec, isFinal, error }); } catch (e) { /* noop */ }
        }
        resolve();
      };
      try { rec.stop(); } catch (e) { this.recorder = null; resolve(); }
    });
  }

  // 区切り: 現セグメントを確定 → 次セグメントを即開始（隙間を最小化）。
  _rotate() {
    this._q = this._q.then(async () => {
      if (this._stopping || !this.stream) return;
      const finishing = this._finalizeCurrent(false);
      this.segIndex++;
      this._startSegmentRecorder();
      await finishing;
    });
    return this._q;
  }

  /** 録音を停止し、最後のセグメントを確定する。全 onSegment 完了後に解決。 */
  async stop() {
    this._stopping = true;
    if (this._tick) { clearInterval(this._tick); this._tick = null; }
    if (this._seg) { clearInterval(this._seg); this._seg = null; }
    this._q = this._q.then(() => this._finalizeCurrent(true));
    await this._q;
    this._releaseMic();
  }

  /** 録音を破棄してマイクを解放（確定処理をしない）。 */
  cancel() {
    this._stopping = true;
    if (this._tick) { clearInterval(this._tick); this._tick = null; }
    if (this._seg) { clearInterval(this._seg); this._seg = null; }
    if (this.recorder && this.recorder.state !== 'inactive') {
      try { this.recorder.onstop = null; this.recorder.stop(); } catch (e) {}
    }
    this.recorder = null;
    this._releaseMic();
  }

  _releaseMic() {
    if (this.stream) { this.stream.getTracks().forEach(tr => tr.stop()); this.stream = null; }
    this.recorder = null;
  }
}

/* ---------- 録音 Blob → 16kHz mono WAV ---------- */
async function blobToWav16k(blob) {
  const arrayBuf = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  let audioBuf;
  try {
    audioBuf = await ctx.decodeAudioData(arrayBuf);
  } finally {
    if (ctx.close) ctx.close();
  }
  const samples = mixDownResample(audioBuf, 16000);
  return encodeWav(samples, 16000);
}

function mixDownResample(audioBuf, targetRate) {
  const chs = audioBuf.numberOfChannels;
  const len = audioBuf.length;
  const mono = new Float32Array(len);
  for (let c = 0; c < chs; c++) {
    const d = audioBuf.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += d[i] / chs;
  }
  if (audioBuf.sampleRate === targetRate) return mono;
  const ratio = audioBuf.sampleRate / targetRate;
  const outLen = Math.floor(len / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) out[i] = mono[Math.floor(i * ratio)];
  return out;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);            // PCM
  view.setUint16(22, 1, true);            // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);            // block align
  view.setUint16(34, 16, true);           // bits/sample
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    off += 2;
  }
  return new Blob([view], { type: 'audio/wav' });
}

/** 秒 → mm:ss */
export function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
