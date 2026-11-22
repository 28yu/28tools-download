/* ============================================================
   local-ai.js — 簡易版の「内容理解」を利用者の端末内 AI で行う（試作）
   - 第1候補: Chrome 内蔵 AI（Prompt API / Gemini Nano）
       Chrome がモデルを配布・管理する。こちらはダウンロード不要。
   - 第2候補: WebLLM + オープンウェイト（Qwen3）を WebGPU で実行
       初回のみモデル（約 1〜2.5GB）をダウンロードし、ブラウザに保存される。
   - どちらも使えない／失敗したら transcribe.js のキーワード分類に戻す。
   計算はすべて利用者の端末で行うため、サイト運営者の費用は利用者数に
   関係なくゼロ。文字起こしの内容も外部へ送信しない。

   返す形は gemini.js / transcribe.js と同じ render.js のスキーマ。
   ============================================================ */
import { t } from './i18n.js';
import { structureHeuristically } from './transcribe.js';

// CDN の版は固定する（勝手に上がって壊れないように）。
const WEBLLM_CDNS = [
  'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/+esm',
  'https://esm.run/@mlc-ai/web-llm@0.2.87',
];

// WebLLM で使うモデル。q4f16 は GPU が shader-f16 に対応しているときだけ使える。
const WEBLLM_MODELS = {
  quality: { base: 'Qwen3-4B', sizeGB: 2.3 },
  light:   { base: 'Qwen3-1.7B', sizeGB: 1.1 },
};

// 1 回に AI へ渡す文字数。WebLLM のモデルは 4096 トークンまでしか読めないため小さめ。
const CHUNK_CHARS = { chrome: 2500, webllm: 1300 };

/* ------------------------------------------------------------
   出力の形（JSON Schema）。小さいモデルが迷わないよう項目は最小限。
   発言者は Whisper の文字起こしには含まれないため、項目自体を置かない
   （置くと小さいモデルは名前を作り出してしまう）。
   ------------------------------------------------------------ */
const CHUNK_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    decisions: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
    todos: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: { type: 'string' }, assignee: { type: 'string' }, due: { type: 'string' } },
        required: ['text', 'assignee', 'due'],
      },
    },
    issues: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
    discussions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { topic: { type: 'string' }, points: { type: 'array', items: { type: 'string' } } },
        required: ['topic', 'points'],
      },
    },
  },
  required: ['title', 'summary', 'decisions', 'todos', 'issues', 'discussions'],
};

const FINAL_SCHEMA = {
  type: 'object',
  properties: { title: { type: 'string' }, summary: { type: 'string' } },
  required: ['title', 'summary'],
};

const PROMPTS = {
  ja: {
    system: `あなたは打合せの議事録を作るアシスタントです。
入力は音声認識による文字起こしの一部で、誤変換を含みます。次の規則を必ず守ってください。
- 文字起こしに書かれている内容だけを使う。書かれていない事実・人名・日付を作らない。
- 明らかな誤変換は文脈から自然な言葉に直してよい。
- title: 打合せの内容を表す短い題名（20文字以内）。
- summary: この部分の要約（2〜3文）。
- decisions: はっきり決まったこと。無ければ空の配列。
- todos: 誰かがやると言ったこと・頼まれたこと。assignee は担当者の名前が文中にあるときだけ、無ければ ""。due は期限が文中にあるときだけ、無ければ ""。
- issues: 課題・懸念・未決定のこと。無ければ空の配列。
- discussions: 話題ごとに topic と、要点 points（1項目は1文、最大5つ）。
- 各配列は最大6項目。同じ内容を繰り返さない。
- 出力は日本語の JSON のみ。`,
    chunk: (i, n, text) => `## 文字起こし（${i}/${n}）\n${text}`,
    final: (parts) => `次は1つの打合せを区切って要約したものです。全体の題名（20文字以内）と、全体の要約（3〜5文）を日本語の JSON で出してください。\n\n${parts}`,
  },
  en: {
    system: `You are an assistant that writes meeting minutes.
The input is part of a speech-recognition transcript and may contain errors. Follow these rules strictly.
- Use only what the transcript says. Never invent facts, names or dates.
- You may fix obvious recognition errors from context.
- title: a short title for the meeting (max 8 words).
- summary: a 2-3 sentence summary of this part.
- decisions: things clearly decided. Empty array if none.
- todos: things someone will do or was asked to do. assignee only if a name is in the text, otherwise "". due only if a deadline is in the text, otherwise "".
- issues: problems, concerns, open questions. Empty array if none.
- discussions: per topic, a topic and its points (one sentence each, max 5).
- At most 6 items per array. Do not repeat yourself.
- Output JSON only, in English.`,
    chunk: (i, n, text) => `## Transcript (${i}/${n})\n${text}`,
    final: (parts) => `Below are summaries of consecutive parts of one meeting. Output, as JSON in English, an overall title (max 8 words) and an overall summary (3-5 sentences).\n\n${parts}`,
  },
  zh: {
    system: `你是撰写会议记录的助手。
输入是语音识别转写的一部分，可能含有识别错误。请严格遵守以下规则。
- 只使用转写中出现的内容。不要编造事实、人名或日期。
- 可以根据上下文修正明显的识别错误。
- title：会议的简短标题（20字以内）。
- summary：这一部分的摘要（2~3句）。
- decisions：明确决定的事项。没有则为空数组。
- todos：有人表示要做或被委托的事项。assignee 仅当文中有负责人姓名时填写，否则为 ""。due 仅当文中有期限时填写，否则为 ""。
- issues：问题、顾虑、未决事项。没有则为空数组。
- discussions：按话题列出 topic 和要点 points（每条一句，最多5条）。
- 每个数组最多6项。不要重复。
- 只输出简体中文的 JSON。`,
    chunk: (i, n, text) => `## 转写（${i}/${n}）\n${text}`,
    final: (parts) => `以下是同一会议分段后的摘要。请以简体中文 JSON 输出整体标题（20字以内）和整体摘要（3~5句）。\n\n${parts}`,
  },
};

