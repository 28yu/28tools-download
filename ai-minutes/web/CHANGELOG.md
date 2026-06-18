# AI議事録 自動作成 — 開発記録 (CHANGELOG)

`ai-minutes/web/` の実装履歴と判断記録。新セッションで引き継ぐ際はまず本ファイルと
`DEVELOPMENT.md` を読むこと。

---

## 現状サマリ (2026-06-18 時点)

- **位置づけ**: 打合せ音声・資料から AI が議事録を自動作成するブラウザ完結ツール。
- **公開状態**: **限定公開（パスワード保護, パス `28tools` ＝ ダウンロードと共通）**。
  カード/サイドバー3箇所に `data-locked="true"`、ツールページ `<head>` にもガード。
  **sitemap.xml には未登録**（一般公開時に追加する）。
- **配置**: `/ai-minutes/web/`（深い階層。`../../` で共通アセット参照）。
- **本番反映**: 各 `claude/*` ブランチ → PR マージ → GitHub Pages。
- **動作確認状況**: 高精度版(Gemini)で生成・多言語翻訳・マインドマップまで動作確認済み。
  簡易版(Whisper)は業務ネットワークの CDN ブロックにより未確認のことがある。

## アーキテクチャ (2 層)

| 層 | 文字起こし | 内容理解 | 資料解析 | コスト | 通信先 |
|---|---|---|---|---|---|
| 高精度版(推奨) | Gemini が音声から直接 | Gemini(マルチモーダル) | ◯ | ユーザーの無料枠 | Google のみ |
| 簡易版 | Whisper (Transformers.js) | キーワード分類 | ✕ | ゼロ(ブラウザ完結) | CDN + HuggingFace |

- モデル: `gemini-2.5-flash`（`generationConfig.thinkingConfig.thinkingBudget=0` で思考無効化）。
- 開発者の API キーは不使用。高精度版はユーザー自身の無料 Gemini キー（任意で localStorage 保存）。

## ファイル構成

```
ai-minutes/web/
├── index.html        # UI (head にパスワードガード)
├── minutes.css       # ツール固有 + 図解/マインドマップ + 印刷 CSS
├── app.js            # オーケストレーション
├── lib/
│   ├── gemini.js     # Gemini 生成・翻訳・Files API・JSON修復・503リトライ
│   ├── transcribe.js # Whisper 文字起こし + ヒューリスティック分類 (CDN フォールバック)
│   ├── recorder.js   # マイク録音/テスト/デバイス列挙 (録音は端末保存なし)
│   ├── render.js     # 構造化データ→HTML (図解 / マインドマップ SVG)
│   └── i18n.js       # JS 生成文字列の ja/en/zh 辞書 (t())
├── README.md / DEVELOPMENT.md / CHANGELOG.md
```

---

## 実装履歴 (時系列)

1. **初版**: 2 層構成 (Gemini / Whisper簡易版)、図解＋手描き風スタイル、サイト統合
   (サイドバー3箇所・翻訳・OGP/GA/AdSense)。`renderMinutes` の構造化スキーマを確定。
2. **パスワードロック**: 限定公開化。`data-locked` リンク委譲 + ページガード + sitemap 除外。
3. **多言語化(UI)**: 静的は `data-lang-key`+`translations.aiMinutesPage`、動的は `lib/i18n.js`。
   `changeLanguage()` が `28tools-langchange` を dispatch → app.js が購読し再描画。
4. **容量制限の撤廃**: インライン ~20MB を超える場合は **Gemini Files API**(resumable upload)へ
   自動切替。最大 2GB・48h 保持。`INLINE_LIMIT_BYTES=15MB` 境界。
5. **マイク録音(案A)**: `recorder.js`。getUserMedia + MediaRecorder → 停止時に
   16kHz mono WAV へ変換。**端末ストレージには保存しない**（メモリ Blob のみ）。
