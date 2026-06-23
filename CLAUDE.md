# 28tools-download プロジェクトガイド

## プロジェクト概要

このリポジトリは、28tools.comの本番サイトを管理しています。

- **本番サイトURL**: https://28tools.com
- **リポジトリ**: https://github.com/28yu/28tools-download
- **デプロイ方法**: GitHub Pages (mainブランチから自動デプロイ)

## 進行中の主要プロジェクト

### 🆕 PDF → Excel 構造図抽出ツール (`pdf-to-excel/web/`)
**目的**: 構造図PDF(梁・柱リスト)を Revit ファミリタイプ自動作成用 Excel に変換するブラウザ完結ツール。

**詳細ドキュメント**:
- `pdf-to-excel/web/DEVELOPMENT.md` — 技術設計・OCR ノウハウ・既知問題
- `pdf-to-excel/web/CHANGELOG.md` — 主要な実装履歴と判断記録
- `pdf-to-excel/web/README.md` — ローカル起動方法

**現状**: プロトタイプ動作中。本番未公開 (`/pdf-to-excel/web/` で配置予定)。

### 🆕 AI議事録 自動作成ツール (`ai-minutes/web/`)
**目的**: 打合せ音声・資料から AI が議事録を自動作成するブラウザ完結ツール。
高精度版は Gemini（ユーザー自身の無料 API キー）、簡易版は Whisper(Transformers.js)。
図解スタイル / マインドマップで出力、日英中の多言語対応（本文も切替時に翻訳）。

**詳細ドキュメント**:
- `ai-minutes/web/DEVELOPMENT.md` — 技術設計・i18n・既知の制約
- `ai-minutes/web/CHANGELOG.md` — 実装履歴・判断記録・次フェーズ候補
- `ai-minutes/web/README.md` — 概要・ローカル起動方法

**現状**: **限定公開（パスワード保護, パス `28tools`）**。`sitemap.xml` 未登録。
高精度版は動作確認済み。一般公開時はパスワード解除＋sitemap登録＋専用アイコン作成が必要。

## 新しいセッション開始時のテンプレート

新しいClaude Codeセッションを開始する際は、以下をコピーして使用してください：

```
28tools.com の開発を続けます。

## プロジェクト情報
- リポジトリ: 28yu/28tools-download
- 本番サイト: https://28tools.com
- ガイド: CLAUDE.md を参照してください

## 開発ルール
1. claude/* ブランチで開発
2. コミット・プッシュ後、GitHub Actions が自動で PR を作成
3. PR をマージして本番反映

## 現在の状況
- Netlify プレビューは無料枠超過のため利用不可（本番で直接確認）
- gh CLI は利用不可（GitHub Actions で PR 自動作成）

## 今回の作業内容
[ここに今回やりたいことを記載]
```

### PDF → Excel ツールの開発を続ける場合
新セッションで `pdf-to-excel/web/` の開発を引き継ぐ場合は、以下も追加で読んでください:
1. `pdf-to-excel/web/README.md` — ツール概要・ローカル起動方法
2. `pdf-to-excel/web/DEVELOPMENT.md` — 技術設計・OCR ノウハウ・JIS カタログ
3. `pdf-to-excel/web/CHANGELOG.md` — なぜ現状の実装になったかの判断記録

特に **DEVELOPMENT.md の「OCR データの『壊れ方』と対処パターン」** と
**「JIS G 3192 H 形鋼カタログ補完」** セクションは
このプロジェクト特有の重要な知見なので、関連修正前に必ず目を通してください。

OCR ロジックを変更したら `app.js` の **`CACHE_NAME` を bump** (v15 → v16 等) するのを
忘れずに。古いキャッシュが新ロジックの結果を masking します。

## 開発ワークフロー

### ブランチ戦略

```
claude/*ブランチ → Claude Codeで開発
     ↓ プッシュでPR自動作成
     ↓ Netlifyプレビューで確認
     ↓ 問題なければマージ
mainブランチ → 本番サイト（28tools.com）として公開
```

### Claude Code開発フロー（推奨）

1. **claude/で始まるブランチで開発**
   - Claude Codeがコードを変更・コミット・プッシュ

