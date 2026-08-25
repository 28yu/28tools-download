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

出力スタイルは `render.js` の `STYLES` 配列と `mountMinutes()` のディスパッチ表で管理する。
`index.html` の `.style-btn[data-style]` と 1 対 1 で対応し、コンテナには `style-<名前>` クラスが付く。

**どのスタイルも「入力データにある情報だけ」を並べ替えて見せる**という原則を守ること。
項目同士の関係（この決定がこの ToDo を生んだ、等）はスキーマに存在しないので、
推測して線で結んではいけない（事実忠実性が議事録の生命線）。

- **図解（figure）**: 番号バッジ＋カードレイアウト。既定。
- **タイムライン（timeline）**: `renderTimeline()`。`discussions` を時系列の軸に並べ、
  その下に「この打合せの結論」として `decisions` / `todos` を 2 カラムのカードで置く。
  縦線は `.mn-tl-step::before`（最後の項目は非表示）で描画。
- **担当者別（matrix）**: `renderMatrix()`。`todos` を `assignee` でグルーピングする。
  assignee が空の ToDo は「未割当」カードに入れる（担当者を推測しない）。

新しいスタイルを足すときは ①`render.js` に描画関数＋`STYLES`/ディスパッチ表
②`index.html` に `.style-btn` ③`js/main.js` に `aimin-style-*` 翻訳
④`minutes.css` と `app.js` の `MINUTES_INLINE_CSS` の**両方**に CSS
（後者は HTML 保存用。片方だけだと保存した HTML が崩れる）。

⚠️ 出力ツールバーの **`🍌 ビジュアル資料` は描画スタイルではない**。
`.style-btn[data-style="visual"]` だが `mountMinutes()` は呼ばず、
`applyStyle()` が議事録本体とビジュアル資料ペインを入れ替えるだけ。
タブを開いただけでは画像生成は走らない（課金・待ち時間が発生するため、
「画像を生成」を押したときだけ実行する）。

**マインドマップ（mindmap）は 2026-08 に廃止**。SVG レイアウトの保守コストの割に
使われず、タイムライン／担当者別で用途が置き換わったため。

## ビジュアル資料（Gemini 画像モデル＝通称「ナノバナナ」）

議事録の要点から 1 枚絵（サマリーポスター／インフォグラフィック／ホワイトボード風）を作る
オプション機能。`gemini.js` の `generateVisualImage()` ＋ `app.js` の `setupVisual()`。

| 選択肢 | モデル ID | 位置づけ |
|---|---|---|
| 標準 | `gemini-2.5-flash-image` | 無料枠あり・高速。**画像内の日本語は崩れやすい**ので、プロンプトで「見出し・キーワードのみ」に抑えている |
| 高品質 Pro | `gemini-3-pro-image-preview` | 文字レンダリングが強くインフォグラフィック向き。**API 側で課金設定が必要**（無料キーでは 429/403 になる） |

- 呼び出し口は議事録本体と**同じ `generateContent` エンドポイント・同じユーザーキー**。
  違いは `generationConfig.responseModalities: ['TEXT','IMAGE']` と `imageConfig` だけ。
  レスポンスの `parts[].inlineData`（base64 PNG）を data URL にして表示する。
- `imageConfig`（`aspectRatio` / `imageSize`）を受け付けないモデル・API 版があるため、
  **400 かつメッセージに imageConfig 系の語が含まれる場合は設定を外して 1 回だけ再試行**する。
- **画像の無料枠は議事録本体（テキスト）とは別枠**。429 は専用メッセージ（`vis-err-rate`）で案内する。
- 送信するのは**要約済みテキストのみ**（音声・資料は再送しない）。
- ⚠️ **画像内の文字は「描かれた絵」**なので誤字・脱字が起こりうる。UI とキャプションに
  必ず注意書きを出し、**正式な記録は議事録本体（テキスト）**という位置づけを崩さないこと。
  同じ理由で、翻訳（言語切替）では画像を再生成しない（課金・待ち時間が発生するため）。
- 議事録が更新されたら `resetVisual()` で画像を破棄する（内容と食い違うため）。
- 画面ではビジュアル資料と議事録本体はタブで**入れ替わる**が、印刷／HTML 保存では
  **両方**を「画像（表紙）→ 議事録」の順で出す（紙では両方あった方が資料になるため）。
  印刷時は `.output-panel` を flex にして `.visual-pane { order: -1 }` で前に出し、
  `.visual-result { break-after: page }` / `.mn-visual { break-before: page }` で改ページする。
- 計測は `logToolEvent('minutes-visual')`（ダッシュボードの `TOOL_EVENT_LABELS` に登録済み）。

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

## 長時間モード（自動分割・保存・全自動作成）

1 時間級の打合せ向けに、録音を続けたまま一定間隔で自動分割し、各区間を Gemini で
自動議事録化して 1 本に結合する。詳細な判断記録は `CHANGELOG.md`（2026-07-27）。

