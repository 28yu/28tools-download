#!/usr/bin/env node
/**
 * X 自動投稿スクリプト（Notion の「X 自動投稿キュー」→ Buffer → X）
 * ================================================================
 *
 * X API は新規登録だと有料（従量課金）のため、無料の予約投稿サービス Buffer を経由する。
 * X への投稿そのものは Buffer が行う。
 *
 * 流れ:
 *   1. Claude が Notion のキューに下書きを追加する
 *   2. 運営者が内容を確認し、「承認」にチェックを入れる
 *   3. このスクリプト（GitHub Actions で1時間ごと）が:
 *      a. 承認済みでまだ予約していない投稿を、投稿予定の日時で Buffer に予約する（状態=予約済み）
 *      b. 予約済みで投稿予定を過ぎたものは Buffer に結果を聞き、投稿済み/エラーと投稿URLを Notion に書き戻す
 *
 * 安全策:
 *   - 承認にチェックが無いものは予約しない
 *   - 予約の前に「処理中」と書いてから Buffer に送る（途中で止まっても二重に予約しない）
 *   - 投稿予定を過ぎてから承認されたものは「すぐ投稿」になるので、1回の実行で1件まで
 *   - 文字数（X の数え方で 280）を超えるものは予約せずエラーにする
 *   - Buffer の予約数の上限（無料プラン）に当たったら、下書きに戻して次の実行で再挑戦する
 *   - 必要な Secrets が未登録なら何もせず正常終了する（セットアップ前に赤くならない）
 *   - Buffer API の呼び出しは必要なときだけ（無料プランの月間リクエスト数に収めるため）
 *
 * 環境変数:
 *   NOTION_TOKEN, X_QUEUE_DATA_SOURCE_ID, BUFFER_API_KEY
 *   BUFFER_CHANNEL_ID … 省略可。省略時は Buffer に連携した X（twitter）のチャンネルを自動で探す
 *   DRY_RUN=1 … Buffer へは送らず、対象と文字数だけ表示する（Notion も書き換えない）
 */

const NOTION_VERSION = '2025-09-03';
const BUFFER_URL = 'https://api.buffer.com';
const env = process.env;
const DRY_RUN = env.DRY_RUN === '1';
const now = () => new Date();

// ---- X の文字数の数え方（twitter-text の重み付け） -------------------------
// 半角英数・記号などは1、日本語（全角）や絵文字は2として数え、合計 280 まで。
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