2. **PR作成（自動）**
   - **GitHub Actionsが自動でPRを作成**（claude/*ブランチへのプッシュ時）
   - gh CLIが利用可能な場合、Claude Codeが直接PRを作成することも可能
   - 自動作成が失敗した場合: GitHubの「Compare & pull request」ボタンから手動作成

3. **Netlifyプレビューで確認**
   - PRページにNetlifyプレビューURLが表示される
   - テスト確認を実施
   - ※Netlify無料枠超過時はスキップし、本番で確認

4. **マージ**
   - 問題なければ「Merge pull request」をクリック
   - 本番サイトに自動デプロイ

### 開発環境の選択肢

#### Option A: GitHub Codespaces（推奨・ブラウザ完結）

**メリット**:
- ✅ ブラウザだけで完結（インストール不要）
- ✅ どのPCからでもアクセス可能
- ✅ ターミナル、プレビュー、編集すべて可能
- ✅ testブランチのプレビューも簡単

**使い方**:

1. **Codespacesを作成**
   - https://github.com/28yu/28tools-download にアクセス
   - 緑色の「Code」ボタン → 「Codespaces」タブ
   - 「Create codespace on main」をクリック

2. **testブランチで開発**
   ```bash
   git checkout test
   ```

3. **ファイル編集**
   - 左側のエクスプローラーからファイルを選択
   - 編集して保存（Cmd + S）

4. **プレビュー確認**
   - 拡張機能「Live Server」をインストール
   - `index.html` を右クリック → 「Open with Live Server」
   - ブラウザでプレビュー表示

5. **変更をコミット**
   ```bash
   git add .
   git commit -m "Update: ○○を修正"
   git push origin test
   ```

6. **作業終了**
   - 左上メニュー → 「Codespaces: Stop Current Codespace」
   - またはブラウザタブを閉じる（自動停止）

**無料枠**: 月60時間（個人アカウント）

#### Option B: ローカル環境

**メリット**:
- ✅ オフラインでも作業可能
- ✅ 自分の好きなエディタを使える

**セットアップ**:
```bash
cd ~/Documents  # または任意の場所
git clone https://github.com/28yu/28tools-download.git
cd 28tools-download
git checkout test
open -a Safari index.html  # ローカルで確認
```

### 推奨開発フロー

1. **testブランチで開発**
   ```bash
   git checkout test
   # または新規作成: git checkout -b test
   ```

2. **ローカルで確認**
   - ファイルをブラウザで直接開く（`file:///...index.html`）
   - 動作確認・デザイン確認

3. **mainブランチにマージ**
   ```bash
   git checkout main
   git merge test
   git push origin main
   ```

4. **本番サイトに自動反映**
   - GitHub Pagesが自動的にデプロイ（数分かかる場合あり）
   - https://28tools.com で確認

### 注意事項

- ⚠️ **mainブランチへの直接コミットは避ける**
  - 必ずtestブランチで開発・確認してからマージ

- ⚠️ **testブランチは非公開**
  - GitHub Pagesとして公開されない（mainブランチのみ公開）
  - テスト内容が外部に漏れない

- ⚠️ **Claude Codeセッションの制限**
  - 1つのセッションは1つのリポジトリに紐付けられる
  - このリポジトリ（28tools-download）専用のセッションで作業すること

## プレビュー環境

### Netlify Preview

PRが作成されると、Netlifyが自動でプレビュー環境を構築します。

- **プレビューURL**: PRページのコメントに表示
- **用途**: 本番反映前の動作確認
- **自動更新**: PRにプッシュするたびに更新

## お問い合わせフォーム

### Formspree

お問い合わせフォームはFormspreeを使用しています。

- **エンドポイント**: `https://formspree.io/f/mojdpezb`
- **ダッシュボード**: https://formspree.io/forms
- **制限**: 無料プランは月50件まで（ファイル添付は有料プランのみ）

## セキュリティ設定

### HTTPS強制

本番サイトで「安全ではありません」警告を防ぐため：

1. GitHub リポジトリ設定へ移動
   - https://github.com/28yu/28tools-download/settings/pages

2. **「Enforce HTTPS」にチェック**を入れる

3. 確認
   - http://28tools.com → https://28tools.com へ自動リダイレクト
   - ブラウザに鍵アイコンが表示される

### SEO設定

- **sitemap.xml**: プロジェクトルートに配置済み
  - Google Search Consoleに登録済み（2026/01/25）
  - クロール完了まで数日かかる場合あり

### アクセス解析

- **Google Analytics 4**: 全ページに設定済み
  - 測定ID: `G-TXCT2B2NJ6`
  - 訪問者数、地域、デバイス、流入元などを追跡
  - ダッシュボード: https://analytics.google.com/

**開発者のアクセスを除外**:
- Google Analytics オプトアウト アドオンをインストール
- 内部トラフィックフィルタでIPアドレスを除外
- 詳細: https://tools.google.com/dlpage/gaoptout

### Google AdSense（2026/04/10 設置）

- **パブリッシャーID**: `ca-pub-9197151217236924`
- **ステータス**: 審査待ち（2026/04/10 申請）
- **設置範囲**: 全23ページの `<head>` にスクリプト設置済み
- **ダッシュボード**: https://www.google.com/adsense/
- **CMP（Cookie同意バナー）**: 未設定（日本向けサイトのため後回し）
- **審査通過後のTODO**: 広告ユニットを作成し、表示したい位置に広告コードを配置

### SEO設定（2026/04/10 強化）

- **robots.txt**: 作成済み（sitemap参照あり）
- **sitemap.xml**: 23ページ登録済み（Google Search Consoleに再送信済み）
- **canonicalタグ**: 全23ページに設置済み
- **meta description**: 全ページに設定済み（マニュアル12ページは2026/04/10追加）
- **OGタグ**: 全ページに設定済み（マニュアル12ページは2026/04/10追加）
- **titleタグ**: 全ページに「- 28 Tools」サイト名サフィックス付き
- **JSON-LD構造化データ**:
  - `index.html`: WebSite + Organization スキーマ
  - `addins.html`: SoftwareApplication スキーマ（無料、Windows対応）
- **Google Search Console**: https://search.google.com/search-console（28tools.com登録済み）

**SEO改善時のチェックリスト**:
1. 新規ページ追加時は `sitemap.xml` にURLを追加
2. `<link rel="canonical">` タグを追加
3. `<meta name="description">` を追加
4. OGタグ（og:title, og:description, og:url等）を追加
5. Search Consoleでsitemap再送信

## ファイル構成

```
/
├── index.html          # トップページ（ポータル）
├── addins.html         # アドインダウンロードページ
├── hatch.html          # ハッチングパターン作成ツール
├── pdf_compare.html    # PDF比較ツール
├── news.html           # BIM業界ニュース
├── ai-news.html        # AIニュース
├── js/
│   ├── main.js         # メインJS（多言語対応・共通機能）
│   └── hatch.js        # ハッチングパターン作成ツール専用JS
├── css/
│   ├── style.css       # メインスタイル
│   ├── hatch.css       # ハッチングページ専用スタイル
│   ├── manual.css      # マニュアルページ用
│   └── contact.css     # お問い合わせページ用
├── images/
│   ├── portal/         # ポータルページ用アイコン
│   │   ├── icon-addon.png
│   │   ├── icon-family.png
│   │   ├── icon-hatch.png
│   │   ├── icon-knowledge.png
│   │   └── icon-new.png
│   └── revit-ribbon-preview.png
├── includes/
│   ├── header.html     # 共通ヘッダー（言語切り替えボタン含む）
│   └── sidebar.html    # サイドバー
├── robots.txt          # クローラー指示ファイル
├── sitemap.xml         # SEO用サイトマップ（23ページ登録）
├── CNAME               # カスタムドメイン設定（28tools.com）
├── CLAUDE.md           # このファイル（開発ガイド）
├── privacy.html        # プライバシーポリシー
├── contact.html        # お問い合わせページ
├── about.html          # 運営者情報
├── terms.html          # 利用規約
├── .github/workflows/  # GitHub Actions
│   └── auto-merge.yml  # PR自動作成ワークフロー
└── manual/             # マニュアルページディレクトリ
    ├── grid-bubble.html
    ├── sheet-creation.html
    ├── view-copy.html
    ├── sectionbox-copy.html
    ├── viewport-position.html
    ├── cropbox-copy.html
    ├── excel-import.html
    ├── excel-export.html
    ├── room-tag.html
    ├── beam-top-color.html
    ├── beam-bottom-color.html
    └── filled-region.html
```

## 現在のサイト構成（2026/02更新）

### ページ構成
- **トップページ（index.html）**: ポータル型レイアウト（横並びタブ + メインコンテンツ）
- **アドインページ（addins.html）**: Revitアドインのダウンロード・マニュアル（パンくずリスト付き）
- **ハッチングページ（hatch.html）**: ハッチングパターン作成ツール
- **サブタイトル**: 全ページ「Revit 作図サポートツール」で統一

### カテゴリ（トップページ・横並びタブ）
| カテゴリ | 状態 | 説明 |
|---------|------|------|
| アドイン | 利用可能 | 6機能のRevitアドイン |
| 塗潰し | 利用可能 | ハッチングパターン作成ツール |
| ナレッジ | 準備中 | Tips・チュートリアル |

### デザイン仕様
- カテゴリナビ: サブタイトル下に横並びタブ（背景透明）
- サブタイトル: font-size 1.1rem, opacity 0.8
- カテゴリアイコン: SVG形式（images/portal/）、24x24px

### Revitアドイン配布（GitHub Releases）

**対応バージョン**: Revit 2021, 2022, 2023, 2024, 2025, 2026（全バージョン利用可能）

**現在のバージョン**: v2.0.0（2026/03更新）

**GitHub Releases構成**:
| タグ名 | アセットファイル名 |
|--------|-------------------|
| `v2.0.0-Revit2021` | `28Tools_Revit2021_v2.0.zip` |
| `v2.0.0-Revit2022` | `28Tools_Revit2022_v2.0.zip` |
| `v2.0.0-Revit2023` | `28Tools_Revit2023_v2.0.zip` |
| `v2.0.0-Revit2024` | `28Tools_Revit2024_v2.0.zip` |
| `v2.0.0-Revit2025` | `28Tools_Revit2025_v2.0.zip` |
| `v2.0.0-Revit2026` | `28Tools_Revit2026_v2.0.zip` |

**旧バージョン（v1.0.0）のリリースもGitHub上に残存**（タグ: `v1.0.0-Revit20**`）

**ダウンロードURL形式**:
```
https://github.com/28yu/28tools-download/releases/download/{タグ名}/{ファイル名}
```

**ダウンロード数の確認方法**:
```bash
# 全リリースの一覧（GitHub API）
curl -s https://api.github.com/repos/28yu/28tools-download/releases | jq '.[].assets[] | {name, download_count}'

# GitHub CLIが使える場合
gh release list
gh release view v2.0.0-Revit2024
```

**バージョンアップ時の対応**:
1. 新しいタグでGitHub Releaseを作成（全6バージョン分）
2. `main.js`の`downloadConfig.urls`を新URLに更新
3. `addins.html`のインストール手順内のバージョン表記を更新
3. `addins.html`のバージョンタブの表示を更新

## ハッチングパターン作成ツール（hatch.html）

### 概要
Revit / AutoCAD用のハッチングパターンファイル（.pat）を作成するWebツール

### 対応パターン
| パターン | 設定項目 |
|---------|---------|
| 斜線（diagonal） | 角度、間隔、破線設定 |
| 網掛け（crosshatch） | 角度、間隔、破線設定 |
| ドット（dot） | 間隔、ドットサイズ |
| 芋目地（tile-grid） | X、Y、目地あり/なし、目地X、目地Y |
| 馬目地（tile-brick） | X、Y、目地あり/なし、目地X、目地Y（1/2オフセット固定） |
| RC（rc-concrete） | 線内間隔、グループ間隔 |

### 技術的な注意点

#### Shift-JISエンコーディング
- **パターン名は日本語対応**（例：`芋目地_100x100x5x5`）
- Revit/AutoCADはWindows環境でShift-JISを期待するため、`js/hatch.js`内の`ShiftJIS.encode()`関数でエンコード
- 対応文字: パターン名で使用する漢字・ひらがな・カタカナのみマッピング済み
- 新しい日本語文字を追加する場合は`unicodeToSJIS`オブジェクトにマッピングを追加

#### タイルパターン(.pat)の値
- 芋目地・馬目地は**4本の線**で構成（目地の中心から±半分オフセット）
- 馬目地のdelta-x = halfTotalW（半分ずらし）
- 詳細は`generateTileGridPattern()`と`generateTileBrickPattern()`を参照

### 出力形式
- **Revit**: モデル（実寸）/ 製図（スケール依存）
- **AutoCAD**: 標準.pat形式

### ファイル構成
- `hatch.html`: UIとレイアウト
- `css/hatch.css`: スタイル（パターンカード、設定パネル、プレビュー）
- `js/hatch.js`: パターン生成ロジック、Canvas描画、ファイルダウンロード

## 開発ルール

### 多言語対応
- **対応言語**: 日本語（ja）、英語（en）、中国語（zh）
- **翻訳ファイル**: `js/main.js` 内の `translations` オブジェクト
- **HTMLでの使用**: `data-lang-key="キー名"` 属性を追加

#### index.html の言語切り替えに関する注意事項

index.htmlは他のページと異なり、`header-container`による共通ヘッダー読み込みを**使用していない**。言語切り替えUIはindex.html内にインラインで記述されている。

**言語切り替えの初期化（二重登録防止パターン）**:
- `main.js`の`initLanguageSwitcher()`が初期化を試みる
- index.html末尾に`window.addEventListener('load', ...)`でフォールバック初期化を配置
- `langBtn._langInitialized`フラグをDOM要素に設定し、どちらか一方のみが初期化するよう制御
- イベントリスナーは`addEventListener`ではなく`onclick`プロパティを使用（重複登録防止のため）

**修正時の注意**: 言語切り替えが動作しない場合、まず以下を確認：
1. 翻訳対象の要素に`data-lang-key`属性があるか
2. `main.js`の`translations`に該当キーの翻訳データがあるか
3. イベントリスナーが重複登録されていないか（`toggle()`が2回呼ばれると打ち消し合う）

### 翻訳キー命名規則
```
[ページ名]-[要素名]

例：
- hatch-page-title       # ハッチページのタイトル
- hatch-type-diagonal    # パターン種類「斜線」
- hatch-grout-enabled    # 「目地あり」チェックボックス
- footer-about           # フッター「運営者情報」
```

### 新規ページ追加時のチェックリスト
1. 共有ヘッダーを使用: `<div id="header-container"></div>`
2. `main.js` を読み込む（言語切り替え機能のため）
3. 翻訳対象要素に `data-lang-key` を追加
4. `js/main.js` に翻訳を追加（`translations.[pageName]`）
5. `Object.assign` に新しい翻訳オブジェクトを追加

### CSSルール
- メインスタイル: `css/style.css`
- ページ固有スタイル: `css/[pagename].css`
- CSS変数を使用（`var(--blueprint-blue)` など）

### コミットメッセージ
```
[タイプ] 簡潔な説明

例：
- Add hatch pattern creation tool
- Fix grout checkbox not working
- Update translations for hatch page
```

## 過去のセッション情報

### マニュアル本文のビルド時焼き込み（prerender）— 2026/06 追加

**背景**: `manual/*.html`（13ページ）は元々、訪問者のブラウザで実行時に
`https://28yu.github.io/Revit-Add-ins/Features/<FEATURE_ID>.md` を fetch して
`marked.js` で描画していた。そのため**生 HTML は「読み込み中...」だけ**で、
AdSense / 検索エンジンが本文を読めず「低品質コンテンツ」と判定される原因になっていた。

**解決策**: Markdown→HTML 変換を「ブラウザ実行時」から「CI（デプロイ時）」へ移動。
本文を `<article id="md-content">` に焼き込み、静的 HTML として配信する。
**執筆の単一ソースはアドイン開発リポジトリ（28yu/Revit-Add-ins）のまま**変わらない。

| 要素 | 役割 |
|---|---|
| `scripts/build-manuals/inject.mjs` | 各 `manual/*.html` から `FEATURE_ID` を自動検出し、対応 MD を取得→HTML 化→焼き込み。冪等。`MANUAL_SRC_DIR` 環境変数でローカルディレクトリからも取得可（オフライン初期ベイク用） |
| `.github/workflows/build-manuals.yml` | 毎日 JST 03:00（cron）＋手動（workflow_dispatch）で実行。差分があれば main へ直接コミット → GitHub Pages 再デプロイ |

**重要な運用ルール**:
- ⚠️ **`manual/*.html` の `<article id="md-content">` 内（`data-baked="true"`）は手動編集しない**。
  CI が上書きする。本文を直したいときは**アドイン開発リポジトリの `Features/<ID>.md` を編集**する。
- 焼き込み済みページはランタイム fetch を**スキップ**する（`data-baked` 短絡）。
  github.io 障害時・低速回線・クローラーでも本文を保持できる。
- `FEATURE_ID` を持たない手書き静的ページ（`beam-top-color.html` 等）はスキップされる。
- アドイン側 MD を更新したら、即時反映したい場合は Actions →「Build Manuals」→ Run workflow を手動実行（しなければ翌 JST 03:00 に自動反映）。
- **即時反映は実装済み**: アドイン開発リポジトリ（28yu/Revit-Add-ins）の
  `.github/workflows/notify-site.yml` が `Docs/Features/**` の push を検知し、
  `repository_dispatch`（event-type: `manuals-updated`）を 28tools-download へ送信。
  `build-manuals.yml` の `repository_dispatch: types: [manuals-updated]` が受信して再ビルドする。
  認証は Revit-Add-ins の Secret `SITE_DISPATCH_TOKEN`（28tools-download への Contents:Read and write 権限を持つ fine-grained PAT）。
  取得元は raw（`main/Docs/Features`）優先＋github.io フォールバック。**動作検証済み（2026/06）**。

### AdSense 審査対策キャンペーン（2026/06）— 低品質/孤立/読み込み中ページの一掃

**背景**: Google AdSense の申請が繰り返し却下されていた。原因調査の結果、
「価値の低いコンテンツ（low value content）」＝**①準備中プレースホルダー ②本文が
実行時 fetch で生 HTML が空（"読み込み中..."）③孤立した薄いページ** が複合要因と判明。

**このセッションで対応済み**:
| 対応 | 内容 |
|---|---|
| ✅ `family.html` 削除 | 全6カテゴリ「準備中」のプレースホルダー。翻訳(`familyPage`)・CSS・doc 参照も除去 |
| ✅ マニュアル13ページ | 「読み込み中...」→ ビルド時焼き込み（前掲 prerender セクション）＋即時反映パイプライン |
| ✅ `features.html` / `manual.html`（ルート）削除 | sitemap・ナビ未登録、相互リンクのみの孤立した旧「機能カタログ/ハブ」。`featuresPage` 翻訳も除去。**`css/features.css` は `manual/*.html` が共有するため保持** |

**⚠️ 用語の注意**: `manual/*.html`（フォルダ内13ページ＝個別マニュアル, 焼き込みで解決済み）と
`manual.html`（ルート単体ファイル＝旧ハブ, 削除済み）は**別物**。混同しないこと。

**残タスク（次セッション）**: `news.html` / `ai-news.html` の「読み込み中...」改善。
- この2ページはサイドバー（`includes/sidebar.html`）からリンクされ**クローラーが到達する**ため対応価値あり。
- データソース: `data/news.json` / `data/ai-news.json`（`.github/workflows/update-news.yml`＝`fetch_rss.py`、`update-ai-news.yml`＝`fetch_ai_rss.py` が cron 更新）。
- 本文は JS で `#news-container` に描画。生 HTML は「読み込み中...」＋簡易 `<noscript>` のみ。
- **方針＝案A（静的書き出し）で進める**: ニュース更新ワークフロー（Python）に、取得した最新記事の
  見出し・要約・日付・リンクを **`news.html` / `ai-news.html` の静的 HTML 領域に書き出す**ステップを追加し、
  生 HTML 単体で記事一覧が読める状態にする（マニュアルの焼き込みと同じ思想）。
  既存の JS 描画はそのまま残してよい（静的＝クローラー/初期表示用、JS＝動的更新用）。
- 完了後に **AdSense へ再申請**する（本番反映を確認してから）。

**今回スコープ外（今後対応）**: `ai-minutes`（パスワード保護中。改善完了後に解除＋AdSense整理）。

### テストリポジトリの廃止

以前は `28tools-download-test` という別リポジトリを使用していましたが、**現在は使用していません**。

**理由**:
- 2つのリポジトリを管理するのは非効率
- Claude Codeの1セッション=1リポジトリの制限
- testブランチを使う方がGit標準のワークフロー

**移行後の方針**:
- 28tools-download リポジトリのみ使用
- testブランチで開発・ローカル確認
- mainブランチで本番公開

## Claude Code環境の制限事項

### gh CLIが利用不可
- この環境ではネットワーク制限により`gh`コマンドがインストールできない
- PR作成は**GitHub Actionsによる自動作成**に依存
- 自動作成が失敗した場合はGitHub UIから手動作成

### Netlify無料枠
- **2026/02時点で無料枠を超過**、プレビュー機能が一時停止中
- 来月にリセットされるまでプレビューは利用不可
- 代替策: PRをマージして本番サイト（GitHub Pages）で直接確認

## トラブルシューティング

### Google Search Consoleで「取得できませんでした」

sitemap.xml を登録後、Googleのクロールには **数時間〜数日** かかります。

- 数日待ってから再確認
- Content-Typeヘッダーを確認（developer tools）

### HTTPSエラー

「安全ではありません」警告が表示される場合：
- GitHub Settings → Pages → 「Enforce HTTPS」を有効化

### デプロイが反映されない

mainブランチにプッシュ後、数分待ってから確認：
- ブラウザのキャッシュをクリア（Cmd+Shift+R）
- GitHub Actions タブでデプロイ状況を確認

### GitHub Actionsが失敗する

「Internal server error」や「Runner not acquired」エラーの場合：
- **GitHub側の一時的な問題**（コードの問題ではない）
- 解決策: ワークフローの「Re-run all jobs」ボタンをクリック
- 数分待っても解決しない場合は時間をおいて再試行

### PR自動作成が動作しない

claude/*ブランチにプッシュしてもPRが作成されない場合：
1. GitHub Actions タブで「Auto Create PR for Claude Branches」の状態を確認
2. 失敗している場合は「Re-run」で再実行
3. それでも失敗する場合はPull requestsタブの「Compare & pull request」から手動作成

## CSS・レスポンシブデザインの注意事項

### サブタイトル（"Revit 作図サポートツール"）のサイズ統一

**問題**: 各ページでサブタイトルのサイズが異なっていた

**解決策**:
- **デスクトップ**: 全ページ `1.1rem`
- **モバイル**: 全ページ `1rem`

**関連CSSファイル**:
1. `css/style.css`
   - `.subtitle` (line 188): デスクトップ基本スタイル `font-size: 1.1rem`
   - `.subtitle` (line 960, @media 768px): モバイル `font-size: 1rem`
   - `.portal-hero .subtitle` (line 964, @media 768px): トップページモバイル `font-size: 1rem`
   - `.portal-hero .subtitle` (line 1182): **font-sizeは削除済み**（以前は1.1remでモバイル設定を上書きしていた）

2. `css/manual.css`
   - `.manual-page .subtitle` (line 166): デスクトップ `font-size: 1.1rem !important`
   - `.manual-page .subtitle` (line 488, @media 768px): モバイル `font-size: 1rem !important`
   - `.manual-page .subtitle` (line 529, @media 480px): モバイル小 `font-size: 1rem !important`
   - `.manual-page .manual-subtitle` (line 112-123): ページ固有サブタイトル用

**重要な教訓**:
- ⚠️ **CSSカスケードの順序に注意**: メディアクエリの**後**に書かれたCSSルールは、メディアクエリ内の設定を上書きしてしまう
- ⚠️ **specificityの確認**: `.portal-hero .subtitle` は `.subtitle` より優先度が高いため、モバイルクエリで明示的に指定する必要がある
- ⚠️ **!important の使用**: `manual.css` では `!important` を使用して `style.css` の設定を確実に上書き

**検証方法**:
```bash
# サブタイトルのfont-size設定を全て確認
grep -n "\.subtitle" css/style.css css/manual.css
sed -n '188,196p;960,966p;1182,1189p' css/style.css
sed -n '166,171p;488,490p;529,531p' css/manual.css
```

### タイトルサイズの統一

**サイズ仕様**:
- **デスクトップ**: 全ページ `3.5rem`
- **モバイル**: 全ページ `3.5rem`

**関連CSS**:
- `css/style.css` (line 944-958, @media 768px): すべてのタイトルセレクタを列挙して統一
  ```css
  .main-title,
  h1.main-title,
  .site-header .main-title,
  .container .main-title,
  .manual-container .main-title,
  .portal-hero .main-title,
  .container .portal-hero .main-title {
      font-size: 3.5rem !important;
  }
  ```

**教訓**:
- 複数のセレクタで同じ要素を指定している場合、**全てのバリエーション**を列挙する必要がある
- `.container .main-title` のような親子セレクタは `.main-title` より specificity が高いため、モバイルクエリで明示的に指定する

### フッターの統一

**構造**:
```html
<footer class="site-footer">
    <div class="site-footer-content">
        <div class="site-footer-links">
            <a href="about.html">運営者情報</a>
            <span class="footer-divider">|</span>
            <a href="contact.html">お問い合わせ</a>
            <span class="footer-divider">|</span>
            <a href="privacy.html">プライバシーポリシー</a>
            <span class="footer-divider">|</span>
            <a href="terms.html">利用規約</a>
        </div>
        <p class="site-footer-copyright">© 2026 28 Tools. All rights reserved.</p>
    </div>
</footer>
```

**対応ページ**:
- index.html, addins.html, hatch.html（初期から存在）
- contact.html, about.html, privacy.html, terms.html（2026/02追加）

**注意点**:
- フッターは `</div>` と `<script>` タグの間に配置
- すべてのページで同じHTML構造を使用（一貫性のため）

### アイコン管理

**現在の仕様**:
- **形式**: PNG（以前はSVG）
- **サイズ**: 40x40px（デスクトップ）、36x36px（モバイル）
- **保存場所**: `images/portal/`

**アイコン一覧**:
- `icon-addon.png` - アドインメニュー
- `icon-family.png` - ファミリメニュー
- `icon-hatch.png` - 塗潰しメニュー
- `icon-knowledge.png` - ナレッジメニュー
- `icon-new.png` - 新着アイコン

**変更理由**:
- SVGからPNGへ変更: ユーザー提供の画像がPNG形式だったため
- サイズ拡大: 視認性向上のため32px → 40pxへ変更

### モバイル対応の確認方法

**確認必須項目**:
1. タイトルサイズ（"28 Tools"）
2. サブタイトルサイズ（"Revit 作図サポートツール"）
3. フッターの表示
4. アイコンサイズ

**確認ページ**:
- トップ（index.html）
- アドイン（addins.html）
- 塗潰し（hatch.html）
- お問い合わせ（contact.html）
- 運営者情報（about.html）
- プライバシーポリシー（privacy.html）
- 利用規約（terms.html）

**ブラウザキャッシュクリア**:
- モバイルブラウザでCSSが更新されない場合は強制リロードを実施
- Safari: アドレスバー → リロードボタン長押し
- Chrome: デスクトップ版サイトをリクエスト ON/OFF

### ページ構成の違い

| ページ | body class | ヘッダー | CSS |
|--------|-----------|---------|-----|
| index.html | なし | インライン | style.css |
| addins.html | なし | header-container | style.css |
| hatch.html | なし | header-container | style.css, hatch.css |
| contact.html | manual-page | header-container | style.css, manual.css, contact.css |
| about.html | manual-page | header-container | style.css, manual.css |
| privacy.html | manual-page | header-container | style.css, manual.css |
| terms.html | manual-page | header-container | style.css, manual.css |

**重要**:
- `body.manual-page` を持つページは `manual.css` のスタイルが適用される
- `manual.css` のスタイルは `!important` を多用しており、`style.css` を上書きする

---

## 2026/05 セッションで得た知見

### GitHub UI からの PNG アップロードによる破損問題（重要）

**症状**: GitHub の Web UI から PNG ファイルをコミット（"Add files via upload"）すると、まれに**バイナリ構造が破損する**ことがある。
- ブラウザで開くと「データが壊れています」とエラー
- `file` コマンドや見た目のヘッダーチェックは通過する（先頭の `\x89PNG` 署名は正常）
- HTTP ステータスは 200 で配信される

**具体的な破損パターン**: `pHYs` チャンク直後（オフセット 54）に **4 バイトの `\x00\x00\x00\x00`** が挿入され、IDAT チャンクのヘッダー位置がずれる。

**検出方法**:
```bash
python3 << 'EOF'
import struct, glob
for p in sorted(glob.glob('images/revit-icons/*.png')):
    with open(p,'rb') as f: data = f.read()
    # IDAT が標準位置（58）にあるはず → 62 にあれば破損
    if data.find(b'IDAT') != 58:
        print(f'CORRUPT: {p} (IDAT at offset {data.find(b"IDAT")})')
EOF
```

**修復方法**: 4 バイトの余分なゼロを削除すれば全 CRC が一致し、PNG として有効になる（ロスレス）。ただし最も簡単なのは**ローカルで再生成して再アップロード**すること。

**教訓**:
- 新規 PNG をデプロイした後は本番で必ず表示確認
- `file` コマンドはチャンク構造を検証しないため信頼しない
- `PIL.Image.verify()` や `pngcheck` でデコード可能か確認するのが確実
- GitHub UI 直接アップロードよりも、`git push` 経由が安全

### 多言語化の実装ガイド

#### 翻訳キーが反映される条件
**`data-lang-key` 属性は翻訳されるすべての要素に個別に必要**。特に見落としやすい箇所：
- 表のセル `<td>`（列ヘッダー `<th>` だけでは中身は翻訳されない）
- 強調用 `<strong>` の親要素と `<strong>` 両方
- `<code>` のように装飾要素を含むテキスト

**新規ページの翻訳追加チェックリスト**:
1. すべての可視テキスト要素に `data-lang-key` を追加
2. 表は **`<th>` も `<td>` も全セル**に lang-key を付与
3. `js/main.js` に `translations.{pageName}` ブロックを追加
4. ブロックの末尾を含めて `Object.assign(translations, ...)` のリストに登録
5. 検証コマンドで漏れを確認：
   ```bash
   python3 -c "
   import re
   src = open('js/main.js').read()
   defined = set(m.group(1) for m in re.finditer(r\"^\s*'([a-z][a-z0-9-]*)':\s*\{\s*\n\s*ja:\", src, re.M))
   for f in ['manual/your-page.html']:
       keys = set(re.findall(r'data-lang-key=\"([^\"]+)\"', open(f).read()))
       missing = keys - defined
       print(f'{f}: missing {len(missing)}', sorted(missing))
   "
   ```

#### 翻訳文字列内の HTML タグ
**`js/main.js` の `updateAllContent()`** は、翻訳文字列に HTML タグ（`<strong>`, `<code>` など）が含まれる場合、自動的に `innerHTML` で挿入する仕様にしてある（2026/05〜）。

そのため md の `**太字**` を再現したい場合：
```js
ja: '<strong>プロジェクト全体</strong> — モデル内の全要素を対象'
```
このように `<strong>` を埋め込めば、テキストとしてではなく**太字として描画される**。

レガシーパターン（既存の tip スタイル）として、親 `<p>` と子 `<strong>` の両方に `data-lang-key` が付いている場合は、専用の合成ロジックが動作する。新規追加ではこちらは避け、上記の HTML 埋め込みパターンを使う方がシンプル。

#### 共有翻訳キー一覧
新ページ作成時はまず以下の既存共有キーを使う（重複定義しない）：

**セクション見出し** (`translations.sections`):
- `section-overview`（機能概要）
- `section-key-features`（主な特徴）
- `section-supported-views`（実行できるビュー）
- `section-preparation`（実行前の準備）
- `section-usage`（使い方／実行手順）
- `section-output`（出力結果）
- `section-deliverables`（出力される成果物）
- `section-logic`（計算ロジック）
- `section-rerun`（再実行・上書きについて）
- `section-usecases`（活用シーン）
- `section-tips`（Tips）
- `section-notes`（注意事項）
- `section-troubleshooting`（トラブルシューティング）
- `section-faq`（よくある質問）
- `section-related`（関連機能）
- `section-related-links`（関連リンク）

**テーブル列ヘッダー**:
- `table-col-view-type`（ビュー種別）
- `table-col-supported`（対応）
- `table-col-behavior`（動作）
- `table-col-execution`（実行）
- `table-col-note`（備考）
- `table-col-item`（項目）
- `table-col-content`（内容）
- `table-col-symptom`（症状）
- `table-col-action`（対処）
- `table-col-member`（部位）
- `table-col-revit-category`（Revit カテゴリ）

**共通操作**:
- `back-to-home`（← ホームに戻る）
- `image-placeholder-text`（📷 スクリーンショット画像をここに追加予定）
- `breadcrumb-home` / `breadcrumb-addins`（パンくず）
- `footer-*`（フッター各種）

### マニュアルページ用 CSS（追加済み）

`css/manual.css` に追加した汎用クラス：

- **`.info-table`** — 情報テーブル（行 hover、列ヘッダー薄青、偶数行薄グレー）
- **`.prep-list`** — 番号付き準備リスト（青丸の連番バッジ）

新規マニュアルページで表や手順を書くときはこれらを使うとデザインが統一される。

### 新規マニュアルページのテンプレート構成

`beam-top-color.html` をベースとし、必要に応じて以下のセクションを追加：

```
1. パンくず (breadcrumb)
2. 機能タイトル (manual-header)
3. 機能概要 (section-overview)
4. 主な特徴 (section-key-features)
5. 実行できるビュー (section-supported-views) ← info-table
6. 実行前の準備 (section-preparation) ← prep-list
7. 使い方／実行手順 (section-usage) ← step-box × N
8. 出力結果／成果物 (section-output / section-deliverables)
9. 計算ロジック (section-logic)  ※必要に応じて
10. 再実行・上書き (section-rerun)  ※必要に応じて
11. 活用シーン (section-usecases) ← usecase-grid
12. Tips (section-tips) ← tips-box
13. 注意事項 (section-notes) ← notes-box warning
14. よくある質問 (section-faq)  ※必要に応じて
15. トラブルシューティング (section-troubleshooting)
16. 関連機能／関連リンク (section-related / section-related-links)
17. ナビゲーション (manual-navigation)
18. フッター + SNSシェアボタン
```

### 2026/05 追加ページ

| ファイル | 機能名 | 翻訳ブロック |
|---------|-------|------------|
| `manual/fire-protection.html` | 耐火被覆色分け | `translations.fireProtection` |
| `manual/formwork-calculator.html` | 型枠数量算出 | `translations.formwork` |
| `images/revit-icons/fire_protection.png` | 耐火被覆アイコン | — |
| `images/revit-icons/formwork.png` | 型枠アイコン | — |

`addins.html` の機能一覧グリッドに対応するカード（`feature-fire-protection-*` / `feature-formwork-*` キー）を追加済み。`sitemap.xml` にも登録済み（25ページ構成に増加）。

### Revit アイコン名の規則

`images/revit-icons/` のアイコンは **小文字 + アンダースコア**（`_32` サフィックスなし）。2026/05 にリネーム済み：
- ❌ 旧: `sheet_creation_32.png`
- ✅ 新: `sheet_creation.png`

新しいアドイン機能を追加する際は、この命名規則に従う。

---

## 2026/05 セッションで得た知見 — PDF → Excel ツール

### プロジェクトの位置づけ
構造図PDF (基礎大梁/大梁/小梁/柱のリスト) を Revit ファミリのタイプ作成に直結する Excel に自動変換するブラウザ完結ツール。`pdf-to-excel/web/` に配置。

### 配布方針 (重要)
- **完全ブラウザ完結** — ファイルアップロード等のサーバ送信は一切しない
- pdfjs-dist + Tesseract.js + ExcelJS を CDN 経由でロード (CDN以外への通信なし)
- 結果はブラウザの Cache API に SHA-256 で保存 → 再アップロードで即ロード
- 28tools.com のデザイン (CSS変数: `--concrete-gray`, `--blueprint-blue`, `--architect-green`) を踏襲
- フッター・パンくず構造も他ページに合わせる

### OCR の運用知識 (Tesseract.js)
1. **best モデルを使う** — `langPath: 'https://tessdata.projectnaptha.com/4.0.0_best'` で精度大幅向上 (jpn は 20MB)
2. **`user_defined_dpi=600`** を必ず設定 — Tesseract の自動DPI推定は不正確で「too small」と判断して文字を捨てる
3. **DPI 600 で描画 + 3 PSM パス (11/6/3)** をマージ — 単一PSMでは取りこぼし多発
4. **画像の手動前処理は逆効果** — Tesseract の Leptonica 内部処理に任せる
5. **OCRエラーパターン** とその対処は `parsers.js` の `parseSection` 内に集約

### OCR から得る生データの典型的な「壊れ方」と対処
| パターン | 例 | 対処 |
|---|---|---|
| 末尾切断 | `H-200×1` (本来 100) | **JIS規格カタログ補完** で復元 |
| 小数点欠落 | `tw=65` (本来 6.5) | `>50` なら 10 で割る |
| 重複×記号 | `H-300×150×X6.5×9` | `[xX×]+` で吸収 |
| `=` で誤読 | `SH=700×...` | `[-=]?` に拡張 |
| 高さ run-on | `H=1756` (本来 175) | 末尾桁を落として JIS で確認 |
| B 連結 | `B=25014` (本来 250+14) | 桁分割して B/tw に再配分 |
| 角形マーク誤認 | `□` → `L1`, `CH` | section regex を**非アンカー化** + 行内 concat |

### JIS G 3192 カタログ補完 (大発見)
H 形鋼は規格品なので、高さ H が分かれば B/tw/tf が一意に決まる (narrow-flange 系)。
- `lib/parsers.js` の `JIS_H_SECTIONS` に 38 件登録
- `parseSection()` が部分的な OCR でも自動補完
- **角形鋼管 □ には適用しない** — 同じ (A,B) に複数の板厚が存在するため誤値の危険

優先度ルール (`STEEL_PRIORITY`):
```
SN > SM > BCP > BCR > STKR > STK > SS
```
構造用鋼が一般用より優先 (JIS慣習)。

### 抽出器の構造 (`lib/extractors.js`)
| 抽出器 | 対象 | アンカー regex |
|---|---|---|
| `extractRcBeams` | 基礎大梁 (RC, FG) | テキスト経由、固定オフセット |
| `extractSBeams` | 大梁 (S, SG, テキスト) | テキスト経由 |
| `extractLargeBeamsFromOcr` | 大梁 (S, OCR) | `(CSG\|SG\|FG\|BG\|G)\d+[A-Za-z]?` |
| `extractSmallBeamsFromOcr` | 小梁 (S, SB) | `[csCS]?[sS][bB]\d+[A-Za-z]{0,3}` |
| `extractColumnsFromOcr` | 柱 (SC/CC/CFT/C) | `(SC\|CC\|CFT\|C)\d+[A-Z]?` |

カテゴリ判定は `detectOcrCategory(words)` → `{ category, counts: { sc, sb, lg } }`。

### マルチバンドテーブルの落とし穴
1枚のページに同じ x で異なる y の anchor (G101 at y=805 + G104 at y=3543) が並ぶケース。**`assignXCardBounds()`** で x を tolerance 50px でクラスタリングしてから境界計算。同じ x のグループは同じカード境界を共有。

### キャッシュ運用
- `CACHE_NAME = 'pdf-extract-vN'` のバージョン番号を**抽出ロジック変更時に必ず bump**
- 抽出 0 件の結果は**キャッシュに保存しない** (古いバグ結果をマスクしないため)

### Revit ファミリパラメータ (確認済)
| ファミリ | 主要パラメータ |
|---|---|
| `S_C_Box_1J` (角形鋼管柱) | 符号, 構造マテリアル, H, B, t1, t2, r |
| `S_B_H_3Sec` (H形小梁・3区間) | 符号, H_s/c/e, B_s/c/e, tw_s/c/e, tf_s/c/e, 始端/中央/終端_フランジ_マテリアル |
| 大梁 (推定 同型) | 同上 (大梁は始端/中央/終端で異なる断面を持てる) |

### 次のフェーズ候補
1. **マッピングプリセット機能** — Excel列 ↔ Revitパラメータ対応表を JSON で保存/読込
2. **Revit プラグインまたは Dynamo スクリプト** — Excel → タイプ作成
3. **形式→ファミリのルーティング表** — SH→○○ファミリ、□→△△ファミリ
4. **マテリアル変換表** — `SS400` → Revit マテリアル名

### 既知の限界
- **柱の角形鋼管 t 値の補完不可** — JIS で同寸法に複数板厚バリエーション
- **OCR が完全に行を見落としたケース** — 再 OCR か手動入力でしか復元不可
- **BH (組立H)** は規格品でないため JIS 補完対象外、OCR 結果をそのまま使用
- **RC 大梁** (テキスト抽出可能なはず) は実 PDF サンプル未取得のため未検証

---

## 2026/05 セッションで得た知見 — サイト統合・デプロイ・OCR メモリ

PDF→Excel ツールを `pdf-to-excel/web/` に深い階層で配置し、本サイト
レイアウトに統合した際に判明した重要事項。OCR 側の知見は
`pdf-to-excel/web/CHANGELOG.md` v16〜v20 に詳細あり。

### サイドバーは **3 箇所**にコピーがある (要注意)

ナビゲーション項目を追加するときは **3 箇所**を全て更新する必要がある:

| 場所 | 内容 | 何ページに影響 |
|---|---|---|
| `index.html` line ~100 (インライン `<nav class="sidebar-nav">`) | ホームページ用サイドバー | トップページのみ |
| `index.html` line ~155 (`<div class="categories-grid">`) | ホームページ下部カード | トップページのみ |
| `includes/sidebar.html` | 共通サイドバー | トップ以外の全ページ |

**`index.html` は他のページと違って `<div id="header-container">` /
`<div id="sidebar-container">` の include 機構を使っていない。**
インラインで直接記述している (CLAUDE.md 内別箇所にも記載あり)。

**症状**: `includes/sidebar.html` だけ更新したら「他のページではナビが
出るのにトップだけ古いまま」になる。F12 コンソールに
`Header container not found` / `Sidebar container not found` の警告が
出ていればこれ。

### includes/* キャッシュバストパターン

`js/main.js` の冒頭に `INCLUDES_VERSION` 定数があり、これを使って
`includes/header.html?v=<version>` のようにクエリを付けて fetch している。
**`includes/*` を編集したら必ずこの定数を bump** (例: `20260527-2` →
`20260601-1`)。さらに `fetch(..., { cache: 'no-store' })` でブラウザ
HTTP cache もスキップ。

これがないと GitHub Pages の Fastly CDN (TTL ~10 分) が古い include を
配信し続け、ハードリロードや別ブラウザでも反映されない事故が起きる。
Cloudflare 等の追加 CDN を入れている場合は数時間〜数日キャッシュされる。

### 深い階層ページの includes パス自動検出

`js/main.js` の `getIncludesBasePath()` が `window.location.pathname`
から深さを算出して相対パスを組み立てる:

| URL | 返り値 |
|---|---|
| `/` または `/index.html` | `includes/` |
| `/manual/foo.html` | `../includes/` |
| `/pdf-to-excel/web/` | `../../includes/` |

新しい階層 (`/foo/bar/`) にツールを追加しても main.js 変更不要。
ただし `body.manual-page` クラスのハードコード分岐は撤去されているので、
過去の挙動を期待するコードを書く前に確認。

### 新規ツールページ追加チェックリスト (深い階層配置)

1. `/foo/bar/index.html` 作成 — `<link rel="stylesheet" href="../../css/style.css">` と `<script src="../../js/main.js">`
2. ページ先頭に `<div id="header-container">` + `<div id="sidebar-container">`
3. パンくず `<nav class="breadcrumb">` を配置 (path は `../../index.html`)
4. `<h2 class="page-title">` と `<p class="page-description">` をパンくず直下に
5. **`index.html` のインラインサイドバー** に新項目追加
6. **`index.html` のカテゴリーグリッド** に新カード追加
7. **`includes/sidebar.html`** に新項目追加
8. **`js/main.js` の `INCLUDES_VERSION` を bump** (CDN cache バスト)
9. `js/main.js` の translations に `index-tab-foo` と `index-category-foo-desc` 追加 (ja/en/zh)
10. `sitemap.xml` に新 URL 登録
11. ページの `<head>` に canonical / description / OGP / Twitter Card / GA / AdSense (他ページに揃える)

### Adobe PDF Converter の OCR 不利設定 (避けるべき)

CAD/Revit から PDF 書き出しの際、デフォルトのままだと OCR で読めない
PDF になる。本サイト PDF→Excel ツールへの **入力品質**を上げるため、
以下を必ず変更:

| 設定 | デフォルト (悪) | 推奨 |
|---|---|---|
| 用紙サイズ | Screen | A1 または A3 (元の図面サイズ) |
| TrueType フォント | デバイスフォントと代替 | ソフトフォントとしてダウンロード |
| PDF 設定 | 標準 | 高品質印刷 または プレス品質 |
| OpenType フォント埋め込み | OFF | ON |

**特に「デバイスフォントと代替」が致命的**: 日本語フォントが Unicode
マッピング情報を失い、pdfjs の `getTextContent()` が 0 件になる主因。

**さらに「テキストをアウトライン化」する出力は救済不可能**: content stream
の `Tj`/`TJ` (テキスト表示) オペレータが消え、全文字が `m`/`l`/`c`
(ベジエパス) で描画される。OCR でしか拾えないが、それも CJK 細字では
精度が出ない。CAD/Revit 側の設定変更が本当の解。

### Tesseract.js WASM メモリの実効上限

ブラウザの canvas 上限 (~268M pixels) と Tesseract.js の実効メモリ上限
は**別物**。Tesseract.js は LSTM モデル + 画像 + 作業バッファを 1-2GB
の WASM ヒープに同居させるため、画像は **実用上 ~24M pixels 以下**に
抑えるのが安全。

- 64M でも `pixdata_malloc fail` で失敗するケース有 (v18 で確認)
- 31M (64M の 0.7× リトライ) でも失敗するケース有 (v19 で確認)
- **24M に絞った v20 でようやく安定**
- A1 ページは ~114 DPI まで落ちて精度的に厳しい
  → 本質的には **PDF 側で text-as-text を保つ書き出し**が正解

### 環境的制約 (Claude 開発時に注意)

Claude Code on the web 環境では outbound network policy により
**28tools.com への直接アクセスが `host_not_allowed` で 403**。
ライブサイトの検証には:
- `raw.githubusercontent.com/28yu/28tools-download/main/...` でリポジトリ
  内容を読む (これは通る)
- GitHub MCP tool (`mcp__github__get_file_contents` 等) を使う
- ユーザに F12 コンソール / Network タブのスクショを依頼する

ユーザの F12 スクショ 1 枚で原因が即座に判明することが多いので、
ライブ検証の代替として積極的に依頼する。

---

## 2026/06 セッションで得た知見 — アクセス解析ダッシュボード & GA4自動化

### 構成概要

社内向けアクセス解析ダッシュボード (`analytics/`)。ダークテーマの単一HTML SPA。

| ファイル | 役割 |
|---|---|
| `analytics/dashboard.html` | ダッシュボード本体。Supabase + GitHub Releases + GA4履歴 をマージして「ダウンロード / ページビュー / ツール利用」の3タブで可視化 (Chart.js) |
| `analytics/ga4-import.html` | GA4 → Supabase 連携の設定手順ページ (SQL / 旧Apps Scriptコードの掲示) |
| `.github/workflows/ga4-sync.yml` | **GA4 → Supabase 自動同期** (cron + 手動) |
| `scripts/ga4-sync/sync.mjs` | 同期スクリプト本体 (Node ESM, `@google-analytics/data`) |

**データソース3種**:
1. **Supabase** (`downloads` / `pageviews` テーブル) — `js/main.js` の `logPageview()` / `logToolEvent()` が sendBeacon で記録 (リアルタイム計測)
2. **GitHub Releases API** — DL累計 (日別不可、累計のみ)
3. **GA4履歴** (`ga4_history` テーブル) — 歴史データ・直帰率・滞在時間・デバイス・流入元

ダッシュボードは Supabase の **Publishable(anon) key** をブラウザ localStorage に保存して読む (`28tools_anon_key`)。書き込みは一切しない (読み取り専用)。

### ツール利用イベント (`/_event/<key>`)

`logToolEvent(key)` が `pageviews` テーブルに `page = '/_event/<key>'` で記録。集計は `dashboard.html` の `TOOL_EVENT_LABELS` / `TOOL_EVENT_COLORS` で定義。

| key | 発火箇所 |
|---|---|
| `hatch-download` | `js/hatch.js` |
| `pdf-compare-run` | `pdf_compare.html` |
| `pdf-excel-load` / `pdf-excel-export` | `pdf-to-excel/web/app.js` |
| `minutes-create` | `ai-minutes/web/app.js` (議事録生成成功時, 2026/06追加) |

新ツールの計測を足すときは **①ツール側で `logToolEvent('新key')` ②`TOOL_EVENT_LABELS`/`TOOL_EVENT_COLORS` に追加 ③KPIカード・日別テーブル列・推移系列を追加** の3点セット。

### ダッシュボードのUI/集計の要点 (2026/06改修)

- **モバイル横幅**: 広いテーブルは `chart-full`/`chart-card { overflow-x:auto }` + `data-table { min-width:max-content }` で**カード内スクロール**に収める (ページ全体を広げない)
- **タブ保持**: `localStorage['28tools_active_tab']` でリロード後も同じタブを復元
- **PV推移/ツール推移の「1日」**: ローリング24hではなく **指定日のJST 0〜23時**。日付ピッカー (`pv-date`/`tool-date`) で過去日も選択可。JSTヘルパー `todayJST()`/`jstDateStr()`/`jstHour()`
- **国名の正規化**: GA4は国名 (`Japan`)、Supabaseは国コード (`JP`) のため `toCountryCode()` で**ISOコードに統一**してから集計 (日本が2行に割れる問題の対策)
- **GA4の `(not set)`**: `ga4Clean()` で null 化 → ブラウザ/OS の「不明」に集約

### GA4 → Supabase 同期: Apps Script から GitHub Actions へ移行 (重要)

**背景**: 旧構成は Googleスプレッドシート + Apps Script で、設定 (GA4プロパティID / service_roleキー) を **Script Properties に手作業保存**していた。これが事故の温床:
- 新コードを貼り替えて `saveConfig` を**ダミー値のまま実行**すると、本物の設定が `123456789` 等で**上書きされ全同期が停止**する。スマホでは Apps Script 自体を編集・実行できない (拡張機能→Apps Scriptが無い)。

**新構成 (GitHub Actions)**:
- `.github/workflows/ga4-sync.yml`: cron `0 17 * * *` (JST 02:00) + `workflow_dispatch` (`start_date`/`end_date` でバックフィル)
- `scripts/ga4-sync/sync.mjs`: GA4 Data API → `ga4_history` に upsert。`on_conflict` を**テーブルのUNIQUE制約と完全一致**させ (`date,page,country,device_category,browser,os,source,medium`)、再実行が冪等
- 取得ディメンション: `date, pagePath, country, deviceCategory, sessionSource, sessionMedium, browser, operatingSystem` / メトリクス7種

**必要なGitHub Secrets** (リポジトリ Settings → Secrets → Actions):
| 名前 | 中身 |
|---|---|
| `GA4_PROPERTY_ID` | GA4プロパティID (数字。GA4→管理→プロパティ設定) |
| `GA4_SA_KEY` | GCPサービスアカウントのJSON鍵 (全文) |
| `SUPABASE_SERVICE_KEY` | Supabaseの secret key (`sb_secret_...`) または旧 service_role JWT |

`SUPABASE_URL` は repo variable (`vars.SUPABASE_URL`)、未設定なら公開URLをデフォルト使用。

**初回セットアップ (ユーザ操作・1回のみ)**:
1. GCPでサービスアカウント作成 + **Analytics Data API 有効化** + JSON鍵DL
2. そのサービスアカウントのメールを **GA4プロパティに「閲覧者」**で追加
3. 上記3 Secrets を登録

**バックフィル実行**: Actions → 「GA4 → Supabase 同期」→ Run workflow → `start_date=2020-01-01`。
⚠️ **workflow_dispatch の起動は GitHub MCP 権限では 403** (`Resource not accessible by integration`)。起動だけはユーザに依頼し、**ログ確認/監視はMCPで可能** (`actions_list` / `get_job_logs`)。

### `ga4_history` テーブルスキーマ (browser/OS対応版)

```
UNIQUE(date, page, country, device_category, browser, os, source, medium)
```
列: date, page, country, device_category, **browser, os**, source, medium, views, sessions, users, new_users, engaged_sessions, avg_engagement_sec, bounce_rate。
旧テーブルに browser/os が無い場合は **作り直し** (`DROP TABLE` → `CREATE`) してから `syncHistorical`/バックフィルを再実行 (GA4から再取得できるのでデータ消失なし)。ダッシュボード側は `ga4_history` を `select=*` で取得 (列追加前でも400にならない前方互換)。

### 環境メモ

- このリポジトリは `claude/*` ブランチへの push で **GitHub Actions が自動でPR作成＋自動マージ** (`auto-merge.yml`)。手動マージ不要で main に入り GitHub Pages へデプロイされる。
- Supabase MCP は**別アカウント (dodeca-dev) に接続**されており、本番の解析プロジェクト (`clyfrkwuajbauqxvrfyf` / 28yu's Project) は操作できない。SQLはユーザにSQL Editorで実行してもらう。

---

## 2026/06 セッションで得た知見 — PDF比較ツール（`pdf_compare.html`）の画質向上＆プレビュー操作

PDF比較ツールは**完結型の単一ファイル**（`pdf_compare.html` にUI/CSS/JSすべて内包）。
翻訳は2系統あるので注意：
- **UIラベル** … `data-lang-key` 属性 ＋ `js/main.js` の `translations`（`pdf-compare-*` キー）
- **JS実行時メッセージ** … ファイル内の `pdfI18n` オブジェクト（ja/en/zh、`t(key, ...args)` で展開）

### ① ダウンロードPDFの高画質化（タイル分割レンダリング）

**背景**: 旧 `downloadAllPages()` は `scale=3.0` 固定（約216dpi）で、しかも `devicePixelRatio`
未適用のため**画面プレビューより低画質**だった。さらにページ寸法を `width_px × 25.4/72` で算出して
おり**物理サイズが約3倍**にずれていた（DPIの意味が曖昧）。

**重要な原理**: 「共通=グレー／旧=青／新=赤」の配色は**全ピクセルを4分類して塗り替える**処理なので
**本質的にラスター**。ベクター維持とは両立しない → **画質＝解像度（DPI）**に集約される。
この配色こそツールの主機能なので**絶対に変えない**前提で解像度だけ上げる方針。

**実装** (`buildDiffCanvasTiled()` を新設):
- 1ページを **2048×2048 のタイル**に分割し、タイルごとに「描画→4分類→合成」。
  → ブラウザのキャンバス上限（Chrome 約2.68億px）・メモリ上限を回避し、**A1大判でも300〜600dpi**到達。
- pdf.js の `render({ ..., transform: [1,0,0,1,-ox,-oy] })` でタイル領域だけを描画（原点平行移動）。
- 分類ロジックは既存 `buildDiffCanvas()` と**一字一句同一**（配色を変えないため）。
- **保存画質セレクタ** `#quality`（216 / 300既定 / 600 dpi）を追加。`scale = targetDPI/72`。
- **適応的上限** `MAX_OUTPUT_PIXELS = 180000000`。超過ページは `scale *= sqrt(MAX/est)` で自動縮退。
- 物理寸法は**実効DPIから算出** `wMm = canvas.width / effDPI * 25.4`（印刷も正確）。
- PNGは**可逆**のまま（`addImage(..., 'FAST')` ＋ jsPDF `compress:true`）＝画質劣化なしでサイズ削減。
- ⚠️ **プレビュー側 (`buildDiffCanvas` / `showPage`) は従来通り**（`scale 3×dpr`）。
  ダウンロードだけ高解像度パスを通す（プレビュー全ページ高解像度キャッシュはメモリ過大なので避けた）。

### ② 差分プレビューの拡大・パン（枠サイズは不変）

**要件**: 比較実行後のプレビューを拡大したり、ドラッグでつかんで動かして細部確認したい。
ただし**プレビューセクションの枠サイズは変えない**こと。

**実装** (`pdf_compare.html` 末尾の IIFE `setupPreviewZoom()`):
- キャンバスを `.canvas-viewport`（`overflow:hidden` 固定枠）で包み、
  中の `#resultCanvas` に `transform: translate(tx,ty) scale(z)`（`transform-origin:0 0`）を当てる。
  → **ズーム1倍＝従来と完全に同一表示**、枠外にはみ出さない（枠サイズ不変）。
- 操作：**ホイール=カーソル基点ズーム** / **ドラッグ=パン** / **ダブルクリック=リセット** /
  **＋−⟳ボタン**（枠右上オーバーレイ） / **タッチ=ピンチ＋ドラッグ**（Pointer Events＋`touch-action:none`）。
- ズーム範囲 `MIN_Z=1`〜`MAX_Z=8`。1倍未満不可（余白が出ない）。パンは端でクランプ。
- `window.resetPreviewZoom()` を公開し、**ページ切替・比較実行のたびに自動リセット**
  （`showPage` と `runCompareAll` の描画直後で呼ぶ）。
- プレビューは元々高解像度なので、拡大しても細部がくっきり見える（再計算不要、`pageCache` 利用）。
- ツールチップは `pdfI18n` の `zoomIn`/`zoomOut`/`zoomReset` で言語連動。

### ③ トップページ新着・おすすめへの追記

`index.html` の `.news-list` **先頭**に 2026/6・`PDF` タグの項目を追加
（リンク先 `pdf_compare.html`）。翻訳キー `index-news-pdf-compare-v2`（ja/en/zh）を `js/main.js` に追加。
新着は**日付の新しい順**で先頭挿入する。