6. **マイクテスト + デバイス選択**: AnalyserNode によるレベルメーター、enumerateDevices で
   入力デバイス選択、devicechange で自動更新。
7. **MAX_TOKENS 対策**: thinking 無効化、`maxOutputTokens=65536`、プロンプトで厳格な
   出力上限(要約厳守・逐語禁止)、temperature 0.2、`parseJsonLoose`+`repairTruncatedJson`で
   途中切れ JSON を復元。修復不能かつ MAX_TOKENS は「音声分割」を案内。
8. **Whisper CDN フォールバック**: jsdelivr → esm.sh → unpkg を順に試行。
9. **マインドマップ**: 手描き風(Rough.js)を撤去し、マインドマップ(SVG, foreignObject)に置換。
10. **文言整理**: 「イラスト」表記を全削除、見出しを「AI議事録 自動作成」、説明から「建築現場の」削除。
11. **議事録本文の翻訳**: 言語切替時に `translateMinutes()` で本文も翻訳（構造保持）。
    結果は `state.translatedByLang` にキャッシュ。表示/コピー/HTML保存は `currentData()` で追従。
12. **デザイン改善**: 会議ヘッダー/概要/セクション見出し/カードを色分け・アクセント化。
13. **503 リトライ + 翻訳バグ修正**: 503/500 をバックオフ自動リトライ。翻訳キャッシュは
    `detectContentLang()`(かな→ja/漢字→zh/他→en) で**中身の言語**をキーにする（UI言語と混同しない）。

---

## 重要な判断・知見

- **Gemini を主経路に**: ネイティブにマルチモーダル＋音声直接入力＋無料枠＋CORSでサーバ不要。
  「不特定多数 × 無料 × マルチモーダル」を、ユーザー自身の無料キーで成立させる。
- **2.5-flash の MAX_TOKENS**: 思考トークン消費＋長尺音声で JSON が途中で切れる。
  thinking 無効化＋出力上限＋出力量制限＋途中切れ修復の多段で対処。
- **録音は端末非保存**: メモリ内 Blob のみ。停止時にマイク解放。高精度版のみ Google へ送信。
- **本文翻訳の言語キー**: 中身の言語は UI 言語と一致しない。必ず内容から判定すること
  (ここを取り違えると「翻訳済み」と誤判定して訳さないバグになる)。
- **CACHE_NAME 的なものは無い**: このツールは Cache API を使っていない (pdf-to-excel とは別)。

## 既知の制約・未対応

- **簡易版(Whisper)は業務ネットワークで不安定**: 外部 CDN/HuggingFace から ~150MB の
  モデル DL が必要。社内ネットワークでブロックされると失敗(CDN フォールバックでも回避不可)。
  → 確実にしたい場合はモデルを 28tools 自サイト配信にする案あり(未実装)。
- **超長尺音声**: 65536 トークンでも切れる場合あり。根本対策は「音声分割」または
  「①文字起こし→②要約」の 2 段階処理(未実装)。
- **資料の寸法・記号の精密転記は保証外**(マルチモーダルでも誤読あり)。
- **話者識別はベストエフォート**(厳密なダイアライゼーションはしていない)。
- **翻訳は切替ごとに未訳言語で 1 回 Gemini を呼ぶ**(キャッシュ後は消費なし)。
  自動翻訳ではなく明示ボタン式にする案も保留中(ユーザー判断待ち)。
- **専用アイコン未作成**: サイドバー/カードは暫定で `icon-AI.png` を ai-news と共用。

## 次フェーズ候補

1. 一般公開（パスワード解除 + sitemap 登録 + 専用アイコン）。
2. 長尺音声の 2 段階処理（文字起こし→要約）または分割アップロード。
3. 翻訳を明示ボタン式にする / 出力言語を生成時に選べるようにする。
4. 簡易版モデルの自サイト配信（業務ネットワーク対応）。
5. Word/Markdown エクスポート、議題テンプレートの事前注入。