// 中身の言語（UI の言語ではない）。かな→ja、漢字のみ→zh、それ以外→en。
export function detectTextLang(text) {
  if (/[぀-ヿ]/.test(text)) return 'ja';
  if (/[一-鿿]/.test(text)) return 'zh';
  return 'en';
}

/* ------------------------------------------------------------
   どの方式が使えるかを調べる
   ------------------------------------------------------------ */

function chromeLangOptions(lang) {
  return {
    expectedInputs: [{ type: 'text', languages: [lang] }],
    expectedOutputs: [{ type: 'text', languages: [lang] }],
  };
}

async function chromeAvailability(lang) {
  // Gemini Nano は中国語の出力に未対応のため、中国語は WebLLM に回す。
  if (lang === 'zh') return 'unavailable';
  if (typeof LanguageModel === 'undefined' || !LanguageModel.availability) return 'unavailable';
  try {
    return await LanguageModel.availability(chromeLangOptions(lang));
  } catch (e) {
    return 'unavailable';
  }
}

async function webgpuInfo() {
  if (!navigator.gpu) return null;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;
    return { f16: adapter.features.has('shader-f16') };
  } catch (e) {
    return null;
  }
}

/**
 * この端末で使える方式を返す（画面の案内用）。
 * @returns {Promise<{chrome: string, webgpu: boolean}>}
 */
export async function detectLocalAI(lang = 'ja') {
  const [chrome, gpu] = await Promise.all([chromeAvailability(lang), webgpuInfo()]);
  return { chrome, webgpu: !!gpu };
}

/* ------------------------------------------------------------
   Chrome 内蔵 AI のセッション作成は「ボタンを押した直後」に始める必要がある
   （初回のモデルダウンロードはクリック操作の直後でないと許可されない）。
   そのため generate() の最初で primeChromeAI() を呼んでおく。
   ------------------------------------------------------------ */
let _chromePrime = null;
let _chromePrimeLang = null;

export function primeChromeAI(lang, onLog = () => {}) {
  if (lang === 'zh' || typeof LanguageModel === 'undefined' || !LanguageModel.create) return;
  if (_chromePrime && _chromePrimeLang === lang) return;
  _chromePrimeLang = lang;
  _chromePrime = (async () => {
    const avail = await chromeAvailability(lang);
    if (avail === 'unavailable') return null;
    let lastPct = -1;
    const session = await LanguageModel.create({
      ...chromeLangOptions(lang),
      initialPrompts: [{ role: 'system', content: PROMPTS[lang].system }],
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const pct = Math.round((e.loaded || 0) * 100);
          if (pct !== lastPct && pct % 10 === 0) { lastPct = pct; onLog(t('la-chrome-dl', { pct })); }
        });
      },
    });
    return session;
  })().catch((e) => {
    console.warn('Chrome built-in AI unavailable:', e);
    return null;
  });
}

