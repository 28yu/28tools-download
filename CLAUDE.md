# 28tools-download プロジェクトガイド

## プロジェクト概要

このリポジトリは、28tools.comの本番サイトを管理しています。

- **本番サイトURL**: https://28tools.com
- **リポジトリ**: https://github.com/28yu/28tools-download
- **デプロイ方法**: GitHub Pages (mainブランチから自動デプロイ)

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

## ファイル構成

```
/
├── index.html          # トップページ（ポータル）
├── addins.html         # アドインダウンロードページ
├── hatch.html          # ハッチングパターン作成ツール
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
│   │   ├── icon-addon.svg
│   │   ├── icon-family.svg
│   │   ├── icon-hatch.svg
│   │   └── icon-knowledge.svg
│   └── revit-ribbon-preview.png
├── includes/
│   └── header.html     # 共通ヘッダー（言語切り替えボタン含む）
├── sitemap.xml         # SEO用サイトマップ
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
    └── cropbox-copy.html
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
| ファミリ | 準備中 | Revitファミリライブラリ |
| 塗潰し | 利用可能 | ハッチングパターン作成ツール |
| ナレッジ | 準備中 | Tips・チュートリアル |

### デザイン仕様
- カテゴリナビ: サブタイトル下に横並びタブ（背景透明）
- サブタイトル: font-size 1.1rem, opacity 0.8
- カテゴリアイコン: SVG形式（images/portal/）、24x24px

### Revitアドイン配布（GitHub Releases）

**対応バージョン**: Revit 2021, 2022, 2023, 2024, 2025, 2026（全バージョン利用可能）

**GitHub Releases構成**:
| タグ名 | アセットファイル名 |
|--------|-------------------|
| `v1.0.0-Revit2021` | `28Tools_Revit2021.zip` |
| `v1.0.0-Revit2022` | `28Tools_Revit2022.zip` |
| `v1.0.0-Revit2023` | `28Tools_Revit2023.zip` |
| `v1.0.0-Revit2024` | `28Tools_Revit2024.zip` |
| `v1.0.0-Revit2025` | `28Tools_Revit2025.zip` |
| `v1.0.0-Revit2026` | `28Tools_Revit2026.zip` |

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
gh release view v1.0.0-Revit2024
```

**バージョンアップ時の対応**:
1. 新しいタグでGitHub Releaseを作成
2. `main.js`の`downloadConfig.urls`を新URLに更新
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
