/* ============================================================
   saver.js — 分割した音声セグメントを端末に保存する
   - File System Access API (showDirectoryPicker) が使えれば、録音開始時に
     一度だけ選んだフォルダ（デスクトップ等）へ各セグメントを自動書き込み
   - 選んだフォルダは IndexedDB に記憶し、次回以降は許可の再取得だけで
     フォルダ選択ダイアログを省略（クリック削減）
   - 非対応ブラウザ (Safari / Firefox 等) では <a download> でダウンロード保存に
     自動フォールバック（保存先はブラウザのダウンロード設定に従う）
   - 保存はブラウザ内で完結し、28tools のサーバには一切送信しない
   ============================================================ */

const IDB_NAME = 'ai-minutes';
const IDB_STORE = 'handles';
const IDB_KEY = 'save-dir';

function idbOpen() {
  return new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open(IDB_NAME, 1); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => { try { req.result.createObjectStore(IDB_STORE); } catch (e) {} };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  try {
    const db = await idbOpen();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const r = tx.objectStore(IDB_STORE).get(key);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
}

async function idbSet(key, val) {
  try {
    const db = await idbOpen();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) { return false; }
}

export class SegmentSaver {
  constructor() {
    this.dir = null;        // 現在有効な FileSystemDirectoryHandle
    this._remembered = null; // IndexedDB から復元した（未許可の）ハンドル
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

  /** 選択中フォルダ名（未選択なら null）。 */
  get folderName() {
    return this.dir ? this.dir.name : null;
  }

  /** 記憶済みフォルダのハンドルを IndexedDB から復元（許可はまだ取らない）。 */
  async loadRemembered() {
    if (!this.supported) return null;
    this._remembered = await idbGet(IDB_KEY);
    return this._remembered;
  }

  /** 記憶済みフォルダ名（許可未取得でも参照可）。 */
  get rememberedName() {
    return this._remembered ? this._remembered.name : null;
  }

  /**
   * 記憶済みフォルダに書き込み許可があれば dir に採用する（ダイアログを出さない）。
   * requestPermission はユーザー操作（クリック直後）が必要。
   * @returns {Promise<boolean>} 採用できたら true
   */
  async useRememberedWithPermission() {
    if (!this.supported) return false;
    const h = this._remembered || await this.loadRemembered();
    if (!h || !h.queryPermission) return false;
    const opts = { mode: 'readwrite' };
    try {
      let p = await h.queryPermission(opts);
      if (p !== 'granted') p = await h.requestPermission(opts);
      if (p === 'granted') { this.dir = h; return true; }
    } catch (e) { /* noop */ }
    return false;
  }

  /**
   * 保存先フォルダを選ぶ（ユーザー操作＝クリック直後に呼ぶこと）。記憶もする。
   * @returns {Promise<boolean>} フォルダを選べたら true。非対応は false。
   * @throws ユーザーがダイアログを閉じた場合は AbortError
   */
  async chooseFolder() {
    if (!this.supported) return false;
    this.dir = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'desktop' });
    this._remembered = this.dir;
    await idbSet(IDB_KEY, this.dir);
    return true;
  }

  /** フォルダ選択を解除しダウンロード保存に戻す（記憶は消さない）。 */
  reset() {
    this.dir = null;
  }

  /**
   * セグメントファイルを保存する。
   * @param {File} file
   * @returns {Promise<'folder'|'download'>} 実際に使った保存方式
   */
  save(file) {
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