- `lib/recorder.js` の **`SegmentedMicRecorder`**: 間隔ごとに MediaRecorder を stop→即再開し、
  単独再生可能な区切り（16kHz mono WAV）を作る。マイクは録音中ずっと開いたまま。
  ⚠️ 古いレコーダーの `onstop` は次セグメント開始後に発火するため、`onstop` 内で
  `this.recorder=null` にしないこと（次の参照を壊す）。最短間隔は 30 秒でクランプ。
- `lib/saver.js` の **`SegmentSaver`**: `showDirectoryPicker` でフォルダ直書き込み。
  非対応時はダウンロードにフォールバック。書き込みは直列化（同一ハンドル競合回避）。
  フォルダ選択は**クリック直後**（getUserMedia より前）に呼ぶ＝ユーザージェスチャ消費対策。
- `lib/merge.js` の **`mergeSegments()`**: 追加 AI 呼び出しなしの決定的結合。
  要約は `【0〜10分】…` の時間帯付き連結、議論トピックは頭に時間帯ラベル。
- `app.js`: 保存→Gemini を直列化。**保存が安全網**（Gemini 失敗でも音声は残る＝失敗区間だけ再作成可）。
  全自動なので**高精度版＋API キー必須**。

## 画面レイアウト（2026-08 刷新）

「開いた瞬間に何をすればいいか分かる」ことを優先して、余白・階層・順番を組み直した。
配色・書体・線画アイコンは既存サイトのまま（`css/style.css` のトークンを使用）。

| 部品 | 実装 | 意図 |
|---|---|---|
| 注意書き | `.notice-line` ＋ `#notice-body`。`localStorage['ai-minutes-notice-seen']` で**初回だけ自動で開く** | 「使う前に謝る」画面をやめる。情報は消さず出すタイミングを変える |
| 入力の入口 | `#input-tabs`（録音する / ファイルから作る）＝ `.seg` | 対等な2つの入口を対等に見せる（旧: 片方が詳細パネルの底） |
| 録音ボタン | 円形 `.rec-btn`＋`#rec-timer`＋`#rec-level`（AnalyserNode で録音中も入力レベル表示） | 1画面目に「今やること」を1つだけ置く |
| 状態チップ | `.chip[data-open]` → `openRow()` で対応する設定行へ | 状態表示がそのまま設定への近道になる |
| 実行の可否 | `updateSetupStrip()` がキー未入力なら `#record-btn` / `#generate-btn` を `disabled` にし、`.blocker` を出す | 押せるものは必ず成功する状態にする |
| 進捗 | `#status` をヒーロー内（ボタン直下）に配置。ログは `#log-toggle` で開閉 | 押した場所で結果が返る |
| 設定 | `.row` ×5（処理方法 / マイク / API キー / 長時間モード / 保存先）。右側に現在値、開閉は1つずつ | 開かなくても状態が分かる |
| 出力 | 左＝`.seg`（図解 / タイムライン / 担当者別 / ビジュアル資料）、右＝`#share-btn` のメニュー | ツールバーが伸び続けない構造にする |

- 設定行の開閉は `grid-template-rows: 0fr → 1fr` のトランジション。`.row-body > div` の
  `overflow:hidden` が無いと閉じたときに中身がはみ出すので消さないこと。
- `#apikey-block` は API キーの**行**に付いている（`setupModeSwitch()` が簡易版のとき
  `.hidden` を付けて行ごと隠す）。
- 録音中の入力レベルは MediaRecorder とは別に、同じ MediaStream に AnalyserNode を
  ぶら下げているだけ。取得に失敗してもメーターを諦めるだけで**録音は続行**する。

## 変更時の注意

- `includes/sidebar.html` を変更した場合は `js/main.js` の `INCLUDES_VERSION` を bump（CDN キャッシュバスト）。
- `js/main.js` の翻訳（`aimin-*` 等）を変更したら、各ページの `<script src=".../js/main.js?v=...">` の
  `?v=` を bump（このツールは `ai-minutes/web/index.html` 側）。
- **`minutes.css` を変更したら `index.html` の `./minutes.css?v=...` を bump**。
  GitHub Pages の CDN（Fastly, TTL ~10分）とブラウザキャッシュで古い CSS が残り、
  「直したはずのレイアウトが直らない」事故になる。
- ナビ項目はサイト 3 箇所（`index.html` インラインサイドバー / カテゴリグリッド / `includes/sidebar.html`）を同時更新（CLAUDE.md 参照）。
- 新規ツールページの canonical / OGP / GA / AdSense / sitemap 登録は他ページに揃える。

## 今後の候補

1. ~~Gemini Files API による長時間音声対応~~ → 実装済み（長時間モード, 2026-07）
2. 長時間モードの結合サマリを最後にもう一度 Gemini で要約し直す（現状は決定的連結）
3. 議事録テンプレート（議題リスト）の事前注入
4. 出力 Word/Markdown エクスポート
5. ブラウザ内 LLM（WebLLM）による簡易版の要約強化
