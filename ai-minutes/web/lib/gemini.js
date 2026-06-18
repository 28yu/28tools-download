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
const ENDPOINT = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

// インライン送信の安全上限 (リクエスト全体で ~20MB)。超える場合は呼び出し側で警告。
export const INLINE_LIMIT_BYTES = 18 * 1024 * 1024;

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

  // インライン総量チェック
  let totalBytes = (audioFile ? audioFile.size : 0)
    + materialFiles.reduce((s, f) => s + f.size, 0);
  if (totalBytes > INLINE_LIMIT_BYTES) {
    throw new Error(t('g-err-too-large', { mb: (totalBytes / 1048576).toFixed(1) }));
  }

  const parts = [{ text: PROMPT }];

  if (transcript && transcript.trim()) {
    parts.push({ text: `\n【文字起こしテキスト】\n${transcript.trim()}` });
  }

  if (audioFile) {
    onLog(t('g-encoding-audio'));
    const b64 = await fileToBase64(audioFile);
    parts.push({
      inlineData: { mimeType: audioFile.type || 'audio/mpeg', data: b64 },
    });
  }

  for (let i = 0; i < materialFiles.length; i++) {
    onLog(t('g-encoding-material', { i: i + 1, n: materialFiles.length }));
    const f = materialFiles[i];
    const b64 = await fileToBase64(f);
    parts.push({ text: `\n【資料${i + 1}】` });
    parts.push({ inlineData: { mimeType: f.type || 'image/png', data: b64 } });
  }

  if (!transcript?.trim() && !audioFile && materialFiles.length === 0) {
    throw new Error(t('g-err-need-input'));
  }

  const reqBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
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
  const text = cand?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '';
  if (!text) {
    const reason = cand?.finishReason || json?.promptFeedback?.blockReason || '?';
    throw new Error(t('g-err-no-response', { reason }));
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(t('g-err-json'));
  }

  // meta が無い場合の保険
  data.meta = data.meta || {};
  return data;
}
