/* ============================================================
   transcribe.js — 簡易版 (ブラウザ完結) の文字起こし & 構造化
   - 音声: Whisper (Transformers.js) でブラウザ内文字起こし
   - 構造化: LLM を使わずキーワードヒューリスティクスで分類
     → 完全無料・送信なしだが精度は控えめ ("簡易版" と明示)
   ============================================================ */
import { t } from './i18n.js';

// Transformers.js (ESM) を CDN から動的 import。初回のみモデルを DL。
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2';

// 日本語は base でも重い。速度優先で base、精度が要るなら small に変更可。
const ASR_MODEL = 'onnx-community/whisper-base';

let _pipelinePromise = null;

async function getPipeline(onProgress) {
  if (_pipelinePromise) return _pipelinePromise;
  _pipelinePromise = (async () => {
    const { pipeline, env } = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
    // リモートモデルのみ使用 (ローカルパス探索を無効化)
    env.allowLocalModels = false;
    const asr = await pipeline('automatic-speech-recognition', ASR_MODEL, {
      progress_callback: (p) => {
        if (p.status === 'progress' && p.file && typeof p.progress === 'number') {
          onProgress(t('tr-model', { file: p.file, pct: p.progress.toFixed(0) }), p.progress);
        }
      },
    });
    return asr;
  })();
  return _pipelinePromise;
}

// 音声ファイル → Float32Array (16kHz mono) へデコード
async function decodeAudio(file) {
  const arrayBuf = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate: 16000 });
  const audioBuf = await ctx.decodeAudioData(arrayBuf);
  let data = audioBuf.getChannelData(0);
  // 16kHz でない場合の簡易リサンプリング
  if (audioBuf.sampleRate !== 16000) {
    const ratio = audioBuf.sampleRate / 16000;
    const len = Math.floor(data.length / ratio);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) out[i] = data[Math.floor(i * ratio)];
    data = out;
  }
  ctx.close && ctx.close();
  return data;
}

/**
 * 音声を文字起こし。
 * @returns {Promise<string>}
 */
export async function transcribeAudio(file, onLog = () => {}, onProgress = () => {}) {
  onLog(t('tr-prepare'));
  const asr = await getPipeline((msg, pct) => { onLog(msg); onProgress(pct); });

  onLog(t('tr-decoding'));
  const audio = await decodeAudio(file);

  onLog(t('tr-transcribing'));
  const result = await asr(audio, {
    language: 'japanese',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  });
  const text = (result && result.text ? result.text : '').trim();
  onLog(t('tr-done', { n: text.length }));
  return text;
}

/* ------------------------------------------------------------
   ヒューリスティクスによる構造化 (LLM 不使用)
   ------------------------------------------------------------ */
const DECISION_KW = ['決定', '決まり', '決まっ', 'することにし', 'で確定', 'で合意', 'で進める', 'にする', 'に決め'];
const TODO_KW = ['お願い', 'してください', '対応する', '確認する', '提出', '送る', '送付', '修正する', 'までに', '宿題', 'タスク', 'やっておく'];
const ISSUE_KW = ['課題', '問題', '懸念', '不明', '検討が必要', 'リスク', '心配', '未定', '保留'];

function splitSentences(text) {
  return text
    .replace(/\n+/g, '。')
    .split(/(?<=[。．！？!?])/)
    .map(s => s.trim())
    .filter(s => s.length >= 4);
}

function matchAny(sentence, kws) {
  return kws.some(kw => sentence.includes(kw));
}

/**
 * 文字起こしテキストを簡易構造化。
 * @returns {Object} render.js スキーマ
 */
export function structureHeuristically(transcript, meta = {}) {
  const sentences = splitSentences(transcript || '');
  const decisions = [], todos = [], issues = [], used = new Set();

  sentences.forEach((s, i) => {
    if (matchAny(s, DECISION_KW)) { decisions.push({ text: s }); used.add(i); }
    else if (matchAny(s, TODO_KW)) {
      const dueMatch = s.match(/([0-9０-９]{1,2}\s*月\s*[0-9０-９]{1,2}\s*日|来週|今週|明日|月末|今月中|までに)/);
      todos.push({ text: s, due: dueMatch ? dueMatch[1] : '' }); used.add(i);
    }
    else if (matchAny(s, ISSUE_KW)) { issues.push({ text: s }); used.add(i); }
  });

  // 残りの文を議論の流れとしてまとめる (長すぎる場合は先頭から要約的に間引き)
  const rest = sentences.filter((_, i) => !used.has(i));
  const points = rest.slice(0, 12);
  const discussions = points.length
    ? [{ topic: t('tr-topic'), points }]
    : [];

  // ごく簡易なサマリ: 先頭数文を連結
  const summary = sentences.slice(0, 3).join(' ').slice(0, 200);

  return {
    meta: { title: meta.title || t('mn-default-title'), ...meta },
    summary: summary || t('tr-no-summary'),
    decisions,
    todos,
    issues,
    discussions,
  };
}
