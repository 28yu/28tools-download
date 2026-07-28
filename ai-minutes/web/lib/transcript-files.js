/* ============================================================
   transcript-files.js — 文字起こしテキストをファイルから読み込む
   対応: .txt / .vtt(WebVTT) / .srt / .docx(Word)
   すべてブラウザ内で解析（サーバ送信なし）。docx は ZIP を自前で読み、
   本文 XML を DecompressionStream('deflate-raw') で展開して <w:t> を抽出。
   ============================================================ */

/** 拡張子で振り分けて、プレーンな文字起こしテキストを返す。 */
export async function readTranscriptFile(file) {
  const name = (file && file.name || '').toLowerCase();
  if (name.endsWith('.docx')) return extractDocxText(file);
  const text = await file.text();
  if (name.endsWith('.vtt')) return parseVttSrt(text, true);
  if (name.endsWith('.srt')) return parseVttSrt(text, false);
  return text.trim(); // .txt など
}

/* ---------- WebVTT / SRT ---------- */
function parseVttSrt(raw, isVtt) {
  const lines = String(raw).replace(/﻿/g, '').split(/\r?\n/);
  const out = [];
  for (let line of lines) {
    const s = line.trim();
    if (!s) continue;
    if (isVtt && /^WEBVTT/i.test(s)) continue;
    if (/^NOTE\b/.test(s)) continue;
    if (/^(STYLE|REGION)\b/i.test(s)) continue;
    if (s.includes('-->')) continue;      // タイムスタンプ行
    if (/^\d+$/.test(s)) continue;         // SRT のキュー番号
    // インラインタグ (<v Speaker>, <00:00:00.000>, <c> 等) を除去
    let t = s.replace(/<[^>]+>/g, '').trim();
    // 話者表記 "Speaker: text" はそのまま活かす
    if (t) out.push(t);
  }
  // 自動字幕にありがちな連続重複行を圧縮
  const dedup = [];
  for (const t of out) {
    if (dedup.length && dedup[dedup.length - 1] === t) continue;
    dedup.push(t);
  }
  return dedup.join('\n').trim();
}

/* ---------- .docx (Word) ---------- */
async function extractDocxText(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const xmlBytes = await readZipEntry(buf, 'word/document.xml');
  if (!xmlBytes) throw new Error('docx-parse-failed');
  const xml = new TextDecoder('utf-8').decode(xmlBytes);
  return docxXmlToText(xml);
}

// Word の document.xml を素朴にテキスト化 (段落・タブ・改行を反映)。
function docxXmlToText(xml) {
  let s = xml;
  // 段落区切り・改行・タブをプレースホルダに
  s = s.replace(/<\/w:p>/g, '\n');
  s = s.replace(/<w:br\s*\/?>/g, '\n');
  s = s.replace(/<w:tab\s*\/?>/g, '\t');
  // <w:t ...>本文</w:t> の中身だけ残して他タグを除去
  const texts = [];
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|(\n)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m[2]) texts.push('\n');
    else texts.push(decodeXmlEntities(m[1]));
  }
  return texts.join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeXmlEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

/* ---------- 最小 ZIP リーダー (docx 用) ---------- */
// 中央ディレクトリから指定エントリを探し、格納/deflate を展開して返す。
async function readZipEntry(bytes, wantName) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End Of Central Directory (EOCD) を末尾から探す
  const EOCD_SIG = 0x06054b50;
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const cdCount = dv.getUint16(eocd + 10, true);
  let cdOffset = dv.getUint32(eocd + 16, true);

  const CEN_SIG = 0x02014b50;
  for (let n = 0; n < cdCount; n++) {
    if (dv.getUint32(cdOffset, true) !== CEN_SIG) break;
    const method = dv.getUint16(cdOffset + 10, true);
    const compSize = dv.getUint32(cdOffset + 20, true);
    const nameLen = dv.getUint16(cdOffset + 28, true);
    const extraLen = dv.getUint16(cdOffset + 30, true);
    const commentLen = dv.getUint16(cdOffset + 32, true);
    const localOff = dv.getUint32(cdOffset + 42, true);
    const name = new TextDecoder('utf-8').decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen));

    if (name === wantName) {
      // ローカルヘッダから実データ開始位置を求める
      const LOC_SIG = 0x04034b50;
      if (dv.getUint32(localOff, true) !== LOC_SIG) return null;
      const lNameLen = dv.getUint16(localOff + 26, true);
      const lExtraLen = dv.getUint16(localOff + 28, true);
      const dataStart = localOff + 30 + lNameLen + lExtraLen;
      const comp = bytes.subarray(dataStart, dataStart + compSize);
      if (method === 0) return comp;               // 無圧縮
      if (method === 8) return inflateRaw(comp);   // deflate
      throw new Error('docx-unsupported-compression');
    }
    cdOffset += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

// raw deflate を展開 (ブラウザ標準の DecompressionStream を使用)。
async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('docx-no-decompression');
  }
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}
