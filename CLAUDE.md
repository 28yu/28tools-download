# 28tools-download プロジェクトガイド

## プロジェクト概要

このリポジトリは、28tools.comの本番サイトを管理しています。

- **本番サイトURL**: https://28tools.com
- **リポジトリ**: https://github.com/28yu/28tools-download
- **デプロイ方法**: GitHub Pages (mainブランチから自動デプロイ)

## 開発ワークフロー

### ブランチ戦略

```
testブランチ → ローカルで開発・確認（非公開）
     ↓ 問題なければマージ
mainブランチ → 本番サイト（28tools.com）として公開
```

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
├── index.html          # メインページ
├── main.js            # JavaScriptロジック
├── sitemap.xml        # SEO用サイトマップ
├── CNAME              # カスタムドメイン設定（28tools.com）
├── CLAUDE.md          # このファイル（開発ガイド）
└── manual/            # マニュアルページディレクトリ
    ├── manual1.html
    ├── manual2.html
    ├── manual3.html
    ├── manual4.html
    ├── manual5.html
    └── manual6.html
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
