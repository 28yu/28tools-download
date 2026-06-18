# AI議事録 自動作成 — 技術設計・既知の制約

## 設計方針（なぜこの構成か）

「不特定多数 × 無料 × 高精度マルチモーダル」は単一手段では両立しないため、**2 層**に分離した。

| 層 | 文字起こし | 内容理解 | 資料解析 | コスト負担 | 精度 |
|---|---|---|---|---|---|
| 簡易版 | Whisper (Transformers.js) | キーワードヒューリスティクス | ✕ | ゼロ（ブラウザ完結） | 低〜中 |
| 高精度版 | Gemini が音声から直接 | Gemini（マルチモーダル） | ◯ | ユーザーの無料枠 | 高 |

### Gemini を主経路にした理由
Gemini はネイティブにマルチモーダル（**音声・画像・PDF を直接入力可**）。
Whisper を介さず音声をそのまま渡せるため「音声＋資料の同時理解」が本質的に実現でき、
かつエンドポイントが CORS 対応のため**サーバ不要・ブラウザから直接 fetch** できる。
ユーザー自身のキーを使うので、要件「開発者のアカウントを裏で使わない」を満たす。

## データスキーマ（処理層と描画層の契約）

`gemini.js` / `transcribe.js` はともに次の形を返し、`render.js` がこれを描画する:

```js
{
  meta: { title, date, location, project, attendees: [..] },
  summary: "全体サマリ",
  decisions:   [{ text, speaker, refs:[..] }],
  todos:       [{ text, assignee, due }],
  issues:      [{ text, speaker }],
  discussions: [{ topic, points:[..], speaker }]
}
```

Gemini 側は `responseSchema` でこの形を強制している（JSON モード）。

## スタイル実装

- **図解（figure）**: Lucide アイコン（UMD, `data-lucide` 属性 → `lucide.createIcons()` で SVG 化）＋カードレイアウト。
- **マインドマップ（mindmap）**: `render.js` の `renderMindMap()` が SVG を生成。中央に
  会議タイトル、左右に 4 カテゴリ（決定/ToDo/課題/議論）、その先に各項目ノードを配置し、
  ベジェ曲線で接続する。各ノードは `foreignObject` 内の HTML（インラインスタイルのみ）で
  描画するため、テキスト折返しが効き、HTML 保存／印刷でもそのまま表示できる。
  - ノード高さは固定＋テキスト 2 行クランプにして、実寸測定なしで決定的にレイアウトしている。

## 既知の制約・落とし穴

1. **ファイルサイズ — Files API で実質無制限**
   Gemini のインライン送信(base64 を本文同梱)は ~20MB の上限がある。
   `gemini.js` は合計が `INLINE_LIMIT_BYTES`(15MB) 以下なら高速なインライン送信、
   超える場合は **Files API (resumable upload)** に自動切替する。
   Files API は 1 ファイル最大 2GB・48 時間保持のため、長時間の打合せ音声でも投入可能。
   音声はアップロード後 PROCESSING → ACTIVE になるまで `uploadViaFilesApi()` がポーリングする。
   - 注意: Files API はカスタムヘッダ `X-Goog-Upload-*` と、レスポンスの
     `X-Goog-Upload-URL` ヘッダ読取りに CORS 許可が必要。Google エンドポイントは
     ブラウザ利用(AI Studio SDK)を許可しているため動作するが、将来仕様変更に注意。
   - 実質的な上限はモデルのコンテキスト長(音声 ~32 tokens/秒)。gemini-2.5-flash は
     大容量コンテキストのため数時間の音声でも収まる。

2. **簡易版の精度は割り切り**
   ブラウザ内 LLM を載せず、キーワード分類のみ。日本語要約・発言者識別は高精度版（Gemini）が担当。
   簡易版では資料画像は解析されない（その旨ログに明示）。

3. **Whisper モデル DL（初回）**
   `onnx-community/whisper-base` を初回に DL（数十 MB）。日本語精度を上げるなら `whisper-small` に変更可（`transcribe.js` の `ASR_MODEL`）。重くなる点に注意。

4. **発言者識別はベストエフォート**
   Whisper / Gemini とも厳密な話者ダイアライゼーションは行わない。Gemini にはプロンプトで役割推定（「現場監督」「設計」等）を指示している。

5. **図面の寸法・記号の転記は保証外**
   マルチモーダルでも細字 CJK・寸法線の正確な読取りは限界がある。注意書きを UI に明示。

6. **API キーの保存**
   「保存する」選択時のみ `localStorage`（キー名 `ai-minutes-gemini-key`）に平文保存。共有端末では非推奨。28tools サーバへは一切送信しない。

## 多言語対応 (ja / en / zh)

言語は 2 系統に分けて管理している。

| 対象 | 仕組み | 定義場所 |
|---|---|---|
| 静的 UI テキスト (見出し・ラベル・注意書き等) | `data-lang-key` / `data-lang-placeholder` | `js/main.js` の `translations.aiMinutesPage` |
| JS が実行時に生成する文字列 (ステータス・エラー・議事録出力ラベル・コピー用テキスト) | `lib/i18n.js` の `t(key, vars)` | `lib/i18n.js` の `DICT` |

- 言語切替時、`js/main.js` の `changeLanguage()` が `window` に
  **`28tools-langchange`** イベントを発火する。`app.js` がこれを購読し、
  `setLang()` → 動的テキスト再適用 → 議事録があれば再レンダリングする。
- 初期言語は `localStorage['28tools-language']` を直接読む (`detectLang()`)。
  main.js の DOMContentLoaded 順序に依存しないため。
- ページガード (head のパスワード prompt) も `localStorage` の言語で文言を出し分け。
- **Gemini が生成する議事録の本文は会議言語のまま** (ラベルのみ多言語化)。
  日本語音声を機械翻訳しない方針 (誤訳リスク回避)。
- 文字列を追加するときは: 静的なら main.js + `data-lang-key`、
  動的なら `lib/i18n.js` の `DICT` に ja/en/zh を追加する。

### 生成済み議事録の「内容」の翻訳
ラベル(見出し)は `t()` で即時に切り替わるが、議事録の**本文**は実際の会議言語のまま。
言語切替時、`app.js` の `renderMinutesForCurrentLang()` が動作する:
- 切替先言語の翻訳が `state.translatedByLang` にキャッシュ済みならそれを描画。
- 未翻訳かつ Gemini キーがあれば `translateMinutes()`(gemini.js) で構造を保ったまま翻訳し、
  結果をキャッシュして描画。生成時の言語の版には元データを seed 済み。
- キーが無ければ本文は元のまま(見出しのみ翻訳)。
コピー/HTML保存/スタイル切替は `currentData()` を使い、表示中の翻訳版に追従する。

## 変更時の注意

- `includes/sidebar.html` を変更した場合は `js/main.js` の `INCLUDES_VERSION` を bump（CDN キャッシュバスト）。
- ナビ項目はサイト 3 箇所（`index.html` インラインサイドバー / カテゴリグリッド / `includes/sidebar.html`）を同時更新（CLAUDE.md 参照）。
- 新規ツールページの canonical / OGP / GA / AdSense / sitemap 登録は他ページに揃える。

## 今後の候補

1. Gemini Files API による長時間音声対応
2. 議事録テンプレート（議題リスト）の事前注入
3. 出力 Word/Markdown エクスポート
4. ブラウザ内 LLM（WebLLM）による簡易版の要約強化
