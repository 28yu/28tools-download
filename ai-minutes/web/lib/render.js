/* ============================================================
   render.js — 構造化された議事録データを HTML に描画
   4 スタイル: figure (図解) / mindmap (マインドマップ SVG) /
   timeline (時系列) / matrix (担当者別)

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
export const STYLES = ['figure', 'mindmap', 'timeline', 'matrix'];

/**
 * 出力 DOM にレンダリングする。
 *  - 'figure'   : 図解スタイル (カード + 番号バッジ)
 *  - 'mindmap'  : マインドマップ (SVG)
 *  - 'timeline' : タイムライン (議論の流れを時系列に)
 *  - 'matrix'   : 担当者別 ToDo (assignee でグルーピング)
 * どのスタイルも「入力データにある情報だけ」を並べ替えて見せる。
 * 項目同士の関係を推測して線で結ぶようなことはしない (事実忠実性のため)。
 */
export function mountMinutes(container, data, style) {
  const renderer = {
    mindmap: renderMindMap,
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

/* ============================================================
   マインドマップ (SVG)
   中央に会議タイトル、左右に 4 カテゴリ、その先に各項目を配置。
   foreignObject で各ノードを HTML 化し、テキスト折返し・スタイルを簡潔に。
   インラインスタイルのみで完結 → HTML 保存/印刷でもそのまま表示可。
   ============================================================ */
export function renderMindMap(data) {
  const d = data || {};
  const meta = d.meta || {};
  const title = meta.title || t('mn-default-title');

  const cats = [
    { label: t('mn-sec-decisions'), color: '#27ae60',
      items: (d.decisions || []).map(it => it.text) },
    { label: t('mn-sec-todos'), color: '#3498db',
      items: (d.todos || []).map(it => it.text + (it.due ? `（${it.due}）` : '')) },
    { label: t('mn-sec-issues'), color: '#e67e22',
      items: (d.issues || []).map(it => it.text) },
    { label: t('mn-sec-discussions'), color: '#34495e',
      items: (d.discussions || []).map(it => it.topic || t('mn-topic-default')) },
  ];

  // レイアウト定数
  const M = 20, itemW = 215, itemH = 46, vGap = 10, catW = 150, catH = 46,
        centerW = 200, centerH = 62, hCC = 120, hCI = 50;
  const cx = M + itemW + hCI + catW + hCC; // 中央 x
  const W = cx * 2;

  const sides = [
    { list: [cats[0], cats[1]], right: true },
    { list: [cats[2], cats[3]], right: false },
  ];

  const blockH = (c) => Math.max(catH, c.items.length * (itemH + vGap) - vGap, itemH);
  const sideH = (list) => list.reduce((h, c, i) => h + (i ? 40 : 0) + blockH(c), 0);
  const contentH = Math.max(sideH(sides[0].list), sideH(sides[1].list), centerH);
  const H = contentH + M * 2;
  const cy = H / 2;

  const fo = (x, y, w, h, html) =>
    `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}">${html}</foreignObject>`;

  const nodeDiv = (w, h, bg, border, inner, weight, fs) =>
    `<div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;text-align:center;padding:4px 9px;border-radius:12px;background:${bg};border:2px solid ${border};color:#2c3e50;font-family:'Noto Sans JP',sans-serif;font-size:${fs || 12}px;font-weight:${weight || 400};line-height:1.25;overflow:hidden;"><span style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${inner}</span></div>`;

  const curve = (x1, y1, x2, y2, color) => {
    const mx = (x1 + x2) / 2;
    return `<path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2" opacity="0.6"/>`;
  };

  const paths = [];
  const nodes = [];

  sides.forEach(({ list, right }) => {
    const total = sideH(list);
    let y = cy - total / 2;
    const catX = right ? (cx + hCC) : (cx - hCC - catW);
    const itemX = right ? (catX + catW + hCI) : (catX - hCI - itemW);
    const centerEdgeX = right ? (cx + centerW / 2) : (cx - centerW / 2);
    const catNearX = right ? catX : (catX + catW);    // 中央側のカテゴリ端
    const catFarX = right ? (catX + catW) : catX;     // 項目側のカテゴリ端
    const itemNearX = right ? itemX : (itemX + itemW);

    list.forEach((c) => {
      const bH = blockH(c);
      const catCY = y + bH / 2;
      // 中央 → カテゴリ
      paths.push(curve(centerEdgeX, cy, catNearX, catCY, c.color));
      // カテゴリノード
      nodes.push(fo(catX, catCY - catH / 2, catW, catH,
        nodeDiv(catW, catH, c.color + '22', c.color,
          `${esc(c.label)}（${c.items.length}）`, 700, 13)));
      // 項目
      const n = c.items.length;
      const itemsH = n * (itemH + vGap) - vGap;
      let iy = catCY - itemsH / 2;
      c.items.forEach((txt) => {
        const itemCY = iy + itemH / 2;
        paths.push(curve(catFarX, catCY, itemNearX, itemCY, c.color));
        nodes.push(fo(itemX, iy, itemW, itemH,
          nodeDiv(itemW, itemH, '#ffffff', c.color + '88', esc(txt))));
        iy += itemH + vGap;
      });
      y += bH + 40;
    });
  });

  // 中央ノード
  nodes.push(fo(cx - centerW / 2, cy - centerH / 2, centerW, centerH,
    nodeDiv(centerW, centerH, '#2c3e50', '#2c3e50',
      `<span style="color:#fff;">${esc(title)}</span>`, 700, 14)));

  // メタ情報 (アイコンなし・ラベル付き)
  const metaParts = [];
  if (meta.date) metaParts.push(`${esc(t('txt-date'))}：${esc(meta.date)}`);
  if (meta.location) metaParts.push(`${esc(t('txt-location'))}：${esc(meta.location)}`);
  if (meta.project) metaParts.push(`${esc(t('txt-project'))}：${esc(meta.project)}`);
  if (Array.isArray(meta.attendees) && meta.attendees.length) metaParts.push(`${esc(t('txt-attendees'))}：${esc(meta.attendees.join('、'))}`);

  const svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;">${paths.join('')}${nodes.join('')}</svg>`;

  return `<div class="mn-mindmap">
    ${metaParts.length ? `<div class="mn-mm-meta">${metaParts.join('　')}</div>` : ''}
    <div class="mn-mindmap-wrap">${svg}</div>
    <div class="mn-footnote">${t('mn-footnote')}</div>
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
