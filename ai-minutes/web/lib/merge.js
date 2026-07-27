/* ============================================================
   merge.js — 分割セグメントの議事録を 1 本に結合
   長時間モードでは 10 分ごとの各セグメントを Gemini が個別に議事録化する。
   それらを決定的に（AI 追加呼び出しなしで）1 つの議事録データに束ねる。

   方針:
   - meta: 最初に得られたセグメントの meta をベースに、出席者は全セグメントの和集合。
   - summary: 各セグメントの要約を「【0〜10分】…」のように時間帯付きで連結。
   - decisions / todos / issues: 各セグメントの配列を時系列に連結。
   - discussions: トピック名の頭に時間帯ラベルを付けて連結（1 時間の流れを追いやすく）。
   データ形は render.js / gemini.js の共通スキーマと同一。
   ============================================================ */

/** 秒 → 「m分」表記（分に丸め）。 */
function toMin(sec) {
  return Math.max(0, Math.round((sec || 0) / 60));
}

/** セグメントの時間帯ラベル（例: 「0〜10分」）。 */
export function segmentLabel(seg) {
  const from = toMin(seg.startSec);
  const to = toMin((seg.startSec || 0) + (seg.durationSec || 0));
  return `${from}〜${to}分`;
}

/**
 * 完了済みセグメント（{ startSec, durationSec, data } を持つ）を結合する。
 * @param {Array} segments  index 順に並んだセグメント配列（穴・未完了は無視）
 * @returns {Object|null}   結合済み議事録データ。完了が無ければ null
 */
export function mergeSegments(segments) {
  const done = (segments || []).filter(s => s && s.data);
  if (!done.length) return null;

  const first = done[0].data || {};
  const meta = Object.assign({}, first.meta || {});

  // 出席者は全セグメントの和集合（順序維持）
  const seen = new Set();
  const attendees = [];
  done.forEach(s => {
    const list = (s.data.meta && Array.isArray(s.data.meta.attendees)) ? s.data.meta.attendees : [];
    list.forEach(a => { const v = String(a || '').trim(); if (v && !seen.has(v)) { seen.add(v); attendees.push(v); } });
  });
  if (attendees.length) meta.attendees = attendees;

  const merged = {
    meta,
    summary: '',
    decisions: [],
    todos: [],
    issues: [],
    discussions: [],
  };

  const summaryLines = [];
  done.forEach(s => {
    const label = segmentLabel(s);
    const d = s.data || {};

    const sm = (d.summary || '').trim();
    if (sm) summaryLines.push(`【${label}】${sm}`);

    (d.decisions || []).forEach(x => merged.decisions.push(x));
    (d.todos || []).forEach(x => merged.todos.push(x));
    (d.issues || []).forEach(x => merged.issues.push(x));
    (d.discussions || []).forEach(x => {
      const topic = String((x && x.topic) || '').trim();
      merged.discussions.push(Object.assign({}, x, { topic: `[${label}] ${topic}`.trim() }));
    });
  });

  merged.summary = summaryLines.join('\n');
  return merged;
}
