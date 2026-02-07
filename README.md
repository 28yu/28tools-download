# 28 Tools - Revit 作図サポートツール

[![Website](https://img.shields.io/website?url=https%3A%2F%2F28tools.com&style=flat-square&label=28tools.com)](https://28tools.com)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-deployed-success?style=flat-square)](https://28tools.com)
[![GitHub Stars](https://img.shields.io/github/stars/28yu/28tools-download?style=flat-square)](https://github.com/28yu/28tools-download/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/28yu/28tools-download?style=flat-square)](https://github.com/28yu/28tools-download/issues)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

> **Revit作図を効率化する無料ツール集**
> 6つの便利なアドイン + ハッチングパターン作成ツールをWebで提供

🌐 **公式サイト**: [https://28tools.com](https://28tools.com)

---

## 📸 スクリーンショット

![Revit Ribbon Preview](images/revit-ribbon-preview.png)

---

## ✨ 主な機能

### 🔧 Revitアドイン（6機能）

| アイコン | 機能 | 説明 |
|---------|------|------|
| ![符号ON/OFF](images/icons/both_64.png) | **符号ON/OFF** | 通り芯・レベルの符号表示を一括切替 |
| ![シート一括作成](images/icons/sheet_creation_64.png) | **シート一括作成** | 図枠を指定して複数シートをまとめて作成 |
| ![3D視点コピペ](images/icons/view_copy_64.png) | **3D視点コピペ** | 3Dビューの視点を他のビューにコピー&ペースト |
| ![切断ボックスコピペ](images/icons/sectionbox_copy_64.png) | **切断ボックスコピペ** | 3Dビューの切断ボックス範囲をコピー&ペースト |
| ![ビューポート位置コピペ](images/icons/viewport_copy_64.png) | **ビューポート位置コピペ** | シート上のビューポート位置をコピー&ペースト |
| ![トリミング領域コピペ](images/icons/cropbox_copy_64.png) | **トリミング領域コピペ** | ビューのトリミング領域をコピー&ペースト |

**対応バージョン**: Revit 2021, 2022, 2023, 2024, 2025, 2026

### 🎨 ハッチングパターン作成ツール（Web）

- **斜線・網掛け**: 角度・間隔・破線設定に対応
- **ドット**: 間隔・ドットサイズをカスタマイズ
- **タイルパターン**: 芋目地・馬目地（目地サイズ設定可能）
- **RCコンクリート**: 線間隔・グループ間隔を調整可能
- **出力形式**: Revit（モデル/製図）・AutoCAD（.pat）対応

🌐 **ツールURL**: [https://28tools.com/hatch.html](https://28tools.com/hatch.html)

---

## 🌍 多言語対応

- 🇯🇵 **日本語** (Japanese)
- 🇺🇸 **英語** (English)
- 🇨🇳 **中国語** (中文)

サイト右上の言語切り替えボタンで簡単に切り替え可能。

---

## 🚀 使い方

### 1. Revitアドインのインストール

1. [28tools.com](https://28tools.com) にアクセス
2. 使用中のRevitバージョンを選択
3. ZIPファイルをダウンロード
4. ZIPを解凍し、`.addin` ファイルと `.dll` ファイルを以下のフォルダにコピー：
   ```
   C:\Users\[ユーザー名]\AppData\Roaming\Autodesk\Revit\Addins\[バージョン]\
   ```
5. Revitを再起動

### 2. ハッチングパターンの作成

1. [hatch.html](https://28tools.com/hatch.html) にアクセス
2. パターン種類を選択（斜線、網掛け、ドット、芋目地、馬目地、RC）
3. パラメータを設定（角度、間隔、サイズなど）
4. プレビューで確認
5. 「Revit用」または「AutoCAD用」ボタンでダウンロード

---

## 💻 技術仕様

| 項目 | 詳細 |
|------|------|
| **フロントエンド** | HTML5 + CSS3 + Vanilla JavaScript |
| **デザイン** | レスポンシブ対応（PC・タブレット・スマホ） |
| **ホスティング** | GitHub Pages + カスタムドメイン（28tools.com） |
| **アドイン配布** | GitHub Releases |
| **フォーム** | Formspree（お問い合わせ） |
| **アクセス解析** | Google Analytics 4 |
| **SEO** | sitemap.xml、Google Search Console登録済み |

---

## 📂 ファイル構成

```
/
├── index.html              # トップページ（ポータル）
├── addins.html             # アドインダウンロードページ
├── hatch.html              # ハッチングパターン作成ツール
├── contact.html            # お問い合わせ
├── about.html              # 運営者情報
├── privacy.html            # プライバシーポリシー
├── terms.html              # 利用規約
├── js/
│   ├── main.js             # 多言語対応・共通機能
│   └── hatch.js            # ハッチングツール専用ロジック
├── css/
│   ├── style.css           # メインスタイル
│   ├── hatch.css           # ハッチングページ専用
│   ├── manual.css          # マニュアルページ用
│   └── contact.css         # お問い合わせページ用
├── images/
│   ├── icons/              # 機能アイコン（64x64px PNG）
│   ├── portal/             # ポータルアイコン（40x40px PNG）
│   └── revit-ribbon-preview.png
├── manual/                 # マニュアルページ
│   ├── grid-bubble.html
│   ├── sheet-creation.html
│   ├── view-copy.html
│   ├── sectionbox-copy.html
│   ├── viewport-position.html
│   └── cropbox-copy.html
├── sitemap.xml             # SEO用サイトマップ
├── CNAME                   # カスタムドメイン設定
└── CLAUDE.md               # 開発ガイド
```

---

## 🤝 コントリビューション

バグ報告や機能リクエストは [Issues](https://github.com/28yu/28tools-download/issues) からお願いします。

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。

---

## 📞 お問い合わせ

- **Webフォーム**: [https://28tools.com/contact.html](https://28tools.com/contact.html)
- **GitHub Issues**: [https://github.com/28yu/28tools-download/issues](https://github.com/28yu/28tools-download/issues)

---

## 🎯 今後の予定

- [ ] **ファミリライブラリ** - Revitファミリの配布
- [ ] **ナレッジベース** - Tips・チュートリアル記事
- [ ] **API連携** - Revit APIサンプルコード集

---

**⭐ このプロジェクトが役に立ったら、ぜひStarをお願いします！**

[![GitHub Stars](https://img.shields.io/github/stars/28yu/28tools-download?style=social)](https://github.com/28yu/28tools-download/stargazers)
