/* ============================================================
   render.js — 構造化された議事録データを HTML に描画
   2 スタイル: figure (図解 / Lucide アイコン) と mindmap (マインドマップ / SVG)

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

// Lucide アイコン名 (図解スタイルで使用)
const ICONS = {
  decisions: 'check-circle-2',
  todos: 'list-todo',
  issues: 'alert-triangle',
  discussions: 'messages-square',
  decisionItem: 'check',
  todoItem: 'square-check-big',
  issueItem: 'alert-circle',
  calendar: 'calendar',
  pin: 'map-pin',
  building: 'building-2',
  users: 'users',
};

function iconSvg(name) {
  // Lucide UMD は data 属性経由で後から createIcons() で差し替える
  return `<i data-lucide="${esc(name)}"></i>`;
}

function tag(cls, label, value) {
  if (!value) return '';
  return `<span class="mn-tag ${cls}">${label}${esc(value)}</span>`;
}

function refsTags(refs) {
  if (!Array.isArray(refs)) return '';
  return refs.filter(Boolean).map(r => `<span class="mn-tag ref">📎 ${esc(r)}</span>`).join('');
}

function cardItem(iconName, text, tagsHtml) {
  return `
    <div class="mn-card">
      <div class="mn-card-ico">${iconSvg(iconName)}</div>
      <div class="mn-card-body">
        <p class="mn-card-text">${esc(text)}</p>
        ${tagsHtml ? `<div class="mn-tags">${tagsHtml}</div>` : ''}
      </div>
    </div>`;
}

function section(key, headIcon, title, innerHtml, count) {
  if (!innerHtml) {
    innerHtml = `<p class="mn-empty">${t('mn-empty')}</p>`;
  }
  return `
    <div class="mn-section mn-sec-${key}">
      <div class="mn-section-head">
        <span class="mn-ico">${iconSvg(headIcon)}</span>
        ${esc(title)}${typeof count === 'number' ? t('mn-count', { n: count }) : ''}
      </div>
      ${innerHtml}
    </div>`;
}

export function renderMinutes(data, style) {
  const d = data || {};
  const meta = d.meta || {};

  // --- ヘッダー ---
  const metaParts = [];
  if (meta.date) metaParts.push(`<span>${iconSvg(ICONS.calendar)} ${esc(meta.date)}</span>`);
  if (meta.location) metaParts.push(`<span>${iconSvg(ICONS.pin)} ${esc(meta.location)}</span>`);
  if (meta.project) metaParts.push(`<span>${iconSvg(ICONS.building)} ${esc(meta.project)}</span>`);
  if (Array.isArray(meta.attendees) && meta.attendees.length) {
    metaParts.push(`<span>${iconSvg(ICONS.users)} ${esc(meta.attendees.join('、'))}</span>`);
  }
  const header = `
    <div class="mn-header">
      <h1 class="mn-title">${esc(meta.title || t('mn-default-title'))}</h1>
      ${metaParts.length ? `<div class="mn-meta">${metaParts.join('')}</div>` : ''}
    </div>`;

  // --- サマリ ---
  const summary = d.summary
    ? `<div class="mn-summary">${esc(d.summary)}</div>` : '';

  // --- 決定事項 ---
  const decisions = (d.decisions || []).map(it =>
    cardItem(ICONS.decisionItem, it.text,
      tag('speaker', '🗣 ', it.speaker) + refsTags(it.refs))
  ).join('');

  // --- ToDo ---
  const todos = (d.todos || []).map(it =>
    cardItem(ICONS.todoItem, it.text,
      tag('assignee', '👤 ', it.assignee) + tag('due', '⏰ ', it.due))
  ).join('');

  // --- 課題 ---
  const issues = (d.issues || []).map(it =>
    cardItem(ICONS.issueItem, it.text, tag('speaker', '🗣 ', it.speaker))
  ).join('');

  // --- 議論の流れ ---
  const discussions = (d.discussions || []).map(it => {
    const points = Array.isArray(it.points) && it.points.length
      ? `<ul>${it.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '';
    return `
      <div class="mn-topic">
        <div class="mn-topic-title">${iconSvg(ICONS.discussions)} ${esc(it.topic || t('mn-topic-default'))}${it.speaker ? `　<span class="mn-tag speaker">🗣 ${esc(it.speaker)}</span>` : ''}</div>
        ${points}
      </div>`;
  }).join('');

  const body = [
    header,
    summary,
    section('decisions', ICONS.decisions, t('mn-sec-decisions'), decisions, (d.decisions || []).length),
    section('todos', ICONS.todos, t('mn-sec-todos'), todos, (d.todos || []).length),
    section('issues', ICONS.issues, t('mn-sec-issues'), issues, (d.issues || []).length),
    section('discussions', ICONS.discussions, t('mn-sec-discussions'), discussions, (d.discussions || []).length),
    `<div class="mn-footnote">${t('mn-footnote')}</div>`,
  ].join('\n');

  return body;
}

/**
 * 出力 DOM にレンダリングする。
 *  - 'figure'  : 図解スタイル (Lucide アイコン + カード)
 *  - 'mindmap' : マインドマップ (SVG)
 */
export function mountMinutes(container, data, style) {
  if (style === 'mindmap') {
    container.innerHTML = renderMindMap(data);
    container.classList.add('style-mindmap');
    container.classList.remove('style-figure');
    return;
  }
  container.innerHTML = renderMinutes(data, style);
  container.classList.add('style-figure');
  container.classList.remove('style-mindmap');

  // 図解スタイル: Lucide アイコンを SVG 化
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons({ attrs: { } }); } catch (e) { /* noop */ }
  }
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
    { label: t('mn-sec-decisions'), emoji: '✅', color: '#27ae60',
      items: (d.decisions || []).map(it => it.text) },
    { label: t('mn-sec-todos'), emoji: '📋', color: '#3498db',
      items: (d.todos || []).map(it => it.text + (it.due ? `（${it.due}）` : '')) },
    { label: t('mn-sec-issues'), emoji: '⚠️', color: '#e67e22',
      items: (d.issues || []).map(it => it.text) },
    { label: t('mn-sec-discussions'), emoji: '💬', color: '#34495e',
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
          `${c.emoji} ${esc(c.label)}（${c.items.length}）`, 700, 13)));
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

  // メタ情報
  const metaParts = [];
  if (meta.date) metaParts.push(`📅 ${esc(meta.date)}`);
  if (meta.location) metaParts.push(`📍 ${esc(meta.location)}`);
  if (Array.isArray(meta.attendees) && meta.attendees.length) metaParts.push(`👥 ${esc(meta.attendees.join('、'))}`);

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
