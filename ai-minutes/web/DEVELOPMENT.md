# AI イラスト議事録 — 技術設計・既知の制約

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
- **手描き風（hand）**: フォントを `Yomogi`（Google Fonts）に切替、カード背景に Rough.js で手描き矩形 SVG を敷く（`render.js` の `applyRoughBackgrounds()`）。
  - Rough.js は要素の実寸（offsetWidth/Height）が必要なため、**DOM 挿入後**に描画している。

## 既知の制約・落とし穴

1. **Gemini インライン上限 ~20MB**
   音声＋資料の base64 合計が大きいとリクエストが通らない。`gemini.js` の `INLINE_LIMIT_BYTES`(18MB) で事前ガード。
   長時間音声は Files API（resumable upload）対応が将来課題。

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

## 変更時の注意

- `includes/sidebar.html` を変更した場合は `js/main.js` の `INCLUDES_VERSION` を bump（CDN キャッシュバスト）。
- ナビ項目はサイト 3 箇所（`index.html` インラインサイドバー / カテゴリグリッド / `includes/sidebar.html`）を同時更新（CLAUDE.md 参照）。
- 新規ツールページの canonical / OGP / GA / AdSense / sitemap 登録は他ページに揃える。

## 今後の候補

1. Gemini Files API による長時間音声対応
2. 議事録テンプレート（議題リスト）の事前注入
3. 出力 Word/Markdown エクスポート
4. ブラウザ内 LLM（WebLLM）による簡易版の要約強化
