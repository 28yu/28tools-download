/* ============================================================
   gemini.js — Google Gemini API でマルチモーダル議事録生成
   - 音声・資料画像・文字起こしテキストを同時入力
   - 構造化 JSON (render.js のスキーマ) を responseSchema で受け取る
   - すべてブラウザから fetch (Google エンドポイントは CORS 対応)
   - 開発者のキーは使わない / ユーザー自身の無料キーを利用
   ============================================================ */
import { t } from './i18n.js';

// 無料枠で使えるマルチモーダル対応モデル。
const MODEL = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com';
const ENDPOINT = (model, key) =>
  `${API_BASE}/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

// インライン送信(base64 を本文に同梱)の安全上限。リクエスト全体で ~20MB の制約があるため、
// これを超えるファイルは Files API でアップロードして URI 参照に切り替える(実質的な容量制限なし)。
export const INLINE_LIMIT_BYTES = 15 * 1024 * 1024;

/**
 * Gemini Files API でファイルをアップロードし、{ mimeType, fileUri } を返す。
 * resumable upload プロトコルを使用 (ブラウザから直接, CORS 対応)。
 * 音声等は ACTIVE になるまで PROCESSING のため、状態をポーリングする。
 */
async function uploadViaFilesApi(apiKey, file, onLog) {
  onLog(t('g-uploading', { name: file.name || 'file' }));
  const mime = file.type || 'application/octet-stream';

  // 1) アップロード開始 (resumable セッションを作成)
  const startResp = await fetch(`${API_BASE}/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(file.size),
      'X-Goog-Upload-Header-Content-Type': mime,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: file.name || 'upload' } }),
  });
  if (!startResp.ok) throw new Error(t('g-err-upload'));
  const uploadUrl = startResp.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error(t('g-err-upload'));

  // 2) バイト本体をアップロード＆finalize
  const upResp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': mime,
    },
    body: file,
  });
  if (!upResp.ok) throw new Error(t('g-err-upload'));
  let info = await upResp.json();
  let f = info.file;
  if (!f || !f.name) throw new Error(t('g-err-upload'));

  // 3) ACTIVE になるまでポーリング (音声/動画は PROCESSING 経由)
  let tries = 0;
  while (f.state === 'PROCESSING' && tries < 90) {
    onLog(t('g-processing'));
    await new Promise(r => setTimeout(r, 2000));
    const st = await fetch(`${API_BASE}/v1beta/${f.name}?key=${encodeURIComponent(apiKey)}`);
    if (!st.ok) break;
    f = await st.json();
    tries++;
  }
  if (f.state === 'FAILED') throw new Error(t('g-err-upload'));

  return { mimeType: f.mimeType || mime, fileUri: f.uri };
}

const PROMPT = `あなたは建築・建設現場の打合せ議事録を作成する専門アシスタントです。
入力された「打合せ音声」「打合せ資料(図面・画像)」「文字起こしテキスト」を総合的に理解し、
日本語で構造化された議事録を作成してください。

重要な指示:
- 建築用語(梁・柱・スラブ・配筋・納まり・施工手順・寸法など)を正しく扱う。
- 音声がある場合、話者を可能な範囲で推定し各項目の speaker に入れる(不明なら空文字)。
  話者名が不明でも「Aさん」「現場監督」「設計」のように役割で区別してよい。
- 資料(図面)が参照された発言は refs に「資料1」「平面図」など分かる範囲で記す。
- 図面の寸法・記号は誤読の恐れがあるため、確信が持てない数値は断定しない。
- 決定事項・ToDo・課題・議論の流れに重複なく振り分ける。
- 出力は必ず指定された JSON スキーマに従うこと。`;

// Gemini responseSchema (OpenAPI 風)
const SCHEMA = {
  type: 'object',
  properties: {
    meta: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string' },
        location: { type: 'string' },
        project: { type: 'string' },
        attendees: { type: 'array', items: { type: 'string' } },
      },
    },
    summary: { type: 'string' },
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          speaker: { type: 'string' },
          refs: { type: 'array', items: { type: 'string' } },
        },
        required: ['text'],
      },
    },
    todos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          assignee: { type: 'string' },
          due: { type: 'string' },
        },
        required: ['text'],
      },
    },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          speaker: { type: 'string' },
        },
        required: ['text'],
      },
    },
    discussions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          points: { type: 'array', items: { type: 'string' } },
          speaker: { type: 'string' },
        },
        required: ['topic'],
      },
    },
  },
  required: ['summary', 'decisions', 'todos', 'issues', 'discussions'],
};

