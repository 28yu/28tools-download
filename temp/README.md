# temp/ — 一時保存フォルダ

Claude とのやりとりで使うファイル（実機のスクショ・ログ・Excel など）を一時的に置く場所。

- **サイト（28tools.com）には配信されない**（`_config.yml` の exclude で除外済み）
- ⚠️ ただしリポジトリは **public** なので、GitHub 上では誰でも見られる。
  顧客のモデル・図面・個人情報・パスワードなどは置かないこと
- 用が済んだファイルは削除してよい（このフォルダ自体と README は残す）

## 置き方（GitHub の画面から）
1. https://github.com/28yu/28tools-download/tree/main/temp を開く
2. 右上の「Add file」→「Upload files」
3. ファイルをドラッグして、下の「Commit changes」を押す

- 1ファイル 25MB まで（画面からのアップロードの上限）
- 置いたら Claude に「temp に○○を置いた」と伝える（Claude は `git pull` で取得する）
- ⚠️ 画面からの PNG アップロードはまれに壊れることがある（CLAUDE.md「PNG アップロードによる破損問題」）。
  Claude 側で開けなかったら置き直すか、ZIP にまとめて置く
