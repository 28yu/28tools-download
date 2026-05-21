# PDF → Excel 構造図抽出ツール — 技術設計ノート

このドキュメントは将来のセッションで開発を引き継ぐためのものです。
README はエンドユーザ向け、こちらは開発者向けの深い記録。

## アーキテクチャ概要

```
pdf-to-excel/web/
├── index.html       UI (CSS埋め込み、28tools.com デザインシステム準拠)
├── app.js           オーケストレータ — UI と処理の橋渡し
├── lib/
│   ├── extractors.js  5種類の抽出器 + 共通ユーティリティ
│   ├── parsers.js     rebar/section パーサ + JIS H 形鋼カタログ
│   ├── ocr.js         Tesseract.js v5 ラッパ (遅延ロード)
│   └── excel.js       ExcelJS による .xlsx 生成 (遅延ロード)
└── README.md        ユーザ向け起動方法
```

### 処理フロー

```
PDF drop
  → SHA-256 ハッシュ計算 → Cache APIで既存結果検索
  → ヒットなら即座にプレビュー、ミスなら以下
  → pdf.js でPDFを読み込み
  → 各ページループ:
       ├ テキスト抽出を試行
       │   ├ isObfuscated() で難読化判定
       │   ├ detectPageCategory() で rc-beam / s-beam 判定
       │   └ extractRcBeams / extractSBeams → 該当なら採用
       └ テキストが0件 or 抽出失敗 → OCR フォールバック
           ├ ocrPage() で Tesseract.js (3 PSM パス、DPI 600)
           ├ detectOcrCategory() で category 判定 (sc/sb/lg)
           ├ extractColumnsFromOcr / extractSmallBeamsFromOcr /
           │ extractLargeBeamsFromOcr を該当ルートで実行
           └ 不明時は3者試行して最大件数を採用
  → 結果を Cache API に保存 (0件は保存しない)
  → renderTabs() でプレビュー描画
  → buildExcelBlob() で .xlsx Blob 生成 → ダウンロード
```

## OCR 戦略 (Tesseract.js)

### 必須設定
```js
await Tesseract.createWorker(['jpn', 'eng'], 1, {
  langPath: 'https://tessdata.projectnaptha.com/4.0.0_best', // ← 'best' は必須
});
await worker.setParameters({
  user_defined_dpi: '600',         // ← 自動推定無効化 (重要)
  preserve_interword_spaces: '1',
});
```

### なぜ各設定が必須か
- **`_best` モデル**: デフォルトは `fast` だが、小さい日本語文字の認識率が大幅に劣る。`best` は jpn だけで ~20MB あるがキャッシュされる。
- **`user_defined_dpi`**: 設定しないと Tesseract が文字サイズから DPI を自動推定し、CAD 図面では ~400 程度と低く見積もる。結果として「**Image too small to scale**」警告で text line が捨てられる。これが「OCR が文字を見つけられない」最大の原因だった。
- **DPI 600**: 500 でも動くが 600 で確実。メモリは ~140MB の画像になるがブラウザは耐える。

### 3 PSM パス戦略
| PSM | 役割 | 得意 |
|---|---|---|
| 11 (sparse) | 散らばったラベル抽出 | アンカー、符号 |
| 6 (block) | 表形式テキスト | 連続したセル値 |
| 3 (auto) | 全自動 | 残りの取りこぼし回収 |

3パスをマージ (bbox-bucket重複排除) して最大カバレッジ確保。時間は単一パスの ~3倍。

### 画像前処理は不要
過去に手動の grayscale + threshold を試したが、Tesseract 内蔵 Leptonica の方が賢く処理する。手動処理は逆効果だったため**現在は素のキャンバスを渡す**。

## OCR データの「壊れ方」と対処パターン

実 PDF (Tesseract.js best モデル) で観測された壊れパターンを `lib/parsers.js` の `parseSection()` に集約。

### パターン①: 末尾切断
```
入力: "H-200×1"            (本来は H-200×100×5.5×8)
入力: "H-298×1"            (本来は H-298×149×5.5×8)
処理: B=1 が < 30 → 「OCR切断」と判定 → B を null に → JIS lookup で補完
結果: H-200×100×5.5×8 (推定フラグ付き)
```

### パターン②: 小数点欠落
```
入力: "H-300×150×65×9"     (本来は ×6.5×9)
処理: tw=65 が > 50 → 「小数点欠落」 → /10 で 6.5 に
結果: H-300×150×6.5×9
```