/* ------------------------------------------------------------
   方式ごとの「1 回の問い合わせ」を同じ形にそろえる
   ask(userText, schema) → JSON 文字列
   ------------------------------------------------------------ */

async function makeChromeRunner(lang, onLog) {
  primeChromeAI(lang, onLog);
  const base = _chromePrime ? await _chromePrime : null;
  if (!base) { _chromePrime = null; _chromePrimeLang = null; return null; }
  return {
    name: 'chrome',
    label: t('la-engine-chrome'),
    async ask(text, schema) {
      // 区切りごとに会話をリセットする（前の部分の内容で枠を使い切らないため）
      const s = await base.clone();
      try {
        return await s.prompt(text, { responseConstraint: schema });
      } finally {
        s.destroy && s.destroy();
      }
    },
  };
}

let _webllmEngine = null;
let _webllmModelId = null;

async function importWebLLM() {
  let lastErr;
  for (const url of WEBLLM_CDNS) {
    try { return await import(/* @vite-ignore */ url); } catch (e) { lastErr = e; console.warn('WebLLM import failed', url, e); }
  }
  throw lastErr || new Error('Failed to import WebLLM');
}

async function makeWebLLMRunner(lang, size, onLog, onProgress) {
  const gpu = await webgpuInfo();
  if (!gpu) return null;
  const webllm = await importWebLLM();
  const order = size === 'light' ? ['light'] : ['quality', 'light'];

  for (const key of order) {
    const m = WEBLLM_MODELS[key];
    const modelId = `${m.base}-${gpu.f16 ? 'q4f16_1' : 'q4f32_1'}-MLC`;
    if (_webllmEngine && _webllmModelId === modelId) break;
    try {
      onLog(t('la-webllm-load', { model: m.base, gb: m.sizeGB }));
      if (_webllmEngine) { try { await _webllmEngine.unload(); } catch (e) { /* noop */ } }
      _webllmEngine = null;
      let lastPct = -1;
      _webllmEngine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (r) => {
          const pct = Math.round((r.progress || 0) * 100);
          if (pct !== lastPct) {
            lastPct = pct;
            onProgress(pct);
            if (pct % 10 === 0) onLog(t('la-webllm-progress', { pct }));
          }
        },
      });
      _webllmModelId = modelId;
      break;
    } catch (e) {
      console.warn('WebLLM load failed', modelId, e);
      onLog(t('la-webllm-fail', { model: m.base }));
      _webllmEngine = null;
      _webllmModelId = null;
    }
  }
  if (!_webllmEngine) return null;

  const engine = _webllmEngine;
  const modelName = _webllmModelId.split('-q4')[0];
  return {
    name: 'webllm',
    label: t('la-engine-webllm', { model: modelName }),
    async ask(text, schema) {
      const reply = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: PROMPTS[lang].system },
          { role: 'user', content: text },
        ],
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: 'json_object', schema: JSON.stringify(schema) },
        extra_body: { enable_thinking: false }, // Qwen3 の「考える」出力を止めて速くする
      });
      await engine.resetChat();
      return reply.choices[0].message.content || '';
    },
  };
}

/* ------------------------------------------------------------
   文字起こしを区切る（文の切れ目で切る）
   ------------------------------------------------------------ */
