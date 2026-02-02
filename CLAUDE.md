# 28tools-download プロジェクトガイド

## プロジェクト概要

このリポジトリは、28tools.comの本番サイトを管理しています。

- **本番サイトURL**: https://28tools.com
- **リポジトリ**: https://github.com/28yu/28tools-download
- **デプロイ方法**: GitHub Pages (mainブランチから自動デプロイ)

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

2. **PR作成**
   - **Claude Codeが `gh pr create` コマンドでPRを作成する**
   - GitHub Actionsによる自動作成はバックアップとして機能
   - PRタイトル: 変更内容を簡潔に記載
   - PR本文: Summary（変更内容）とTest plan（テスト手順）を含める

3. **Netlifyプレビューで確認**
   - PRページにNetlifyプレビューURLが表示される
   - テスト確認を実施

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
- **トップページ（index.html）**: ポータル型レイアウト（サイドバー + メインコンテンツ）
- **アドインページ（addins.html）**: Revitアドインのダウンロード・マニュアル
- **ハッチングページ（hatch.html）**: ハッチングパターン作成ツール
- **サブタイトル**: 全ページ「Revit 作図サポートツール」で統一

### カテゴリ（トップページ）
| カテゴリ | 状態 | 説明 |
|---------|------|------|
| アドイン | 利用可能 | 6機能のRevitアドイン |
| ファミリ | 準備中 | Revitファミリライブラリ |
| 塗潰し | 利用可能 | ハッチングパターン作成ツール |
| ナレッジ | 準備中 | Tips・チュートリアル |

### デザイン仕様
- サイドバー幅: 100px
- サブタイトル: font-size 1.1rem, opacity 0.8
- カテゴリアイコン: SVG形式（images/portal/）

## ハッチングパターン作成ツール（hatch.html）

### 概要
Revit / AutoCAD用のハッチングパターンファイル（.pat）を作成するWebツール

### 対応パターン
| パターン | 設定項目 |
|---------|---------|
| 斜線（diagonal） | 角度、間隔、破線設定 |
| クロス（crosshatch） | 角度、間隔、破線設定 |
| ドット（dot） | X/Y間隔、ドットサイズ |
| 芋目地（tile-grid） | 幅、高さ、目地あり/なし、目地サイズ |
| 馬目地（tile-brick） | 幅、高さ、目地あり/なし、目地サイズ（1/2固定） |
| RC（rc-concrete） | 線内間隔、グループ間隔 |

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