// Notion の日付（時刻なしなら日本時間の 12:00 とみなす）
export function parseDue(start) {
  if (!start) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return new Date(`${start}T12:00:00+09:00`);
  const d = new Date(start);
  return isNaN(d) ? null : d;
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
const rich = (s) => (s ? [{ text: { content: String(s).slice(0, 1900) } }] : []);

function queryQueue(filter) {
  return notion('POST', `/data_sources/${env.X_QUEUE_DATA_SOURCE_ID}/query`, {
    filter,
    sorts: [{ property: '投稿予定', direction: 'ascending' }],
    page_size: 20,
  }).then((r) => r.results);
}

// 承認済みで、まだ Buffer に送っていないもの（状態が空 or 下書き）
const findApproved = () => queryQueue({
  and: [
    { property: '承認', checkbox: { equals: true } },
    { or: [
      { property: '状態', select: { is_empty: true } },
      { property: '状態', select: { equals: '下書き' } },
    ] },
  ],
});

// 予約済みで、投稿予定を過ぎたもの（結果を確認する）
const findScheduledDue = () => queryQueue({
  and: [
    { property: '状態', select: { equals: '予約済み' } },
    { property: '投稿予定', date: { on_or_before: now().toISOString() } },
  ],
});

function updatePage(pageId, { status, url, error, bufferId }) {
  const properties = {};
  if (status !== undefined) properties['状態'] = { select: { name: status } };
  if (url !== undefined) properties['投稿URL'] = { url: url || null };
  if (error !== undefined) properties['エラー内容'] = { rich_text: rich(error) };
  if (bufferId !== undefined) properties['Buffer ID'] = { rich_text: rich(bufferId) };
  return notion('PATCH', `/pages/${pageId}`, { properties });
}

// ---- Buffer（GraphQL: https://developers.buffer.com） -----------------------
async function buffer(query, variables) {
  const res = await fetch(BUFFER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.BUFFER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    throw new Error(`Buffer ${res.status}: ${(json.errors || []).map((e) => e.message).join(' / ') || JSON.stringify(json)}`);
  }
  return json.data;
}

let channelIdCache = env.BUFFER_CHANNEL_ID || null;
async function getChannelId() {
  if (channelIdCache) return channelIdCache;
  const { account } = await buffer('query { account { organizations { id name } } }');
  const found = [];
  for (const org of account.organizations) {
    const { channels } = await buffer(
      'query($input: ChannelsInput!) { channels(input: $input) { id name service } }',
      { input: { organizationId: org.id } },
    );
    found.push(...channels.filter((c) => c.service === 'twitter'));
  }
  if (found.length !== 1) {
    throw new Error(
      `Buffer に連携した X のチャンネルが ${found.length} 件見つかりました。` +
      '1件だけにするか、Secrets に BUFFER_CHANNEL_ID を登録してください: ' +
      found.map((c) => `${c.name}=${c.id}`).join(', '),
    );
  }
  channelIdCache = found[0].id;
  console.log(`Buffer のチャンネル: ${found[0].name} (${channelIdCache})`);
  return channelIdCache;
}

const CREATE_POST = `
mutation($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess { post { id dueAt status } }
    ... on MutationError { message }
  }
}`;

async function createBufferPost(text, due) {
  const channelId = await getChannelId();
  // 5分以上先なら指定時刻で予約。過ぎている（直前の）ものはすぐ投稿する
  const future = due && due.getTime() - now().getTime() > 5 * 60 * 1000;
  const input = {
    text,
    channelId,
    schedulingType: 'automatic',
    mode: future ? 'customScheduled' : 'shareNow',
    ...(future ? { dueAt: due.toISOString() } : {}),
    source: '28tools-x-queue',
  };
  const { createPost } = await buffer(CREATE_POST, { input });
  return { ...createPost, immediate: !future };
}

const GET_POST = `
query($input: PostInput!) {
  post(input: $input) { id status externalLink sentAt error { message } }
}`;

// ---- main ------------------------------------------------------------------
async function scheduleApproved() {
  const items = await findApproved();
  if (!items.length) { console.log('予約待ちの承認済み投稿はありません。'); return; }
  console.log(`予約待ち ${items.length} 件`);

  let immediateUsed = false;
  for (const page of items) {
    const title = plain(page.properties['見出し']?.title);
    const text = plain(page.properties['本文']?.rich_text).trim();
    const due = parseDue(page.properties['投稿予定']?.date?.start);
    const len = weightedLength(text);
    console.log(`- 「${title}」 予定 ${due ? due.toISOString() : '(未設定)'} / 文字数(X換算) ${len}/280`);

    const problem = !text ? '本文が空です'
      : len > 280 ? `文字数オーバー（X換算 ${len}/280）。本文を短くして、状態を「下書き」に戻してください`
      : !due ? '投稿予定の日時が入っていません。入れてから状態を「下書き」に戻してください'
      : null;
    if (problem) {
      console.log('  → 予約しません: ' + problem);
      if (!DRY_RUN) await updatePage(page.id, { status: 'エラー', error: problem });
      continue;
    }

    const immediate = due.getTime() - now().getTime() <= 5 * 60 * 1000;
    if (immediate && immediateUsed) { console.log('  → すぐ投稿は1回1件まで。次の実行に回します'); continue; }
    if (DRY_RUN) { console.log(`  → DRY_RUN（${immediate ? 'すぐ投稿' : '予約'}）\n${text}`); continue; }

    // 二重予約の防止: 先に「処理中」の印を付けてから Buffer に送る
    await updatePage(page.id, { status: 'エラー', error: 'Buffer へ予約処理中。この表示のまま残っている場合は Buffer の予約一覧を確認してください' });
    let result;
    try {
      result = await createBufferPost(text, due);
    } catch (e) {
      await updatePage(page.id, { status: 'エラー', error: String(e.message || e) });
      throw e;
    }
    if (result.__typename === 'PostActionSuccess') {
      await updatePage(page.id, { status: '予約済み', error: '', bufferId: result.post.id });
      console.log(`  → Buffer に${result.immediate ? 'すぐ投稿で' : ''}予約しました (${result.post.id})`);
      if (result.immediate) immediateUsed = true;
    } else if (/LimitReached/.test(result.__typename)) {
      await updatePage(page.id, { status: '下書き', error: `Buffer の予約数の上限です。次の実行で再挑戦します（${result.message}）` });
      console.log('  → Buffer の予約上限。残りは次の実行に回します');
      return;
    } else {
      await updatePage(page.id, { status: 'エラー', error: `${result.__typename}: ${result.message || ''}` });
      console.log(`  → 予約できませんでした: ${result.__typename} ${result.message || ''}`);
    }
  }
}

async function syncResults() {
  const items = await findScheduledDue();
  if (!items.length) return;
  console.log(`結果確認 ${items.length} 件`);
  for (const page of items) {
    const id = plain(page.properties['Buffer ID']?.rich_text).trim();
    if (!id) continue;
    const { post } = await buffer(GET_POST, { input: { id } });
    if (!post) {
      if (!DRY_RUN) await updatePage(page.id, { status: 'エラー', error: 'Buffer に予約が見つかりません（Buffer 側で削除された可能性）' });
      continue;
    }
    console.log(`- ${id}: ${post.status}`);
    if (DRY_RUN) continue;
    if (post.status === 'sent') {
      await updatePage(page.id, { status: '投稿済み', url: post.externalLink || null, error: '' });
    } else if (post.status === 'error') {
      await updatePage(page.id, { status: 'エラー', error: post.error?.message || 'Buffer で投稿に失敗しました' });
    }
    // scheduled / sending のときはそのまま（次の実行で再確認）
  }
}

async function main() {
  const missing = ['NOTION_TOKEN', 'X_QUEUE_DATA_SOURCE_ID', 'BUFFER_API_KEY'].filter((k) => !env[k]);
  if (missing.length) {
    console.log(`未設定の Secrets があるため何もしません: ${missing.join(', ')}`);
    return;
  }
  await scheduleApproved();
  await syncResults();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
