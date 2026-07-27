/* ============================================================
   saver.js — 分割した音声セグメントを端末に保存する
   - File System Access API (showDirectoryPicker) が使えれば、録音開始時に
     一度だけ選んだフォルダ（デスクトップ等）へ各セグメントを自動書き込み
   - 非対応ブラウザ (Safari / Firefox 等) では <a download> でダウンロード保存に
     自動フォールバック（保存先はブラウザのダウンロード設定に従う）
   - 保存はブラウザ内で完結し、28tools のサーバには一切送信しない
   ============================================================ */

export class SegmentSaver {
  constructor() {
    this.dir = null;       // FileSystemDirectoryHandle（フォルダ選択時のみ）
    this._chain = Promise.resolve(); // 書き込みを直列化（同一フォルダへの競合回避）
  }

  /** ブラウザがフォルダ直書き込みに対応しているか。 */
  get supported() {
    return typeof window.showDirectoryPicker === 'function';
  }

  /** 現在の保存方式 ('folder' | 'download')。 */
  get mode() {
    return this.dir ? 'folder' : 'download';
  }

  /**
   * 保存先フォルダを選ぶ（ユーザー操作＝クリック直後に呼ぶこと）。
   * @returns {Promise<boolean>} フォルダを選べたら true。非対応/キャンセルは false。
   * @throws ユーザーがダイアログを閉じた場合は AbortError を投げる（呼び出し側で判別）
   */
  async chooseFolder() {
    if (!this.supported) return false;
    this.dir = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'desktop' });
    return true;
  }

  /** フォルダ選択を解除しダウンロード保存に戻す。 */
  reset() {
    this.dir = null;
  }

  /**
   * セグメントファイルを保存する。
   * @param {File} file
   * @returns {Promise<'folder'|'download'>} 実際に使った保存方式
   */
  save(file) {
    // 書き込みを直列化（フォルダハンドルへの並行 createWritable を避ける）
    this._chain = this._chain.then(() => this._doSave(file), () => this._doSave(file));
    return this._chain;
  }

  async _doSave(file) {
    if (this.dir) {
      try {
        const handle = await this.dir.getFileHandle(file.name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(file);
        await writable.close();
        return 'folder';
      } catch (e) {
        // フォルダ書き込みが失敗したらダウンロードで確実に残す
        this._download(file);
        return 'download';
      }
    }
    this._download(file);
    return 'download';
  }

  _download(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
}