export function splitIntoChunks(text, maxChars) {
  const sentences = String(text || '')
    .replace(/\r/g, '')
    .split(/(?<=[。．！？!?\n])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks = [];
  let cur = '';
  for (let s of sentences) {
    // 句点の無い長文（Whisper ではよくある）は文字数で強制的に切る
    while (s.length > maxChars) {
      if (cur) { chunks.push(cur); cur = ''; }
      chunks.push(s.slice(0, maxChars));
      s = s.slice(maxChars);
    }
    if (cur.length + s.length > maxChars && cur) { chunks.push(cur); cur = ''; }
    cur += (cur && !/\n$/.test(cur) ? ' ' : '') + s;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/* ------------------------------------------------------------
   区切りごとの結果をまとめる
   ------------------------------------------------------------ */
const norm = (s) => String(s || '').replace(/[\s、。，．,.!！?？「」『』（）()・]/g, '').toLowerCase();
const str = (v) => (typeof v === 'string' ? v.trim() : '');

function pushUnique(list, seen, item) {
  const key = norm(item.text);
  if (!key || seen.has(key)) return;
  seen.add(key);
  list.push(item);
}

export function mergeChunkResults(results) {
  const decisions = [], todos = [], issues = [], discussions = [];
  const seenD = new Set(), seenT = new Set(), seenI = new Set();
  for (const r of results) {
    (r.decisions || []).forEach((d) => pushUnique(decisions, seenD, { text: str(d.text) }));
    (r.todos || []).forEach((d) => pushUnique(todos, seenT, { text: str(d.text), assignee: str(d.assignee), due: str(d.due) }));
    (r.issues || []).forEach((d) => pushUnique(issues, seenI, { text: str(d.text) }));
    (r.discussions || []).forEach((d) => {
      const points = (d.points || []).map(str).filter(Boolean);
      const topic = str(d.topic);
      if (!topic && !points.length) return;
      // 直前と同じ話題が続いたら 1 つにまとめる（区切りの境目で話題が割れるため）
      const last = discussions[discussions.length - 1];
      if (last && norm(last.topic) === norm(topic)) {
        points.forEach((p) => { if (!last.points.some((q) => norm(q) === norm(p))) last.points.push(p); });
      } else {
        discussions.push({ topic, points });
      }
    });
  }
  return { decisions, todos, issues, discussions };
}

function parseJson(raw) {
  const s = String(raw || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  try { return JSON.parse(s); } catch (e) { /* 前後に余計な文字が付いた場合 */ }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(s.slice(a, b + 1));
  throw new Error('invalid JSON');
}

/**
 * 端末内 AI で文字起こしを議事録の形にする。
 * @param {string} transcript
 * @param {{ engine?: 'auto'|'quality'|'light', onLog?: Function, onProgress?: Function }} opts
 * @returns {Promise<{ data: Object, engine: string } | null>} 端末内 AI が使えなければ null
 */
export async function structureWithLocalAI(transcript, opts = {}) {
  const { engine = 'auto', onLog = () => {}, onProgress = () => {} } = opts;
  const lang = detectTextLang(transcript);
  const P = PROMPTS[lang];

  let runner = null;
  if (engine === 'auto') runner = await makeChromeRunner(lang, onLog);
  if (!runner) runner = await makeWebLLMRunner(lang, engine === 'light' ? 'light' : 'quality', onLog, onProgress);
  if (!runner) return null;

  onLog(t('la-using', { engine: runner.label }));
  const chunks = splitIntoChunks(transcript, CHUNK_CHARS[runner.name]);
  const results = [];
  let fallbacks = 0;

  for (let i = 0; i < chunks.length; i++) {
    onLog(t('la-chunk', { i: i + 1, n: chunks.length }));
    onProgress(Math.round((i / chunks.length) * 100));
    try {
      results.push(parseJson(await runner.ask(P.chunk(i + 1, chunks.length, chunks[i]), CHUNK_SCHEMA)));
    } catch (e) {
      // その区切りだけキーワード分類で補う（全体を失敗にしない）
      console.warn('local AI chunk failed', i, e);
      fallbacks++;
      const h = structureHeuristically(chunks[i]);
      results.push({ title: '', summary: '', ...h });
    }
  }
  if (fallbacks === chunks.length) throw new Error(t('la-err-all'));
  if (fallbacks) onLog(t('la-chunk-fallback', { n: fallbacks }));

  const merged = mergeChunkResults(results);
  const summaries = results.map((r) => str(r.summary)).filter(Boolean);
  let title = results.map((r) => str(r.title)).find(Boolean) || '';
  let summary = summaries.join(' ');

  if (summaries.length > 1) {
    onLog(t('la-final'));
    try {
      const parts = summaries.map((s, i) => `${i + 1}. ${s}`).join('\n');
      const fin = parseJson(await runner.ask(P.final(parts), FINAL_SCHEMA));
      title = str(fin.title) || title;
      summary = str(fin.summary) || summary;
    } catch (e) {
      console.warn('local AI final summary failed', e);
    }
  }
  onProgress(100);

  return {
    engine: runner.name,
    data: {
      meta: { title: title || t('mn-default-title') },
      summary: summary || t('tr-no-summary'),
      ...merged,
    },
  };
}
