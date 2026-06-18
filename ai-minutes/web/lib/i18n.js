/* ============================================================
   i18n.js — AI議事録ツールの動的文字列 (JS生成) の多言語辞書
   静的な UI テキストは index.html の data-lang-key + js/main.js が担当。
   ここは app.js / render.js / gemini.js / transcribe.js が
   実行時に生成する文言 (ステータス・エラー・出力ラベル等) を集約する。
   言語は js/main.js の window.currentLanguage に追従する。
   ============================================================ */

let _lang = 'ja';
const LANGS = ['ja', 'en', 'zh'];

export function setLang(l) { if (LANGS.includes(l)) _lang = l; }
export function getLang() { return _lang; }

/**
 * t('key', { name: 'x' }) — {name} を置換して返す。未定義キーはそのまま返す。
 */
export function t(key, vars) {
  const entry = DICT[key];
  let s = entry ? (entry[_lang] || entry.ja) : key;
  if (vars) {
    for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  }
  return s;
}

const DICT = {
  // ---------- dropzone ----------
  'dz-audio-default':    { ja: '音声ファイルを選択', en: 'Select an audio file', zh: '选择音频文件' },
  'dz-audio-selected':   { ja: '🎙️ {name}', en: '🎙️ {name}', zh: '🎙️ {name}' },
  'dz-material-default': { ja: '図面・資料の画像を選択', en: 'Select drawing/material images', zh: '选择图纸/资料图像' },
  'dz-material-selected':{ ja: '📐 {n} 枚の資料', en: '📐 {n} material(s)', zh: '📐 {n} 张资料' },

  // ---------- 録音 (recorder.js / app.js) ----------
  'rec-start':      { ja: '🎤 マイクで録音', en: '🎤 Record with mic', zh: '🎤 用麦克风录音' },
  'rec-stop':       { ja: '⏹ 停止', en: '⏹ Stop', zh: '⏹ 停止' },
  'rec-recording':  { ja: '🔴 録音中… {time}', en: '🔴 Recording… {time}', zh: '🔴 录音中… {time}' },
  'rec-converting': { ja: '録音を変換中...', en: 'Converting recording...', zh: '正在转换录音...' },
  'rec-done':       { ja: '録音を取り込みました（{time}）', en: 'Recording captured ({time})', zh: '已获取录音（{time}）' },
  'dz-audio-recorded':  { ja: '🎙️ 録音した音声（{time}）', en: '🎙️ Recorded audio ({time})', zh: '🎙️ 录制的音频（{time}）' },
  'rec-err-unsupported':{ ja: 'お使いのブラウザは録音に対応していません。', en: 'Your browser does not support recording.', zh: '您的浏览器不支持录音。' },
  'rec-err-denied': { ja: 'マイクの使用が許可されませんでした。ブラウザの設定で許可してください。', en: 'Microphone access was denied. Please allow it in your browser settings.', zh: '麦克风使用被拒绝。请在浏览器设置中允许。' },
  'rec-err-nomic':  { ja: 'マイクが見つかりませんでした。', en: 'No microphone was found.', zh: '未找到麦克风。' },
  'rec-err-generic':{ ja: '録音に失敗しました。', en: 'Recording failed.', zh: '录音失败。' },
  'mic-default':    { ja: '既定のマイク', en: 'Default microphone', zh: '默认麦克风' },
  'mic-label-n':    { ja: 'マイク {n}', en: 'Microphone {n}', zh: '麦克风 {n}' },
  'mic-test':       { ja: '🔊 マイクをテスト', en: '🔊 Test mic', zh: '🔊 测试麦克风' },
  'mic-test-stop':  { ja: '⏹ テスト停止', en: '⏹ Stop test', zh: '⏹ 停止测试' },
  'mic-test-hint':  { ja: '話しかけるとバーが動けばOKです', en: 'Speak — if the bar moves, it works', zh: '说话时指示条移动即正常' },

  // ---------- input summary ----------
  'sum-audio':      { ja: '音声', en: 'Audio', zh: '音频' },
  'sum-material':   { ja: '資料{n}', en: 'Materials{n}', zh: '资料{n}' },
  'sum-transcript': { ja: '文字起こし', en: 'Transcript', zh: '转写' },
  'sum-template':   { ja: '入力: {parts}（{mode}）', en: 'Input: {parts} ({mode})', zh: '输入：{parts}（{mode}）' },
  'mode-gemini':    { ja: 'Gemini', en: 'Gemini', zh: 'Gemini' },
  'mode-simple':    { ja: '簡易版', en: 'Simple', zh: '简易版' },

  // ---------- status ----------
  'st-start':        { ja: '処理を開始しています...', en: 'Starting...', zh: '正在开始处理...' },
  'st-gemini':       { ja: 'Gemini で解析中...', en: 'Analyzing with Gemini...', zh: '正在用 Gemini 分析...' },
  'st-transcribing': { ja: 'ブラウザ内で文字起こし中...', en: 'Transcribing in your browser...', zh: '正在浏览器内转写...' },
  'st-classifying':  { ja: '内容を分類中...', en: 'Classifying content...', zh: '正在分类内容...' },
  'st-done':         { ja: '✅ 議事録を作成しました。内容を確認してください。', en: '✅ Minutes created. Please review the content.', zh: '✅ 已生成会议记录。请确认内容。' },

  // ---------- alerts ----------
  'al-need-input': { ja: '音声・資料・文字起こしのいずれかを入力してください。', en: 'Please provide at least audio, materials, or a transcript.', zh: '请至少输入音频、资料或转写文本之一。' },
  'al-need-key':   { ja: '高精度版（Gemini）には API キーが必要です。\n簡易版を選ぶか、キーを入力してください。', en: 'High-accuracy mode (Gemini) requires an API key.\nChoose simple mode or enter a key.', zh: '高精度版（Gemini）需要 API 密钥。\n请选择简易版或输入密钥。' },
  'al-copy-fail':  { ja: 'コピーに失敗しました。', en: 'Failed to copy.', zh: '复制失败。' },

  // ---------- log ----------
  'log-simple-no-image': { ja: '※ 簡易版では資料画像は解析されません（高精度版をご利用ください）。', en: '* Simple mode does not analyze material images (use high-accuracy mode).', zh: '※ 简易版不分析资料图像（请使用高精度版）。' },

  // ---------- copy button ----------
  'btn-copy':   { ja: '📋 テキストでコピー', en: '📋 Copy as text', zh: '📋 复制为文本' },
  'btn-copied': { ja: '✅ コピーしました', en: '✅ Copied', zh: '✅ 已复制' },

  // ---------- gemini.js ----------
  'g-encoding-audio':    { ja: '音声をエンコード中...', en: 'Encoding audio...', zh: '正在编码音频...' },
  'g-uploading':         { ja: '{name} をアップロード中... (大きいファイルは時間がかかります)', en: 'Uploading {name}... (large files take time)', zh: '正在上传 {name}...（大文件需要时间）' },
  'g-processing':        { ja: 'アップロードしたファイルを処理中...', en: 'Processing the uploaded file...', zh: '正在处理已上传的文件...' },
  'g-err-upload':        { ja: 'ファイルのアップロードに失敗しました。時間をおいて再試行してください。', en: 'File upload failed. Please try again later.', zh: '文件上传失败。请稍后重试。' },
  'g-encoding-material': { ja: '資料 {i}/{n} をエンコード中...', en: 'Encoding material {i}/{n}...', zh: '正在编码资料 {i}/{n}...' },
  'g-sending':           { ja: 'Gemini に送信中... (音声が長いほど時間がかかります)', en: 'Sending to Gemini... (longer audio takes more time)', zh: '正在发送到 Gemini...（音频越长耗时越久）' },
  'g-err-no-key':   { ja: 'Gemini API キーが入力されていません。', en: 'No Gemini API key was entered.', zh: '未输入 Gemini API 密钥。' },
  'g-err-too-large':{ ja: '音声・資料の合計が大きすぎます ({mb}MB)。18MB 以下に圧縮するか、音声を分割してください。', en: 'Audio + materials are too large ({mb}MB). Compress to under 18MB or split the audio.', zh: '音频和资料合计过大（{mb}MB）。请压缩到 18MB 以下或拆分音频。' },
  'g-err-need-input':{ ja: '音声・資料・文字起こしのいずれかを入力してください。', en: 'Please provide audio, materials, or a transcript.', zh: '请输入音频、资料或转写文本之一。' },
  'g-err-network':  { ja: 'ネットワークエラー: Gemini に接続できませんでした。', en: 'Network error: could not connect to Gemini.', zh: '网络错误：无法连接到 Gemini。' },
  'g-err-invalid-key':{ ja: 'API キーが無効です。Google AI Studio のキーを確認してください。', en: 'Invalid API key. Check your key in Google AI Studio.', zh: 'API 密钥无效。请在 Google AI Studio 确认密钥。' },
  'g-err-rate':     { ja: '無料枠のレート制限に達しました。しばらく待って再実行してください。', en: 'Free-tier rate limit reached. Wait a while and try again.', zh: '已达免费额度速率限制。请稍后重试。' },
  'g-err-api':      { ja: 'Gemini API エラー ({status}): {detail}', en: 'Gemini API error ({status}): {detail}', zh: 'Gemini API 错误（{status}）：{detail}' },
  'g-err-no-response':{ ja: 'Gemini から有効な応答が得られませんでした (理由: {reason})。', en: 'No valid response from Gemini (reason: {reason}).', zh: '未从 Gemini 获得有效响应（原因：{reason}）。' },
  'g-err-json':     { ja: 'Gemini の応答を JSON として解釈できませんでした。', en: 'Could not parse Gemini\'s response as JSON.', zh: '无法将 Gemini 的响应解析为 JSON。' },

  // ---------- transcribe.js ----------
  'tr-prepare':     { ja: '文字起こしエンジンを準備中... (初回はモデル DL に時間がかかります)', en: 'Preparing the transcription engine... (first run downloads the model)', zh: '正在准备转写引擎...（首次运行需下载模型）' },
  'tr-model':       { ja: 'モデル取得中 {file} {pct}%', en: 'Downloading model {file} {pct}%', zh: '正在获取模型 {file} {pct}%' },
  'tr-decoding':    { ja: '音声をデコード中...', en: 'Decoding audio...', zh: '正在解码音频...' },
  'tr-transcribing':{ ja: '文字起こし中... (長い音声ほど時間がかかります)', en: 'Transcribing... (longer audio takes more time)', zh: '正在转写...（音频越长耗时越久）' },
  'tr-done':        { ja: '文字起こし完了 ({n} 文字)', en: 'Transcription complete ({n} chars)', zh: '转写完成（{n} 字）' },
  'tr-err-empty':   { ja: '文字起こし結果が空でした。', en: 'The transcription result was empty.', zh: '转写结果为空。' },
  'tr-topic':       { ja: '打合せ内容', en: 'Meeting content', zh: '会议内容' },
  'tr-no-summary':  { ja: '（自動要約なし）', en: '(no auto summary)', zh: '（无自动摘要）' },

  // ---------- render.js (議事録出力) ----------
  'mn-default-title': { ja: '打合せ議事録', en: 'Meeting Minutes', zh: '会议记录' },
  'mn-sec-decisions':   { ja: '決定事項', en: 'Decisions', zh: '决定事项' },
  'mn-sec-todos':       { ja: 'ToDo・宿題', en: 'To-Dos', zh: '待办事项' },
  'mn-sec-issues':      { ja: '課題・懸念', en: 'Issues & Concerns', zh: '问题与顾虑' },
  'mn-sec-discussions': { ja: '議論の流れ', en: 'Discussion', zh: '讨论过程' },
  'mn-count':       { ja: '（{n}件）', en: ' ({n})', zh: '（{n}）' },
  'mn-empty':       { ja: '（該当なし）', en: '(none)', zh: '（无）' },
  'mn-topic-default': { ja: '議題', en: 'Topic', zh: '议题' },
  'mn-footnote':    { ja: 'AI により自動生成された議事録です。内容は必ずご確認ください。 — 28 Tools', en: 'These minutes were auto-generated by AI. Please verify the content. — 28 Tools', zh: '本会议记录由 AI 自动生成。请务必确认内容。 — 28 Tools' },

  // ---------- minutesToText (コピー用ラベル) ----------
  'txt-date':     { ja: '日時', en: 'Date', zh: '日期' },
  'txt-location': { ja: '場所', en: 'Location', zh: '地点' },
  'txt-project':  { ja: '案件', en: 'Project', zh: '项目' },
  'txt-attendees':{ ja: '出席', en: 'Attendees', zh: '出席' },
  'txt-overview': { ja: '概要', en: 'Overview', zh: '概要' },
  'txt-assignee': { ja: '担当', en: 'Assignee', zh: '负责人' },
  'txt-due':      { ja: '期限', en: 'Due', zh: '期限' },
  'txt-footer':   { ja: '— AI により自動生成 (28 Tools)', en: '— Auto-generated by AI (28 Tools)', zh: '— 由 AI 自动生成（28 Tools）' },
};
