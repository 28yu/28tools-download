/* ============================================================
   render.js — 構造化された議事録データを HTML に描画
   3 スタイル: figure (図解) / timeline (時系列) / matrix (担当者別)

   入力データ形 (gemini.js / transcribe.js が返す共通スキーマ):
   {
     meta: { title, date, location, project, attendees: [..] },
     summary: "全体サマリ文",
     decisions:   [{ text, speaker, refs:[..] }],
     todos:       [{ text, assignee, due }],
     issues:      [{ text, speaker }],
     discussions: [{ topic, points:[..], speaker }]
   }
   ============================================================ */
import { t } from './i18n.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// 改行を <br> に (esc 済み文字列に対して使用)
const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

// 「ラベル：値」形式の控えめなメタ表記 (アイコンは使わない)
function metaTag(label, value) {
  if (!value) return '';
  return `<span class="mn-meta-tag"><span class="mn-meta-tag-label">${esc(label)}</span>${esc(value)}</span>`;
}

function refsTags(refs) {
  if (!Array.isArray(refs)) return '';
  return refs.filter(Boolean).map(r => metaTag(t('txt-ref'), r)).join('');
}

// 番号付きの 1 項目 (アイコンなし・番号バッジ + 本文 + メタ)
function itemRow(n, text, metaHtml) {
  return `
    <div class="mn-item">
      <span class="mn-item-num">${n}</span>
      <div class="mn-item-body">
        <p class="mn-item-text">${esc(text)}</p>
        ${metaHtml ? `<p class="mn-item-meta">${metaHtml}</p>` : ''}
      </div>
    </div>`;
}

function section(key, title, innerHtml, count) {
  if (!innerHtml) {
    innerHtml = `<p class="mn-empty">${t('mn-empty')}</p>`;
  }
  return `
    <section class="mn-section mn-sec-${key}">
      <h2 class="mn-section-head">
        <span class="mn-sec-bar"></span>
        <span class="mn-sec-title">${esc(title)}</span>
        ${typeof count === 'number' ? `<span class="mn-sec-count">${t('mn-count', { n: count })}</span>` : ''}
      </h2>
      ${innerHtml}
    </section>`;
}

