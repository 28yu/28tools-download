/* ============================================================
   render.js — 構造化された議事録データを HTML に描画
   2 スタイル: figure (図解 / Lucide アイコン) と hand (手描き風 / Rough.js)

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
    innerHtml = `<p class="mn-empty">（該当なし）</p>`;
  }
  return `
    <div class="mn-section mn-sec-${key}">
      <div class="mn-section-head">
        <span class="mn-ico">${iconSvg(headIcon)}</span>
        ${esc(title)}${typeof count === 'number' ? `（${count}件）` : ''}
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
      <h1 class="mn-title">${esc(meta.title || '打合せ議事録')}</h1>
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
        <div class="mn-topic-title">${iconSvg(ICONS.discussions)} ${esc(it.topic || '議題')}${it.speaker ? `　<span class="mn-tag speaker">🗣 ${esc(it.speaker)}</span>` : ''}</div>
        ${points}
      </div>`;
  }).join('');

  const body = [
    header,
    summary,
    section('decisions', ICONS.decisions, '決定事項', decisions, (d.decisions || []).length),
    section('todos', ICONS.todos, 'ToDo・宿題', todos, (d.todos || []).length),
    section('issues', ICONS.issues, '課題・懸念', issues, (d.issues || []).length),
    section('discussions', ICONS.discussions, '議論の流れ', discussions, (d.discussions || []).length),
    `<div class="mn-footnote">AI により自動生成された議事録です。内容は必ずご確認ください。 — 28 Tools</div>`,
  ].join('\n');

  return body;
}

/**
 * 出力 DOM にレンダリングし、スタイルに応じた後処理 (アイコン化 / 手描き枠) を行う。
 */
export function mountMinutes(container, data, style) {
  container.innerHTML = renderMinutes(data, style);
  container.classList.toggle('style-hand', style === 'hand');
  container.classList.toggle('style-figure', style !== 'hand');

  // 図解スタイル: Lucide アイコンを SVG 化
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try { window.lucide.createIcons({ attrs: { } }); } catch (e) { /* noop */ }
  }

  // 手描き風スタイル: カード背景に Rough.js の手描き矩形を敷く
  if (style === 'hand' && window.rough) {
    applyRoughBackgrounds(container);
  }
}

function applyRoughBackgrounds(container) {
  const cards = container.querySelectorAll('.mn-card');
  cards.forEach(card => {
    const w = card.offsetWidth, h = card.offsetHeight;
    if (!w || !h) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'rough-bg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    const rc = window.rough.svg(svg);
    const node = rc.rectangle(3, 3, w - 6, h - 6, {
      roughness: 1.6, bowing: 1.2, stroke: '#34495e', strokeWidth: 1.4,
      fill: '#ffffff', fillStyle: 'solid',
    });
    svg.appendChild(node);
    card.insertBefore(svg, card.firstChild);
  });
}

/**
 * プレーンテキスト化 (コピー用)
 */
export function minutesToText(data) {
  const d = data || {};
  const meta = d.meta || {};
  const lines = [];
  lines.push(`【${meta.title || '打合せ議事録'}】`);
  if (meta.date) lines.push(`日時: ${meta.date}`);
  if (meta.location) lines.push(`場所: ${meta.location}`);
  if (meta.project) lines.push(`案件: ${meta.project}`);
  if (Array.isArray(meta.attendees) && meta.attendees.length) lines.push(`出席: ${meta.attendees.join('、')}`);
  lines.push('');
  if (d.summary) { lines.push('■ 概要'); lines.push(d.summary); lines.push(''); }

  const sec = (title, arr, fmt) => {
    lines.push(`■ ${title}`);
    if (!arr || !arr.length) { lines.push('（該当なし）'); }
    else arr.forEach((it, i) => lines.push(`${i + 1}. ${fmt(it)}`));
    lines.push('');
  };
  sec('決定事項', d.decisions, it => it.text + (it.speaker ? `（${it.speaker}）` : ''));
  sec('ToDo・宿題', d.todos, it => it.text
    + (it.assignee ? `［担当:${it.assignee}］` : '') + (it.due ? `［期限:${it.due}］` : ''));
  sec('課題・懸念', d.issues, it => it.text + (it.speaker ? `（${it.speaker}）` : ''));
  lines.push('■ 議論の流れ');
  if (!d.discussions || !d.discussions.length) lines.push('（該当なし）');
  else d.discussions.forEach(it => {
    lines.push(`・${it.topic || '議題'}${it.speaker ? `（${it.speaker}）` : ''}`);
    (it.points || []).forEach(p => lines.push(`    - ${p}`));
  });
  lines.push('');
  lines.push('— AI により自動生成 (28 Tools)');
  return lines.join('\n');
}
