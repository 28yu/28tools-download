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

const PROMPT = `あなたは打合せ・会議の議事録を作成する専門アシスタントです。分野は問いません（ビジネス、教育、行政、IT、建築、医療など、あらゆる打合せ）。
入力された「打合せ音声」「打合せ資料(画像)」「文字起こしテキスト」を総合的に理解し、日本語で構造化された議事録を作成してください。

【最重要・事実忠実性】
- 入力に実際に含まれる内容だけを議事録にする。入力に無い事項を推測・追加・創作してはならない。
- 特定の業種・分野を勝手に想定しない。音声が不明瞭でも、聞こえてもいない話題（例:「配筋」「梁」など建築の話）を勝手に作らないこと。
- 聞き取れない・該当が無いセクションは無理に埋めず、空配列にする。実際に話された分だけを出力する。
- 数値・固有名詞・専門用語は、確信が持てないものは断定しない。

【指示】
- 話者は音声から区別できる範囲で「話者A」「話者B」「話者C」…のように匿名ラベルで speaker に入れる。職業・役職・氏名を勝手に推定しないこと。区別できなければ speaker は空文字。
- 資料が参照された発言は refs に「資料1」など分かる範囲で記す。
- 決定事項・ToDo・課題・議論の流れに重複なく振り分ける。
- 出力は必ず指定された JSON スキーマに従うこと。

【出力量の制限】これは「要約」です。逐語的な書き起こしや同じ内容の繰り返しは禁止。
全体を必ず以下の上限内に収めること(超えそうなら重要なものだけ残す):
- summary: 200文字以内。
- decisions: 最大8件。todos: 最大8件。issues: 最大6件。
- discussions: 最大6トピック。各 points は最大4項目。
- すべての text / point は60文字以内の簡潔な文にする。
冗長な出力は避け、簡潔さを最優先すること。`;

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

// JSON.parse に失敗しても、コードフェンス除去・最初の { 〜 最後の } 抽出・
// 途中切れ(MAX_TOKENS)の修復まで試して救済する。
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
  // 途中で切れた JSON を修復 (未終端の文字列・配列・オブジェクトを閉じる)
  return repairTruncatedJson(s);
}

