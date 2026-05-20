# PDF → Excel 構造図抽出 — ブラウザ版プロトタイプ

サーバ送信ゼロ・ブラウザ完結で動く構造図 PDF 抽出ツール。
`pdf-to-excel/src/` の Node プロトタイプを移植したもの。

## ローカル起動

ES Modules は `file://` では読めないので、簡易 HTTP サーバ経由で開く。

```bash
# 28tools-download リポジトリのルートで実行
python3 -m http.server 8000
# またはお好みの: npx serve, busybox httpd, etc.

# ブラウザで開く:
# http://localhost:8000/pdf-to-excel/web/
```

PDF をドラッグ&ドロップすると:

1. **テキスト抽出可** → pdf.js でそのまま抽出 (高精度)
2. **難読化検出** → Tesseract.js (≈16MB) を遅延ロードして OCR

抽出結果をプレビュー表示し、各セルは編集可能 (黄色背景)。
ダウンロードボタンで Excel (`*.xlsx`) を生成・保存。

## ファイル構成

```
web/
├── index.html              UI と CSS (1ファイル)
├── app.js                  オーケストレータ
├── lib/
│   ├── extractors.js       4つの抽出器 + 難読化判定
│   ├── parsers.js          rebar/section パーサ
│   ├── ocr.js              Tesseract.js ラッパ (遅延ロード)
│   └── excel.js            ExcelJS で .xlsx 生成 (遅延ロード)
└── README.md               このファイル
```

## 依存 (CDN)

| 用途 | URL | サイズ |
|---|---|---|
| pdf.js | `cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38` | ≈1.2 MB |
| ExcelJS | `cdn.jsdelivr.net/npm/exceljs@4.4.0` | ≈700 KB |
| Tesseract.js + jpn | `cdn.jsdelivr.net/npm/tesseract.js@5.1.1` | ≈16 MB (遅延ロード) |

普通の構造図 PDF は ≈2 MB のロードで完結。
難読化 PDF を開いた時のみ Tesseract が追加ダウンロードされる
(以後ブラウザキャッシュ)。

## 既知の制限 (プロトタイプゆえ)

- マッピングプリセット (ファミリ→Excel) 機能はまだ無し
- 編集セルへの書き込みは内部状態に保存されるが、Excel 出力側に
  まだ反映していない (TODO)
- 柱の **SC6** はカード幅外で取りこぼし (`src` 版と同じ既知問題)
- 鋼材グレード (BCP/BCR/SS400) の OCR ヒット率はカード単位で不安定

## サーバ無し配布の確認

CSP (Content-Security-Policy) で `connect-src` を制限すれば
「技術的にサーバ送信できない」状態にできる。本番展開時に
`index.html` の `<head>` へ追加すること:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net;
               connect-src https://cdn.jsdelivr.net; img-src 'self' blob: data:; worker-src blob:;">
```

`connect-src` を `'none'` にすると CDN ライブラリ取得自体が
ブロックされるため、CDN ホストだけ allowlist する。
全ライブラリをローカルに vendor 化すれば `connect-src 'none'`
にできる (将来課題)。
