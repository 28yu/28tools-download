# 28 Tools 開発ガイドライン

## 開発フロー

サイトの更新を行う場合は、以下の手順で進めること：

1. **テストサイトで確認** - まずテストリポジトリ（28tools-download-test）に変更を反映し、動作確認を行う
   - テストサイトURL: https://28yu.github.io/28tools-download-test/
   - テストリポジトリ: https://github.com/28yu/28tools-download-test

2. **本番サイトに反映** - テストで問題がなければ、本番リポジトリ（28tools-download）に変更を適用する
   - 本番サイトURL: https://28tools.com/
   - 本番リポジトリ: https://github.com/28yu/28tools-download

## リポジトリ構成

- **28tools-download**: 本番サイト
- **28tools-download-test**: テストサイト（確認用）

## 注意事項

- 本番サイトへの直接変更は避け、必ずテストサイトで確認してから反映する
- 多言語対応（日本語/英語/中文）を維持する
- 既存のスタイル・デザインに合わせる