export function renderMinutes(data, style) {
  const d = data || {};
  const meta = d.meta || {};

  // --- ヘッダー (タイトル + メタを罫線下に) ---
  const metaParts = [];
  if (meta.date) metaParts.push(metaTag(t('txt-date'), meta.date));
  if (meta.location) metaParts.push(metaTag(t('txt-location'), meta.location));
  if (meta.project) metaParts.push(metaTag(t('txt-project'), meta.project));
  if (Array.isArray(meta.attendees) && meta.attendees.length) {
    metaParts.push(metaTag(t('txt-attendees'), meta.attendees.join('、')));
  }
  const header = `
    <header class="mn-header">
      <h1 class="mn-title">${esc(meta.title || t('mn-default-title'))}</h1>
      ${metaParts.length ? `<div class="mn-meta">${metaParts.join('')}</div>` : ''}
    </header>`;

  // --- 概要 (見出し付きセクションとして) ---
  const summary = d.summary
    ? `<section class="mn-section mn-sec-summary">
        <h2 class="mn-section-head"><span class="mn-sec-bar"></span><span class="mn-sec-title">${t('txt-overview')}</span></h2>
        <p class="mn-summary">${nl2br(d.summary)}</p>
      </section>` : '';

  // --- 決定事項 ---
  const decisions = (d.decisions || []).map((it, i) =>
    itemRow(i + 1, it.text, metaTag(t('txt-speaker'), it.speaker) + refsTags(it.refs))
  ).join('');

  // --- ToDo ---
  const todos = (d.todos || []).map((it, i) =>
    itemRow(i + 1, it.text, metaTag(t('txt-assignee'), it.assignee) + metaTag(t('txt-due'), it.due))
  ).join('');

  // --- 課題 ---
  const issues = (d.issues || []).map((it, i) =>
    itemRow(i + 1, it.text, metaTag(t('txt-speaker'), it.speaker))
  ).join('');

  // --- 議論の流れ ---
  const discussions = (d.discussions || []).map(it => {
    const points = Array.isArray(it.points) && it.points.length
      ? `<ul>${it.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '';
    return `
      <div class="mn-topic">
        <div class="mn-topic-title">${esc(it.topic || t('mn-topic-default'))}${it.speaker ? `<span class="mn-topic-speaker">${esc(t('txt-speaker'))}：${esc(it.speaker)}</span>` : ''}</div>
        ${points}
      </div>`;
  }).join('');

  const body = [
    header,
    summary,
    section('decisions', t('mn-sec-decisions'), decisions, (d.decisions || []).length),
    section('todos', t('mn-sec-todos'), todos, (d.todos || []).length),
    section('issues', t('mn-sec-issues'), issues, (d.issues || []).length),
    section('discussions', t('mn-sec-discussions'), discussions, (d.discussions || []).length),
    `<div class="mn-footnote">${t('mn-footnote')}</div>`,
  ].join('\n');

  return body;
}

// 利用可能な出力スタイル (index.html の style-toggle と対応)
export const STYLES = ['figure', 'timeline', 'matrix'];

/**
 * 出力 DOM にレンダリングする。
 *  - 'figure'   : 図解スタイル (カード + 番号バッジ)
 *  - 'timeline' : タイムライン (議論の流れを時系列に)
 *  - 'matrix'   : 担当者別 ToDo (assignee でグルーピング)
 * どのスタイルも「入力データにある情報だけ」を並べ替えて見せる。
 * 項目同士の関係を推測して線で結ぶようなことはしない (事実忠実性のため)。
 */
export function mountMinutes(container, data, style) {
  const renderer = {
    timeline: renderTimeline,
    matrix: renderMatrix,
  }[style];

  container.innerHTML = renderer ? renderer(data) : renderMinutes(data, style);
  STYLES.forEach(s => container.classList.toggle('style-' + s, s === (renderer ? style : 'figure')));
}

/* ============================================================
   共通パーツ (timeline / matrix で使う)
   ============================================================ */

// 議事録ヘッダー (タイトル + メタ)。figure スタイルと同じ見た目。
function docHeader(meta) {
  const parts = [];
  if (meta.date) parts.push(metaTag(t('txt-date'), meta.date));
  if (meta.location) parts.push(metaTag(t('txt-location'), meta.location));
  if (meta.project) parts.push(metaTag(t('txt-project'), meta.project));
  if (Array.isArray(meta.attendees) && meta.attendees.length) {
    parts.push(metaTag(t('txt-attendees'), meta.attendees.join('、')));
  }
  return `
    <header class="mn-header">
      <h1 class="mn-title">${esc(meta.title || t('mn-default-title'))}</h1>
      ${parts.length ? `<div class="mn-meta">${parts.join('')}</div>` : ''}
    </header>`;
}

const footnote = () => `<div class="mn-footnote">${t('mn-footnote')}</div>`;

/* ============================================================
   タイムライン
   議論の流れ (discussions) を時系列の軸に並べ、その下に
   「この打合せの結論」として決定事項・ToDo を置く。
   ============================================================ */
export function renderTimeline(data) {
  const d = data || {};
  const meta = d.meta || {};

  const steps = (d.discussions || []).map((it, i) => {
    const points = Array.isArray(it.points) && it.points.length
      ? `<ul class="mn-tl-points">${it.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '';
    return `
      <li class="mn-tl-step">
        <span class="mn-tl-dot">${i + 1}</span>
        <div class="mn-tl-body">
          <div class="mn-tl-topic">${esc(it.topic || t('mn-topic-default'))}${
            it.speaker ? `<span class="mn-tl-speaker">${esc(t('txt-speaker'))}：${esc(it.speaker)}</span>` : ''}</div>
          ${points}
        </div>
      </li>`;
  }).join('');

  const flow = steps
    ? `<ol class="mn-tl">${steps}</ol>`
    : `<p class="mn-empty">${t('mn-empty')}</p>`;

  // 結論カード (決定事項 / ToDo)
  const card = (key, title, items, fmt) => `
    <div class="mn-tl-card mn-tl-card-${key}">
      <div class="mn-tl-card-head">${esc(title)}<span class="mn-sec-count">${t('mn-count', { n: items.length })}</span></div>
      ${items.length
        ? `<ul class="mn-tl-card-list">${items.map(it => `<li>${fmt(it)}</li>`).join('')}</ul>`
        : `<p class="mn-empty">${t('mn-empty')}</p>`}
    </div>`;

  const conclusion = `
    <div class="mn-tl-conclusion">
      ${card('decisions', t('mn-sec-decisions'), d.decisions || [],
        it => esc(it.text) + (it.speaker ? `<span class="mn-tl-tag">${esc(it.speaker)}</span>` : ''))}
      ${card('todos', t('mn-sec-todos'), d.todos || [],
        it => esc(it.text)
          + (it.assignee ? `<span class="mn-tl-tag">${esc(it.assignee)}</span>` : '')
          + (it.due ? `<span class="mn-tl-tag mn-tl-tag-due">${esc(it.due)}</span>` : ''))}
    </div>`;

  const issues = (d.issues || []).length
    ? section('issues', t('mn-sec-issues'),
        d.issues.map((it, i) => itemRow(i + 1, it.text, metaTag(t('txt-speaker'), it.speaker))).join(''),
        d.issues.length)
    : '';

  return `<div class="mn-timeline">
    ${docHeader(meta)}
    ${d.summary ? `<p class="mn-summary mn-tl-summary">${nl2br(d.summary)}</p>` : ''}
    <h2 class="mn-section-head"><span class="mn-sec-bar"></span><span class="mn-sec-title">${t('mn-tl-flow')}</span></h2>
    ${flow}
    <h2 class="mn-section-head"><span class="mn-sec-bar"></span><span class="mn-sec-title">${t('mn-tl-conclusion')}</span></h2>
    ${conclusion}
    ${issues}
    ${footnote()}
  </div>`;
}

/* ============================================================
   担当者別 ToDo (マトリクス)
   todos を assignee でグルーピングする。assignee は Gemini が
   入力から拾った値のみ (無ければ「未割当」に入れる＝推測しない)。
   ============================================================ */
export function renderMatrix(data) {
  const d = data || {};
  const meta = d.meta || {};

  // assignee → todos[] (出現順を保つ)
  const groups = new Map();
  (d.todos || []).forEach(it => {
    const key = (it.assignee || '').trim() || ' unassigned';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  });

  const cards = [...groups.entries()].map(([who, items]) => {
    const label = who === ' unassigned' ? t('mn-mx-unassigned') : who;
    const rows = items.map(it => `
      <li class="mn-mx-row">
        <span class="mn-mx-text">${esc(it.text)}</span>
        ${it.due ? `<span class="mn-mx-due">${esc(t('txt-due'))}：${esc(it.due)}</span>` : ''}
      </li>`).join('');
    return `
      <div class="mn-mx-card${who === ' unassigned' ? ' mn-mx-card-none' : ''}">
        <div class="mn-mx-head">
          <span class="mn-mx-who">${esc(label)}</span>
          <span class="mn-sec-count">${t('mn-count', { n: items.length })}</span>
        </div>
        <ul class="mn-mx-list">${rows}</ul>
      </div>`;
  }).join('');

  const grid = cards
    ? `<div class="mn-mx-grid">${cards}</div>`
    : `<p class="mn-empty">${t('mn-empty')}</p>`;

  const decisions = (d.decisions || []).map((it, i) =>
    itemRow(i + 1, it.text, metaTag(t('txt-speaker'), it.speaker) + refsTags(it.refs))).join('');
  const issues = (d.issues || []).map((it, i) =>
    itemRow(i + 1, it.text, metaTag(t('txt-speaker'), it.speaker))).join('');

  return `<div class="mn-matrix">
    ${docHeader(meta)}
    ${d.summary ? `<p class="mn-summary mn-tl-summary">${nl2br(d.summary)}</p>` : ''}
    <h2 class="mn-section-head"><span class="mn-sec-bar"></span><span class="mn-sec-title">${t('mn-mx-title')}</span></h2>
    ${grid}
    ${section('decisions', t('mn-sec-decisions'), decisions, (d.decisions || []).length)}
    ${section('issues', t('mn-sec-issues'), issues, (d.issues || []).length)}
    ${footnote()}
  </div>`;
}

/**
 * プレーンテキスト化 (コピー用)
 */
export function minutesToText(data) {
  const d = data || {};
  const meta = d.meta || {};
  const lines = [];
  lines.push(`【${meta.title || t('mn-default-title')}】`);
  if (meta.date) lines.push(`${t('txt-date')}: ${meta.date}`);
  if (meta.location) lines.push(`${t('txt-location')}: ${meta.location}`);
  if (meta.project) lines.push(`${t('txt-project')}: ${meta.project}`);
  if (Array.isArray(meta.attendees) && meta.attendees.length) lines.push(`${t('txt-attendees')}: ${meta.attendees.join('、')}`);
  lines.push('');
  if (d.summary) { lines.push(`■ ${t('txt-overview')}`); lines.push(d.summary); lines.push(''); }

  const sec = (title, arr, fmt) => {
    lines.push(`■ ${title}`);
    if (!arr || !arr.length) { lines.push(t('mn-empty')); }
    else arr.forEach((it, i) => lines.push(`${i + 1}. ${fmt(it)}`));
    lines.push('');
  };
  sec(t('mn-sec-decisions'), d.decisions, it => it.text + (it.speaker ? `（${it.speaker}）` : ''));
  sec(t('mn-sec-todos'), d.todos, it => it.text
    + (it.assignee ? `［${t('txt-assignee')}:${it.assignee}］` : '') + (it.due ? `［${t('txt-due')}:${it.due}］` : ''));
  sec(t('mn-sec-issues'), d.issues, it => it.text + (it.speaker ? `（${it.speaker}）` : ''));
  lines.push(`■ ${t('mn-sec-discussions')}`);
  if (!d.discussions || !d.discussions.length) lines.push(t('mn-empty'));
  else d.discussions.forEach(it => {
    lines.push(`・${it.topic || t('mn-topic-default')}${it.speaker ? `（${it.speaker}）` : ''}`);
    (it.points || []).forEach(p => lines.push(`    - ${p}`));
  });
  lines.push('');
  lines.push(t('txt-footer'));
  return lines.join('\n');
}
