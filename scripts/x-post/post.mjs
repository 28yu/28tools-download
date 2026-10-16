#!/usr/bin/env node
/**
 * X 自動投稿スクリプト（Notion の「X 自動投稿キュー」→ X）
 * ======================================================
 *
 * 流れ:
 *   1. Claude（定期実行のセッション）が Notion のキューに下書きを追加する
 *   2. 運営者が内容を確認し、「承認」にチェックを入れる
 *   3. このスクリプト（GitHub Actions で1時間ごと）が、
 *      「承認済み・未投稿・投稿予定を過ぎたもの」を古い順に **1件だけ** 投稿する
 *
 * 安全策:
 *   - 承認にチェックが無いものは絶対に投稿しない
 *   - 1回の実行で投稿するのは1件まで（連投しない）
 *   - 投稿前に「状態=エラー（投稿処理中）」へ書き換えてから投稿する。
 *     途中で止まっても、次の実行で同じ投稿を二重に出さないため
 *   - 文字数（X の数え方で 280）を超えるものは投稿せずエラーにする
 *   - 必要な Secrets が未登録なら何もせず正常終了する（セットアップ前に赤くならない）
 *
 * 環境変数:
 *   NOTION_TOKEN, X_QUEUE_DATA_SOURCE_ID,
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 *   DRY_RUN=1 … X へは送らず、投稿対象と文字数だけ表示する（Notion も書き換えない）
 */

import crypto from 'node:crypto';

const NOTION_VERSION = '2025-09-03';
const env = process.env;
const DRY_RUN = env.DRY_RUN === '1';

// ---- X の文字数の数え方（twitter-text の重み付け） -------------------------
// 半角英数・記号などは1、日本語（全角）は2として数え、合計 280 まで。
// URL は長さに関係なく 23 として数える。
const URL_RE = /https?:\/\/[^\s]+/g;
const LIGHT_RANGES = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]];
export function weightedLength(text) {
  let n = 0;
  const withoutUrls = text.replace(URL_RE, () => { n += 23; return ''; });
  for (const ch of withoutUrls) {
    const cp = ch.codePointAt(0);
    n += LIGHT_RANGES.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2;
  }
  return n;
}

// ---- Notion ----------------------------------------------------------------
async function notion(method, path, body) {
  const res = await fetch('https://api.notion.com/v1' + path, {
    method,
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Notion ${res.status}: ${json.message || JSON.stringify(json)}`);
  return json;
}

const plain = (rich) => (rich || []).map((r) => r.plain_text).join('');

async function findDue() {
  const res = await notion('POST', `/data_sources/${env.X_QUEUE_DATA_SOURCE_ID}/query`, {
    filter: {
      and: [
        { property: '承認', checkbox: { equals: true } },
        { property: '状態', select: { does_not_equal: '投稿済み' } },
        { property: '状態', select: { does_not_equal: 'エラー' } },
        { property: '投稿予定', date: { on_or_before: new Date().toISOString() } },
      ],
    },
    sorts: [{ property: '投稿予定', direction: 'ascending' }],
    page_size: 10,
  });
  return res.results;
}

function setStatus(pageId, status, { url, error } = {}) {
  const properties = { 状態: { select: { name: status } } };
  if (url !== undefined) properties['投稿URL'] = { url };
  if (error !== undefined) {
    properties['エラー内容'] = { rich_text: error ? [{ text: { content: error.slice(0, 1900) } }] : [] };
  }
  return notion('PATCH', `/pages/${pageId}`, { properties });
}

// ---- X（OAuth 1.0a ユーザー認証で POST /2/tweets） -------------------------
const pct = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function oauthHeader(method, url) {
  const oauth = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };
  // JSON 本文は署名の対象に含めない（OAuth 1.0a の仕様）
  const params = Object.keys(oauth).sort().map((k) => `${pct(k)}=${pct(oauth[k])}`).join('&');
  const base = [method, pct(url), pct(params)].join('&');
  const key = `${pct(env.X_API_SECRET)}&${pct(env.X_ACCESS_TOKEN_SECRET)}`;
  oauth.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64');
  return 'OAuth ' + Object.keys(oauth).sort().map((k) => `${pct(k)}="${pct(oauth[k])}"`).join(', ');
}

async function postToX(text) {
  const url = 'https://api.x.com/2/tweets';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: oauthHeader('POST', url), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`X ${res.status}: ${json.detail || json.title || JSON.stringify(json)}`);
  return json.data.id;
}

// ---- main ------------------------------------------------------------------
async function main() {
  const required = ['NOTION_TOKEN', 'X_QUEUE_DATA_SOURCE_ID'];
  if (!DRY_RUN) required.push('X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET');
  const missing = required.filter((k) => !env[k]);
  if (missing.length) {
    console.log(`未設定の Secrets があるため何もしません: ${missing.join(', ')}`);
    return;
  }

  const due = await findDue();
  if (!due.length) { console.log('投稿予定を過ぎた承認済みの投稿はありません。'); return; }
  console.log(`投稿待ち ${due.length} 件。いちばん古い1件を処理します（連投しないため）。`);

  const page = due[0];
  const title = plain(page.properties['見出し']?.title);
  const text = plain(page.properties['本文']?.rich_text).trim();
  const len = weightedLength(text);
  console.log(`- 「${title}」 文字数(X換算) ${len}/280`);

  if (!text || len > 280) {
    const msg = !text ? '本文が空です' : `文字数オーバー（X換算 ${len}/280）。本文を短くして状態を空に戻してください`;
    console.log('  → 投稿しません: ' + msg);
    if (!DRY_RUN) await setStatus(page.id, 'エラー', { error: msg });
    return;
  }
  if (DRY_RUN) { console.log('  → DRY_RUN のため X へは送りません\n' + text); return; }

  // 二重投稿防止: 先に「処理中」の印を付けてから投稿する
  await setStatus(page.id, 'エラー', { error: '投稿処理中。この表示のまま残っている場合は、X に投稿されたかを確認してください' });
  try {
    const id = await postToX(text);
    const url = `https://x.com/28tools_com/status/${id}`;
    await setStatus(page.id, '投稿済み', { url, error: '' });
    console.log('  → 投稿しました: ' + url);
  } catch (e) {
    await setStatus(page.id, 'エラー', { error: String(e.message || e) });
    throw e;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