function repairTruncatedJson(input) {
  const start = input.indexOf('{');
  if (start < 0) return null;
  const s = input.slice(start);
  const stack = [];
  let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  let r = s;
  if (inStr) r += '"';                       // 未終端の文字列を閉じる
  // 末尾の中途半端な要素 (,"key": や ,"par) を落とす
  r = r.replace(/,\s*"[^"]*"\s*:\s*$/,'').replace(/,\s*"[^"]*$/,'').replace(/,\s*$/,'');
  for (let i = stack.length - 1; i >= 0; i--) r += (stack[i] === '{' ? '}' : ']');
  try { return JSON.parse(r); } catch (e) { return null; }
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
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      maxOutputTokens: 65536,
      // gemini-2.5-flash は既定で思考にトークンを消費し、JSON 出力が途中で
      // 切れて parse 失敗(MAX_TOKENS)することがある。思考を無効化＋出力上限を
      // 引き上げて、JSON を確実に完結させる。
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  onLog(t('g-sending'));
  const data = await requestJson(apiKey, reqBody);
  data.meta = data.meta || {};
  return data;
}

/**
 * generateContent を呼び、JSON を解釈して返す共通処理。
 * 503/500 (一時的な高負荷) はバックオフ付きで自動リトライする。
 */
async function requestJson(apiKey, reqBody) {
  let resp = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      resp = await fetch(ENDPOINT(MODEL, apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
    } catch (e) {
      resp = null; // ネットワークエラー → リトライ対象
    }
    if (resp && resp.ok) break;
    const retryable = !resp || resp.status === 503 || resp.status === 500;
    if (!retryable || attempt === 2) break;
    await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); // 2s, 4s
  }

  if (!resp) throw new Error(t('g-err-network'));

  if (!resp.ok) {
    let detail = '';
    try { const j = await resp.json(); detail = j?.error?.message || ''; } catch (_) {}
    if (resp.status === 400 && /API key/i.test(detail)) {
      throw new Error(t('g-err-invalid-key'));
    }
    if (resp.status === 429) {
      throw new Error(t('g-err-rate'));
    }
    if (resp.status === 503 || resp.status === 500) {
      throw new Error(t('g-err-overloaded'));
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
    if (reason === 'MAX_TOKENS') throw new Error(t('g-err-maxtokens'));
    throw new Error(t('g-err-json') + (reason && reason !== 'STOP' ? ` (${reason})` : ''));
  }
  return data;
}

const LANG_NAMES = { ja: '日本語', en: 'English', zh: '简体中文' };

/**
 * 生成済みの議事録 JSON を指定言語に翻訳する (構造・キーは保持)。
 * @param {string} apiKey
 * @param {Object} data 既存の議事録データ
 * @param {string} targetLang 'ja' | 'en' | 'zh'
 */
export async function translateMinutes(apiKey, data, targetLang) {
  if (!apiKey) throw new Error(t('g-err-no-key'));
  const langName = LANG_NAMES[targetLang] || targetLang;
  const prompt = `次の議事録 JSON を ${langName} に翻訳してください。
- JSON の構造とキーは一切変更しない。
- 人が読むテキスト値(title, summary, text, speaker, assignee, due, topic, points, location, project, attendees)のみ翻訳する。
- 項目の追加・削除・並べ替えはしない。固有名詞・寸法・記号は無理に訳さない。
- すでに ${langName} の箇所はそのままでよい。
出力は JSON のみ。`;

  const reqBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }, { text: JSON.stringify(data) }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      maxOutputTokens: 65536,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const out = await requestJson(apiKey, reqBody);
  out.meta = out.meta || data.meta || {};
  return out;
}

/* ============================================================
   ビジュアル資料生成 (Gemini 画像モデル = 通称「ナノバナナ」)
   議事録の要点から 1 枚絵のサマリー資料を作る。
   - flash: gemini-2.5-flash-image  … 無料枠あり・高速。画像内の日本語は崩れやすい
   - pro  : gemini-3-pro-image-preview … 文字レンダリングが強い。API は課金必要
   画像内の文字は「描かれた絵」なので誤字が起こりうる。あくまで
   共有・表紙用の補助資料であり、正式な記録は議事録本体 (テキスト) 側。
   ============================================================ */

export const IMAGE_MODELS = {
  flash: { id: 'gemini-2.5-flash-image', free: true },
  pro: { id: 'gemini-3-pro-image-preview', free: false },
};

export const VISUAL_KINDS = ['poster', 'infographic', 'whiteboard'];

const ASPECT = { poster: '3:4', infographic: '4:3', whiteboard: '16:9' };

const VISUAL_LANG = { ja: '日本語', en: 'English', zh: '简体中文' };

// 画像に載せる元テキスト。長すぎると破綻するので件数・文字数を絞る。
function visualSourceText(data, lang) {
  const d = data || {};
  const meta = d.meta || {};
  const cut = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const list = (arr, n, fmt) => (arr || []).slice(0, n).map(fmt).filter(Boolean);

  const lines = [];
  lines.push(`TITLE: ${cut(meta.title, 40) || t('mn-default-title')}`);
  if (meta.date) lines.push(`DATE: ${cut(meta.date, 30)}`);
  if (d.summary) lines.push(`SUMMARY: ${cut(d.summary, 160)}`);
  const push = (label, arr) => { if (arr.length) lines.push(`${label}:\n- ${arr.join('\n- ')}`); };
  push(t('mn-sec-decisions').toUpperCase(), list(d.decisions, 5, it => cut(it.text, 46)));
  push(t('mn-sec-todos').toUpperCase(), list(d.todos, 5,
    it => cut(it.text, 40) + (it.assignee ? ` (${cut(it.assignee, 12)})` : '') + (it.due ? ` [${cut(it.due, 14)}]` : '')));
  push(t('mn-sec-issues').toUpperCase(), list(d.issues, 4, it => cut(it.text, 40)));
  push(t('mn-sec-discussions').toUpperCase(), list(d.discussions, 5, it => cut(it.topic, 30)));
  return lines.join('\n');
}