// JSON.parse に失敗しても、コードフェンス除去・最初の { 〜 最後の } 抽出で救済する。
function parseJsonLoose(text) {
  const tryParse = (s) => { try { return JSON.parse(s); } catch (e) { return undefined; } };
  let v = tryParse(text);
  if (v !== undefined) return v;
  let s = String(text).trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  v = tryParse(s);
  if (v !== undefined) return v;
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) {
    v = tryParse(s.slice(a, b + 1));
    if (v !== undefined) return v;
  }
  return null;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      const comma = res.indexOf(',');
      resolve(res.slice(comma + 1)); // data URL のヘッダ部を除去
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * @param {Object} input { apiKey, audioFile, materialFiles[], transcript }
 * @param {Function} onLog 進捗ログ
 * @returns {Promise<Object>} render.js スキーマのデータ
 */
export async function generateWithGemini(input, onLog = () => {}) {
  const { apiKey, audioFile, materialFiles = [], transcript } = input;
  if (!apiKey) throw new Error(t('g-err-no-key'));

  if (!transcript?.trim() && !audioFile && materialFiles.length === 0) {
    throw new Error(t('g-err-need-input'));
  }

  // 合計が小さければ高速なインライン送信、大きければ Files API へ自動切替 (容量制限なし)。
  const totalBytes = (audioFile ? audioFile.size : 0)
    + materialFiles.reduce((s, f) => s + f.size, 0);
  const useFilesApi = totalBytes > INLINE_LIMIT_BYTES;

  const parts = [{ text: PROMPT }];

  if (transcript && transcript.trim()) {
    parts.push({ text: `\n【文字起こしテキスト】\n${transcript.trim()}` });
  }

  // 添付ファイルを part に変換 (インライン or Files API)
  const addFile = async (file, defaultMime) => {
    if (useFilesApi) {
      const fileData = await uploadViaFilesApi(apiKey, file, onLog);
      return { fileData };
    }
    const b64 = await fileToBase64(file);
    return { inlineData: { mimeType: file.type || defaultMime, data: b64 } };
  };

  if (audioFile) {
    if (!useFilesApi) onLog(t('g-encoding-audio'));
    parts.push(await addFile(audioFile, 'audio/mpeg'));
  }

  for (let i = 0; i < materialFiles.length; i++) {
    if (!useFilesApi) onLog(t('g-encoding-material', { i: i + 1, n: materialFiles.length }));
    parts.push({ text: `\n【資料${i + 1}】` });
    parts.push(await addFile(materialFiles[i], 'image/png'));
  }

  const reqBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      maxOutputTokens: 16384,
      // gemini-2.5-flash は既定で思考にトークンを消費し、JSON 出力が途中で
      // 切れて parse 失敗することがある。思考を無効化して出力を確実に完結させる。
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  onLog(t('g-sending'));
  let resp;
  try {
    resp = await fetch(ENDPOINT(MODEL, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
  } catch (e) {
    throw new Error(t('g-err-network'));
  }

  if (!resp.ok) {
    let detail = '';
    try { const j = await resp.json(); detail = j?.error?.message || ''; } catch (_) {}
    if (resp.status === 400 && /API key/i.test(detail)) {
      throw new Error(t('g-err-invalid-key'));
    }
    if (resp.status === 429) {
      throw new Error(t('g-err-rate'));
    }
    throw new Error(t('g-err-api', { status: resp.status, detail: detail || resp.statusText }));
  }

  const json = await resp.json();
  const cand = json?.candidates?.[0];
  const reason = cand?.finishReason || json?.promptFeedback?.blockReason || '?';
  const text = cand?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '';
  if (!text) {
    throw new Error(t('g-err-no-response', { reason }));
  }

  const data = parseJsonLoose(text);
  if (data == null) {
    // 切り捨て(MAX_TOKENS)等で壊れている場合は理由を添えて通知
    throw new Error(t('g-err-json') + (reason && reason !== 'STOP' ? ` (${reason})` : ''));
  }

  // meta が無い場合の保険
  data.meta = data.meta || {};
  return data;
}
