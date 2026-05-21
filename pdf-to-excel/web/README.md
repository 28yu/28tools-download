# PDF → Excel 構造図抽出 — ブラウザ版

サーバ送信ゼロ・ブラウザ完結で動く構造図 PDF 抽出ツール。
構造図 (基礎大梁 / 大梁 / 小梁 / 柱リスト) を **Revit ファミリのタイプ作成用 Excel** に変換します。

## ローカル起動

ES Modules は `file://` では読めないので、HTTP サーバ経由で開きます:

```bash
# リポジトリのルートで
python3 -m http.server 8000
# Windows PowerShell では:
python -m http.server 8000

# ブラウザで:
http://localhost:8000/pdf-to-excel/web/
```

PDF をドラッグ&ドロップすれば動きます。

### 動作要件
- 最新版 Chrome / Edge / Firefox
- インターネット接続 (CDN ライブラリ取得のため、PDF は外部送信されません)
- 画像PDF / 難読化PDF を扱う場合: 初回のみ Tesseract.js + 日本語 best データ (~40MB) を遅延ロード

## 機能

- 📄 **PDF テキスト抽出** (pdfjs-dist) — テキスト情報を持つ PDF を高速処理
- 🔍 **OCR フォールバック** (Tesseract.js best モデル) — 画像PDF / 難読化PDF にも対応
- 📐 **5 種類の抽出器** — 基礎大梁(RC) / 大梁(S) / 小梁(S) / 柱(S/CFT) を自動判別
- 📊 **JIS H 形鋼カタログ補完** — OCR 切断や桁ずれを規格表で自動修正
- 📋 **マテリアル自動検出** — `SS400` `SN490B` `BCP325` 等を注記文からも抽出
- 💾 **ローカルキャッシュ** — 同一 PDF の再アップロードを瞬時に
- 🎨 **編集可能プレビュー** — 黄色セルでその場修正
- 📥 **Excel 出力** — ファミリパラメータ直結のシート構造

## ファイル構成

```
web/
├── index.html              UI (CSS埋め込み、28tools.com デザイン準拠)
├── app.js                  メインオーケストレータ
├── lib/
│   ├── extractors.js       抽出器 5 種 + 共通ユーティリティ
│   ├── parsers.js          rebar/section パーサ + JIS カタログ
│   ├── ocr.js              Tesseract.js v5 ラッパ (遅延ロード)
│   └── excel.js            ExcelJS による .xlsx 生成 (遅延ロード)
├── README.md               このファイル (ユーザ向け)
├── DEVELOPMENT.md          技術設計ノート (開発者向け)
└── CHANGELOG.md            実装イテレーション履歴
```

## 開発を継続する場合

開発者向け資料があります:
- **`DEVELOPMENT.md`** — アーキテクチャ、OCR 戦略、JIS カタログの設計、既知の制限
- **`CHANGELOG.md`** — なぜ各機能・修正を入れたかの判断記録
- **`/CLAUDE.md`** (リポジトリルート) — プロジェクト全体のガイドと知見

新しいセッションを開始する前に上記 3 ファイルを読むと、背景と現状が分かります。

## 依存ライブラリ (CDN)

| 用途 | URL | サイズ |
|---|---|---|
| pdf.js | `cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38` | ≈1.2 MB |
| ExcelJS | `cdn.jsdelivr.net/npm/exceljs@4.4.0` | ≈700 KB |
| Tesseract.js + jpn_best | `cdn.jsdelivr.net/npm/tesseract.js@5.1.1` + `tessdata.projectnaptha.com/4.0.0_best` | ≈40 MB (画像PDF時のみ) |

普通のテキストPDFは ~2MB のロードで完結。

## 既知の制限

- **柱の角形鋼管 板厚 (t)** の自動補完は不可 — 同寸法に複数バリエーション (BCR295 / BCP325 等で異なる)
- **組立 H 形鋼 (BH)** は規格品でないため JIS 補完対象外、OCR の値をそのまま使用
- **OCR が行全体を見落とすケース** — 再OCR か手動入力でしか復元不可

## デプロイ予定

本番公開先: `https://28tools.com/pdf-to-excel/web/`

公開前に追加予定:
- CSP ヘッダ (CDN 限定の `connect-src`)
- ローカライズ (英・中)
- 外部ライブラリの vendor 化検討 (より強固な offline 動作)