const KIND_DIRECTION = {
  poster: 'A clean one-page summary poster with a strong title band at the top and clearly separated sections below. Flat vector style, generous whitespace, business-document look.',
  infographic: 'A structured infographic: title header, then boxed sections connected by simple arrows/dividers, with small flat icons next to each section heading. Editorial infographic style.',
  whiteboard: 'A tidy hand-drawn whiteboard summary: marker-style lettering, hand-drawn boxes, arrows and sticky notes on a white whiteboard surface. Neat and legible, not messy.',
};

function buildVisualPrompt(kind, data, lang, tier) {
  const langName = VISUAL_LANG[lang] || VISUAL_LANG.ja;
  const textPolicy = tier === 'pro'
    ? `Render every line of the source text below accurately in ${langName}. Reproduce the wording exactly as given — do not paraphrase, translate, shorten or invent any text.`
    : `Keep on-image text to a minimum: render only short headings and keywords in ${langName}, taken verbatim from the source text. Do not attempt long sentences. Never invent words.`;

  return `Create a single ${kind} image that visually summarizes the meeting minutes below.

STYLE: ${KIND_DIRECTION[kind] || KIND_DIRECTION.poster}
Palette: deep navy (#2c3e50), blue (#3498db), green (#27ae60), orange (#e67e22) on a white background.

TEXT RULES (critical):
- ${textPolicy}
- Use ONLY the information in the source text. Do not add facts, figures, names, dates or logos that are not there.
- No photorealistic people, no company logos, no watermark-like decorations.
- Keep the layout uncluttered so every character stays legible.

SOURCE TEXT:
${visualSourceText(data, lang)}`;
}

/**
 * 議事録データから 1 枚のビジュアル資料 (画像) を生成する。
 * @param {Object} opts { apiKey, data, model:'flash'|'pro', kind, lang }
 * @returns {Promise<{ mimeType:string, base64:string }>}
 */
export async function generateVisualImage(opts, onLog = () => {}) {
  const { apiKey, data, model = 'flash', kind = 'poster', lang = 'ja' } = opts || {};
  if (!apiKey) throw new Error(t('g-err-no-key'));
  if (!data) throw new Error(t('g-err-need-input'));

  const tier = IMAGE_MODELS[model] ? model : 'flash';
  const modelId = IMAGE_MODELS[tier].id;

  const parts = [{ text: buildVisualPrompt(kind, data, lang, tier) }];
  const generationConfig = {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: {
      aspectRatio: ASPECT[kind] || '4:3',
      ...(tier === 'pro' ? { imageSize: '2K' } : {}),
    },
  };

  onLog(t('vis-log-sending', { model: modelId }));
  let json = await requestImage(apiKey, modelId, { contents: [{ role: 'user', parts }], generationConfig }, tier, onLog);

  const cand = json?.candidates?.[0];
  const img = (cand?.content?.parts || []).find(p => p.inlineData?.data);
  if (!img) {
    const reason = cand?.finishReason || json?.promptFeedback?.blockReason || '?';
    throw new Error(t('vis-err-no-image', { reason }));
  }
  return { mimeType: img.inlineData.mimeType || 'image/png', base64: img.inlineData.data };
}

/**
 * 429 レスポンスから「どの枠に当たったのか」を読み取る。
 * Google は error.details に QuotaFailure(violations[].quotaId/quotaValue) と
 * RetryInfo(retryDelay) を入れてくる。ここが分からないと
 * 「使い切った」のか「そもそも無料枠が 0 のモデル」なのか切り分けられない。
 */