### パターン③: 重複×記号
```
入力: "H-300×150×X6.5×9"  / "H-346×X174×X6×9"
処理: normalizeSepX() で [xX×]+ を単一 'x' に collapse
```

### パターン④: H 値 run-on
```
入力: "H-1756×175×7.5×11"  (本来 175×175×7.5×11)
処理: H=1756 が > 1500 → 末尾桁削除 → 175
```

### パターン⑤: B 連結エラー
```
入力: "SH-700×25014×28"    (本来 700×250×14×28)
処理: B=25014 > 1500 → 桁分割 → B=250, tw=14, 既存tw=28はtfに移動
```

### パターン⑥: 角形マーク誤読
```
入力: "L1-400×400×22"      (本来 □-400×400×22)
処理: section regex を非アンカー化 → 内部の "-400x400x22" を抽出
```

### パターン⑦: マテリアル文字列の単語分割
```
入力: pdfjs が "SN" + "490B" を別アイテムとして返す
処理: detectMaterials() で**幅+隣接距離**でトークン化してから regex
```

## JIS G 3192 H 形鋼カタログ補完

### 設計判断: なぜ H 形鋼だけ補完するか
- **H 形鋼**: 規格品 (JIS G 3192) — H 値で寸法が一意に決まる (narrow-flange 系) → 安全に補完可能
- **角形鋼管 (□)**: 同じ (A,B) に複数の板厚 (例: 700×700×19/22/25/28/32) → **不可能**
- **BH (組立H)**: カスタム製作 → 規格外
- **その他形鋼 (BH/I/L/C/T)**: 同じく一意決定できないため未対応

### カタログ構造
```js
const JIS_H_SECTIONS = [
  [H, B, tw, tf],
  [100,  50, 5,   7   ],
  // ...
  [600, 200, 11,  17  ],
  [900, 300, 16,  28  ],
];
```

38件登録 (narrow-flange 22件 + wide-flange 16件)。

### `lookupJisH(H, B)` の挙動
- H が catalog にない → null (補完しない)
- H 一致、B null → narrow-flange (最小B) を返す
- H 一致、B 一致 → そのエントリ
- H 一致、B 近似 (±5mm) → 近似エントリ
- H 一致、B 大きく異なる → **null** (誤補完防止)

最後のルールが重要: `SH-700×350` のような JIS にないカスタム断面が誤って `700×300×13×24` に補正されないようにする。

### 優先度ルール
複数の鋼材グレードが検出された場合、JIS慣習で構造用優先:
```js
const STEEL_PRIORITY = ['SN', 'SM', 'BCP', 'BCR', 'STKR', 'STK', 'SS'];
```

例: SS400 が 5 回出現、SN490B が 1 回出現 → SN490B を採用 (構造規格)

## マルチバンドテーブル対応

### 問題
1ページに同じx座標で複数のy位置に anchor が並ぶケース:
```
G101 (x=1469, y=805)   ← Band 1
G104 (x=1469, y=3543)  ← Band 2
```

旧コード: 隣接ソートで G101 と G104 が隣り合い、midpoint が同じ x → **境界幅が 0**。

### 解決: `assignXCardBounds(anchors)`
1. anchor を x で sort
2. x が ±50px 以内の anchor を**クラスタ化**
3. クラスタ中心の midpoint で境界決定
4. クラスタ内の全 anchor は同じ境界を共有

これにより G101 と G104 は同じ「列」として正しく扱われ、それぞれの y より下を探索する。

## キャッシュ

### 仕組み
- `CACHE_NAME = 'pdf-extract-vN'` の named cache
- key = `'/cache/' + SHA-256(PDF buffer)`
- value = 抽出結果 JSON
- 完全ローカル、外部送信なし

### 運用ルール
1. **抽出ロジックを変更したら必ず `CACHE_NAME` を bump** — 古いキャッシュが新ロジックの結果を masking しないため
2. **0件結果はキャッシュしない** — 抽出失敗を永続化しない
3. ユーザがキャッシュをクリアしたい時: F12 → アプリケーション → ストレージ → 「サイトデータをすべてクリア」

## 診断ログ

ブラウザ F12 コンソールに以下が出る:
```
[extractColumnsFromOcr] rawAnchors = SC1@(1363,711) | SC2@(2348,711) | ...
[extractColumnsFromOcr] unique symbols = SC1×1, SC2×1, ...
[extractSmallBeamsFromOcr] OCR sample (first 30): "共" "..." "..."
[extractLargeBeamsFromOcr] rawAnchors = G101@(1469,805) | ...
```

