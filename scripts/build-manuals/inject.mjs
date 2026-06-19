#!/usr/bin/env node
/**
 * マニュアル本文の「ビルド時焼き込み（prerender）」スクリプト
 * =========================================================
 *
 * 目的:
 *   manual/*.html は元々、訪問者のブラウザで実行時に
 *   https://28yu.github.io/Revit-Add-ins/Features/<FEATURE_ID>.md を fetch して
 *   描画していた。そのため生 HTML は「読み込み中...」だけで、AdSense/検索エンジンが
 *   本文を読めない（= 低品質コンテンツ判定の原因）。
 *
 *   このスクリプトは、その Markdown を CI（デプロイ時）に取得して HTML へ変換し、
 *   <article id="md-content"> の中身として焼き込む。執筆の単一ソースは
 *   アドイン開発リポジトリ（28yu/Revit-Add-ins）のまま変わらない。
 *
 * 取得元:
 *   - 既定:   https://28yu.github.io/Revit-Add-ins/Features/<FEATURE_ID>.md（本番 CI 用）
 *   - 上書き: 環境変数 MANUAL_SRC_DIR を指定すると、そのローカルディレクトリの
 *             <FEATURE_ID>.md を読む（オフラインでの初期ベイク用）
 *
 * 性質:
 *   - 冪等（同じ入力なら同じ出力。何度実行しても差分が暴れない）
 *   - FEATURE_ID は各 HTML 内のスクリプトから自動検出するので、ページ追加時に
 *     このスクリプトを編集する必要はない
 *   - FEATURE_ID を持たないページ（手書きの静的マニュアル）はスキップする
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MANUAL_DIR = path.join(REPO_ROOT, 'manual');

const REMOTE_BASE = 'https://28yu.github.io/Revit-Add-ins/Features/';
const SRC_DIR = process.env.MANUAL_SRC_DIR
  ? path.resolve(process.env.MANUAL_SRC_DIR)
  : null;

// GFM（表・チェックリスト等）を有効化。出力は自リポジトリの信頼済みドキュメントなので
// サニタイズは行わない（Markdown 内の HTML はそのまま通す）。
marked.setOptions({ gfm: true, breaks: false });

// 各ページの埋め込みスクリプトから FEATURE_ID を取り出す
const FEATURE_ID_RE = /var\s+FEATURE_ID\s*=\s*'([^']+)'/;

// <article id="md-content" ...>...</article> の中身を差し替える
const ARTICLE_RE = /<article id="md-content"[^>]*>[\s\S]*?<\/article>/;

// 実行時 fetch を行っていた IIFE スクリプトブロック（焼き込み済みなら短絡する版に置換）
const RUNTIME_SCRIPT_RE = /<script>\s*\(function\s*\(\)\s*\{[\s\S]*?var\s+FEATURE_ID[\s\S]*?\}\)\(\);?\s*<\/script>/;

function buildArticle(featureId, html) {
  return (
    '<article id="md-content" class="md-content" data-baked="true">\n' +
    `        <!-- AUTO-GENERATED: 本文は scripts/build-manuals により Revit-Add-ins/Features/${featureId}.md から焼き込み。手動編集しないこと -->\n` +
    html.trim() +
    '\n        </article>'
  );
}

function buildRuntimeScript(featureId) {
  // 焼き込み済み（data-baked="true"）ページではランタイム取得をスキップ。
  // クローラー・低速回線・github.io 障害時でも本文を保持できる。
  // 万一 data-baked が無い（未ベイク）ページでは従来どおりフォールバックで取得する。
  return (
    '<script>\n' +
    '    (function() {\n' +
    `        var FEATURE_ID = '${featureId}';\n` +
    "        var el = document.getElementById('md-content');\n" +
    "        if (!el || el.getAttribute('data-baked') === 'true') return; // 本文はビルド時に焼き込み済み\n" +
    "        var MD_URL = 'https://28yu.github.io/Revit-Add-ins/Features/' + FEATURE_ID + '.md';\n" +
    '        fetch(MD_URL)\n' +
    "            .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })\n" +
    '            .then(function(md) { if (window.marked) el.innerHTML = window.marked.parse(md); })\n' +
    '            .catch(function(e) { console.error(e); });\n' +
    '    })();\n' +
    '    </script>'
  );
}

async function loadMarkdown(featureId) {
  if (SRC_DIR) {
    const file = path.join(SRC_DIR, `${featureId}.md`);
    return await readFile(file, 'utf8');
  }
  const url = REMOTE_BASE + encodeURIComponent(featureId) + '.md';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function main() {
  const files = (await readdir(MANUAL_DIR))
    .filter((f) => f.endsWith('.html'))
    .sort();

  let baked = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  console.log(
    `Source: ${SRC_DIR ? `local dir ${SRC_DIR}` : REMOTE_BASE}\n` +
      `Scanning ${files.length} files in ${MANUAL_DIR}\n`
  );

  for (const name of files) {
    const filePath = path.join(MANUAL_DIR, name);
    let src = await readFile(filePath, 'utf8');

    const idMatch = src.match(FEATURE_ID_RE);
    if (!idMatch) {
      console.log(`- ${name}: FEATURE_ID なし → スキップ（静的ページ）`);
      skipped++;
      continue;
    }
    const featureId = idMatch[1];

    if (!ARTICLE_RE.test(src)) {
      console.warn(`! ${name}: <article id="md-content"> が見つからない → スキップ`);
      failed++;
      failures.push(name);
      continue;
    }

    let md;
    try {
      md = await loadMarkdown(featureId);
    } catch (e) {
      console.warn(`! ${name} (${featureId}): Markdown 取得失敗 → 既存のまま維持: ${e.message}`);
      failed++;
      failures.push(`${name} (${featureId})`);
      continue;
    }

    const html = marked.parse(md);
    const next = src
      .replace(ARTICLE_RE, () => buildArticle(featureId, html))
      .replace(RUNTIME_SCRIPT_RE, () => buildRuntimeScript(featureId));

    if (next !== src) {
      await writeFile(filePath, next, 'utf8');
      console.log(`✓ ${name} (${featureId}): 焼き込み更新`);
    } else {
      console.log(`= ${name} (${featureId}): 変更なし`);
    }
    baked++;
  }

  console.log(
    `\n完了: 焼き込み対象 ${baked} / 静的スキップ ${skipped} / 失敗 ${failed}`
  );

  // 全ページ取得失敗（取得元が完全に落ちている等）なら CI を失敗させる。
  // 一部失敗は既存内容を維持して続行（サイトを壊さない）。
  if (failed > 0 && baked === 0) {
    console.error(`\nすべてのページで取得に失敗しました: ${failures.join(', ')}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