function parseQuotaError(err) {
  const details = Array.isArray(err?.details) ? err.details : [];
  const quota = details.find(d => /QuotaFailure/i.test(d['@type'] || ''));
  const retry = details.find(d => /RetryInfo/i.test(d['@type'] || ''));
  const v = quota?.violations?.[0] || {};
  const sec = parseInt(String(retry?.retryDelay || '').replace(/[^\d]/g, ''), 10);
  return {
    quotaId: v.quotaId || v.quota_id || '',
    // 無料枠が 0 のモデル (課金必須) は quotaValue が "0" で返る
    quotaValue: String(v.quotaValue ?? v.quota_value ?? ''),
    retrySec: Number.isFinite(sec) ? sec : null,
  };
}

// 429 を、原因が分かる日本語メッセージに変換する。
function rateLimitMessage(errObj, tier, detail) {
  const q = parseQuotaError(errObj);
  if (q.quotaValue === '0') {
    // 無料枠 0 = このキー/プロジェクトではそのモデルを無料で使えない
    return t('vis-err-quota-zero') + (q.quotaId ? t('vis-err-quota-id', { id: q.quotaId }) : '');
  }
  if (tier === 'pro') return t('vis-err-billing');
  let msg = t('vis-err-rate');
  if (q.retrySec) msg += t('vis-err-retry-in', { sec: q.retrySec });
  if (q.quotaId) msg += t('vis-err-quota-id', { id: q.quotaId });
  if (!q.quotaId && detail) msg += t('vis-err-detail', { detail: detail.slice(0, 160) });
  return msg;
}

// 画像生成用の POST。503/500 はリトライ、imageConfig 非対応の 400 は設定を外して再試行。
async function requestImage(apiKey, modelId, reqBody, tier, onLog = () => {}) {
  let body = reqBody;
  let triedWithoutConfig = false;

  for (let attempt = 0; attempt < 4; attempt++) {
    let resp = null;
    try {
      resp = await fetch(ENDPOINT(modelId, apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      resp = null; // ネットワークエラー → リトライ
    }

    if (resp && resp.ok) return resp.json();

    let detail = '';
    let errObj = null;
    if (resp) {
      try { const j = await resp.json(); errObj = j?.error || null; detail = errObj?.message || ''; } catch (_) {}
      // 原因調査できるよう、API が返した内容をそのままログに残す
      onLog(`[image API] HTTP ${resp.status} ${detail || resp.statusText}`);
      if (errObj?.details) {
        try { onLog('[image API] details: ' + JSON.stringify(errObj.details)); } catch (_) {}
      }
    }

    // imageConfig / responseModalities をモデルが受け付けない場合は外して 1 回だけ再試行
    if (resp && resp.status === 400 && !triedWithoutConfig && /imageConfig|aspectRatio|imageSize|image_config|responseModalities/i.test(detail)) {
      triedWithoutConfig = true;
      body = { ...body, generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } };
      onLog(t('vis-log-retry-simple'));
      continue;
    }

    const retryable = !resp || resp.status === 503 || resp.status === 500;
    if (retryable && attempt < 3) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }

    if (!resp) throw new Error(t('g-err-network'));
    if (resp.status === 400 && /API key/i.test(detail)) throw new Error(t('g-err-invalid-key'));
    if (resp.status === 429) throw new Error(rateLimitMessage(errObj, tier, detail));
    if (resp.status === 403 || /billing|billed users|not available|permission|not supported for this model/i.test(detail)) {
      throw new Error(tier === 'pro' ? t('vis-err-billing') : t('g-err-api', { status: resp.status, detail }));
    }
    if (resp.status === 404) throw new Error(t('vis-err-model', { model: modelId }));
    if (resp.status === 503 || resp.status === 500) throw new Error(t('g-err-overloaded'));
    throw new Error(t('g-err-api', { status: resp.status, detail: detail || resp.statusText }));
  }
  throw new Error(t('g-err-network'));
}
