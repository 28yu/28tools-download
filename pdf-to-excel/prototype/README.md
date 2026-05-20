# PDF→Excel Step 2 プロトタイプ（罫線抽出検証）

ハンドオフ資料 (`28yu/Revit-Add-ins:Docs/HANDOFF-PDFtoExcel-Tool.md`) の **Step 2: 罫線抽出プロトタイプ (A-2 検証)** の最小実装。

## 目的

PDF2 page 1（基礎大梁リスト）を題材に、**PDF.js の operatorList から罫線を抽出し、表セルを構築できるか** を実証する。

## 結論

✅ **罫線抽出という手段は機能する**。ただし本実装はこの手段を採らない見込み。

詳細な検証結果と方針修正は `../../docs/PDF-to-Excel-Step2-Report.md` を参照。本プロトタイプは「罫線抽出は技術的に可能」という確認の意味で残しているが、本実装は **アンカーテキスト駆動** の方が軽量で適切と判断したため別パスで進める予定。

## 実行方法

```bash
cd prototype
npm init -y
npm install pdfjs-dist@4 canvas
node extract.mjs   # 線分抽出 + クラスタリング → lines.json
node render.mjs    # 検出した罫線をオーバーレイ表示 → page1-overlay.png
node grid.mjs      # 行列クラスタからセル化 + テキスト割当 → band1.csv
```

サンプル PDF は本リポジトリには含めない（機密性のため）。HANDOFF 資料に従い、自前で用意した PDF を `PDF` 定数のパスに置き換える。

## ファイル

| ファイル | 内容 |
|---|---|
| `extract.mjs` | operatorList 走査 → 線分配列 + 行列クラスタ算出 |
| `render.mjs` | ページレンダリング + 検出線オーバーレイ（視覚デバッグ用） |
| `grid.mjs` | 検出線でセル化 → テキスト割当 → CSV ダンプ |
| `sample-output/page1-overlay.png` | PDF2 p.1 全体オーバーレイ（赤=横線、青=縦線） |
| `sample-output/zoom-fg1.png` | FG1 周辺ズーム |
| `sample-output/band1.csv` | 上段帯（FG1〜FG6）の抽出 CSV |

## 主な実装上のポイント

1. **薄い fill 長方形を線として認識する**
   構造図 PDF では罫線が `stroke` ではなく **薄い filled rectangle** で描画されることが多い。`OPS.fill` も `OPS.stroke` と同様に処理する。

2. **CTM スタック管理**
   `save` / `restore` / `transform` を追跡し、各 `constructPath` の座標を最終的な MediaBox 座標に変換する。

3. **viewport.transform 適用**
   ページが回転している場合（PDF2 は `rotate=90`）、MediaBox 座標 → 表示座標の変換に `page.getViewport().transform` を適用する。これを忘れると Y 座標が大幅にずれる。

4. **PathOps の内部コード**
   `constructPath` の args[0] に格納される内部コード:
   - 13 = moveTo、14 = lineTo、15 = curveTo、16 = curveTo2、17 = curveTo3、18 = closePath、19 = rectangle

## 既知の制限

- 「カード単位の検出」（各 FG が独立サブテーブル）はまだ実装していない。`grid.mjs` は手動で帯 Y 範囲 (`Y_TOP=200, Y_BOT=380`) を指定して band 1 のみを切り出す形。
- 本実装フェーズではカード境界検出（外枠長方形を見つける）→ カードごとに内部グリッド構築 → スキーマ列にマップ、の順で進める想定。