OCR トラブルシュート時はこれを見れば「何が拾えて何が拾えてないか」が分かる。

## テスト PDF の置き場と特徴

実際のテストに使った PDF (バックアップ推奨):
- **PDF1 (テキスト型)**: PDF2 ファイル — RC基礎大梁 (FG, テキスト) + S大梁 (SG, テキスト) + 小梁 (SB, 画像/OCR)
- **柱リスト系**: 画像PDF、SC1-SC6 (test_柱リスト.pdf) / C101-C105 (test_柱リスト2.pdf)
- **大梁・小梁系**: 画像PDF、G101-G107A (大梁) + SB系 (小梁) を2ページ構成

各 PDF の OCR 結果は `/tmp/pdf-proto/test*-ocr.tsv` に残されており、Node 側で `extract*FromOcr` の動作確認に使える:

```bash
node --input-type=module -e "
import { extractLargeBeamsFromOcr } from './pdf-to-excel/web/lib/extractors.js';
import { readFile } from 'node:fs/promises';
const tsv = await readFile('/tmp/pdf-proto/test7p1-ocr.tsv', 'utf8');
const words = ... /* TSV → words 変換 */;
console.log(extractLargeBeamsFromOcr(words));
"
```

## 既知の制限と未解決事項

### 解決困難
1. **柱の角形鋼管 t 値の補完不可** — 同寸法の板厚バリエーションが多すぎる
2. **OCR が行全体を見落とすケース** — Tesseract の根本的限界
3. **BH (組立H)** は規格外なので OCR 値をそのまま信じるしかない

### 未着手 (次フェーズ候補)
1. **マッピングプリセット機能** — Excel列 ↔ Revitパラメータ対応表を JSON 保存/読込
2. **Revit プラグイン (C# / Dynamo)** — Excel → タイプ生成
3. **形式→ファミリのルーティング表** — `形式=SH` → 特定ファミリ
4. **マテリアル変換表** — `SS400` → Revit マテリアル名
5. **RC 大梁の動作検証** — 実 PDF サンプル未取得

### UI 改善余地
1. **編集セル→Excel反映** — 黄色セルで編集した値が現在 Excel 出力に反映されない (内部状態のみ更新)
2. **キャッシュバイパスボタン** — 強制再抽出
3. **ROI 指定 OCR** — 特定の行/領域だけ高 DPI で再OCR

## デプロイ予定 (本番)

ローカル動作確認後、`28tools.com/pdf-to-excel/web/` で公開予定:
- CSP ヘッダ追加 (CDN ホスト allowlist 必要)
- アクセス制限なし (誰でも利用可、機密性はクライアント完結で担保)
- README の英訳・中訳 (現在は日本語のみ)
- vendor 化検討 — Tesseract.js / ExcelJS をローカル配置すれば `connect-src 'none'` 可能

## 開発のお作法

### ローカル起動
```bash
# リポジトリルートで
python3 -m http.server 8000
# ブラウザで:
http://localhost:8000/pdf-to-excel/web/
```

### 修正フロー
1. `lib/*.js` を編集
2. ブラウザ Ctrl+F5 で反映確認
3. ロジック変更時は `app.js` の `CACHE_NAME` を bump
4. ブラウザでもう一度動作確認
5. `git commit` + `git push origin claude/pdf-to-excel-docs-MA4uP`
6. GitHub Actions で自動 PR

### Node 側の検証
ブラウザを起動せず Node でロジック単体テスト可能 (`lib/extractors.js` `lib/parsers.js` は ES Modules で Node でも動く):
```bash
node --input-type=module -e "
import { parseSection } from './pdf-to-excel/web/lib/parsers.js';
console.log(parseSection('H-200×1'));
"
```

これで「regex がマッチするか」「JIS lookup が動くか」を素早く検証できる。

### Tesseract.js のテストはローカル CLI で代用可
ブラウザの Tesseract.js は遅いし debug 困難。同じパラメータの CLI tesseract で代用:
```bash
pdftoppm -r 600 -png input.pdf out
tesseract out-1.png out-ocr -l jpn+eng --psm 11 --dpi 600 tsv
```

結果の TSV を Node 側に流して `extract*FromOcr` を回せばロジック検証になる。
ブラウザ Tesseract.js とは細部の出力が異なる場合があるが、概ね同じ。
