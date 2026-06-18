# AI議事録 自動作成ツール

打合せ音声・資料から、AI が**議事録**を自動作成するブラウザ完結ツール。

- 公開予定パス: `https://28tools.com/ai-minutes/web/`
- 配置: `ai-minutes/web/`

## 特徴

- **2 層構成**
  - **簡易版（ブラウザ完結）**: Whisper (Transformers.js) で文字起こし＋キーワードで自動分類。完全無料・送信なし。
  - **高精度版（Gemini）**: 音声＋資料を Google Gemini が同時理解。発言者推定・資料参照に対応。**ユーザー自身の無料 API キー**を使用（開発者のアカウントは不使用）。
- **2 スタイル切替**: 図解スタイル（Lucide アイコン）／マインドマップ（SVG）。
- **マイク録音**: PC・スマホのマイクから録音 →（停止後に）議事録化。録音データは
  端末に保存せず、ブラウザのメモリ上でのみ処理（停止時に 16kHz mono WAV へ変換）。
- 出力: 画面プレビュー・テキストコピー・HTML 保存・印刷/PDF。
- 多言語 UI（日本語 / 英語 / 中国語、サイト共通の言語切替に追従）。

## ローカル起動

CDN ライブラリを使うため、ファイルを直接開く（`file://`）と一部機能が動かない場合があります。簡易サーバ推奨:

```bash
cd /path/to/28tools-download
python3 -m http.server 8000
# → http://localhost:8000/ai-minutes/web/
```

## ファイル構成

```
ai-minutes/web/
├── index.html        # UI
├── minutes.css       # ツール固有スタイル（2スタイル含む）
├── app.js            # オーケストレーション（入力→処理→描画）
├── lib/
│   ├── gemini.js     # Gemini API マルチモーダル生成
│   ├── transcribe.js # Whisper 文字起こし＋ヒューリスティック分類
│   └── render.js     # 構造化データ→HTML（図解 / マインドマップ）
├── README.md
└── DEVELOPMENT.md    # 技術設計・既知の制約
```

## 使い方

1. 打合せ音声（任意）・資料画像（任意）・文字起こしテキスト（任意）を入力
2. 処理方法を選択（高精度版は Gemini API キーを入力）
3. スタイル（図解／マインドマップ）を選んで「議事録を作成」
4. 内容を確認し、必要なら編集して保存・印刷

## Gemini API キーの取得（無料）

[Google AI Studio](https://aistudio.google.com/app/apikey) でキーを発行。
キーは**ユーザーの端末ブラウザにのみ**保存され、28tools のサーバへは送信されません。
