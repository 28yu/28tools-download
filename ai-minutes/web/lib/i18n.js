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
  'mic-test-hint':  { ja: '話しかけてメーターが動けばOKです', en: 'Speak — if the meter moves, it works', zh: '说话时电平表跳动即正常' },

  // ---------- 録音ボタン（メイン） ----------
  'rec-hero-start':   { ja: '録音を開始', en: 'Start recording', zh: '开始录音' },
  'rec-hero-stop':    { ja: '停止して議事録を作成', en: 'Stop & create minutes', zh: '停止并生成会议记录' },

  // ---------- 長時間モード (app.js) ----------
  'lr-file-prefix':   { ja: '議事録', en: 'minutes', zh: '会议记录' },
  'lr-need-key-inline': { ja: '高精度版には API キーが必要です。下の「詳細」にキーを入力してください。', en: 'High-accuracy mode needs an API key. Enter it in "Advanced" below.', zh: '高精度版需要 API 密钥。请在下方“详细”中输入。' },
  'lr-folder-none':   { ja: '未選択（録音開始時に選びます）', en: 'Not set (chosen when recording starts)', zh: '未选择（录音开始时选择）' },
  'lr-folder-current':{ ja: '📁 {name}', en: '📁 {name}', zh: '📁 {name}' },
  'lr-folder-unsupported': { ja: 'このブラウザはフォルダ保存に非対応（ダウンロード保存になります）', en: 'This browser cannot save to a folder (files will download instead)', zh: '此浏览器不支持文件夹保存（将改为下载）' },
  'lr-how-folder':    { ja: '選択フォルダ', en: 'chosen folder', zh: '所选文件夹' },
  'lr-how-download':  { ja: 'ダウンロード', en: 'downloads', zh: '下载' },
  'lr-need-gemini':   { ja: '長時間モードは高精度版（Gemini）専用です。処理方法で「高精度版（Gemini）」を選び、API キーを入力してください。', en: 'Long-recording mode requires the high-accuracy (Gemini) mode. Select it and enter your API key.', zh: '长时录音模式仅支持高精度版（Gemini）。请选择该模式并输入 API 密钥。' },
  'lr-folder-cancel': { ja: '保存先フォルダが選択されませんでした。もう一度お試しください。', en: 'No save folder was selected. Please try again.', zh: '未选择保存文件夹。请重试。' },
  'lr-recording-start': { ja: '🔴 長時間録音を開始しました（{min}分ごとに{where}へ保存し自動作成）。', en: '🔴 Long recording started (saving to {where} every {min} min, auto-generating).', zh: '🔴 已开始长时录音（每 {min} 分钟保存到{where}并自动生成）。' },
  'lr-log-start':     { ja: '長時間モード開始: {min}分ごとに分割し、{where}へ保存して自動的に議事録化します。', en: 'Long mode started: split every {min} min, save to {where}, and auto-generate minutes.', zh: '长时模式开始：每 {min} 分钟分割，保存到{where}并自动生成会议记录。' },
  'lr-recording':     { ja: '🔴 録音中… {time}（第{part}区間を録音中）', en: '🔴 Recording… {time} (segment {part})', zh: '🔴 录音中… {time}（正在录制第 {part} 段）' },
  'lr-finishing':     { ja: '録音を終了し、残りの処理を完了しています…', en: 'Stopping and finishing the remaining processing…', zh: '正在停止并完成剩余处理…' },
  'lr-saved':         { ja: '💾 {name} を{how}に保存しました。', en: '💾 Saved {name} to {how}.', zh: '💾 已将 {name} 保存到{how}。' },
  'lr-save-fail':     { ja: '⚠️ {name} の保存に失敗しました。', en: '⚠️ Failed to save {name}.', zh: '⚠️ 保存 {name} 失败。' },
  'lr-seg-fail':      { ja: '⚠️ 第{n}区間の議事録化に失敗（音声は保存済み）: {msg}', en: '⚠️ Failed to generate minutes for segment {n} (audio was saved): {msg}', zh: '⚠️ 第 {n} 段生成会议记录失败（音频已保存）：{msg}' },
  'lr-seg-rec-fail':  { ja: '録音の変換に失敗しました', en: 'Failed to convert the recording', zh: '录音转换失败' },
  'lr-all-done':      { ja: '✅ 長時間録音の議事録を作成しました（{n}区間）。内容を確認してください。', en: '✅ Minutes created from the long recording ({n} segments). Please review.', zh: '✅ 已根据长时录音生成会议记录（{n} 段）。请确认内容。' },
  'lr-done-with-err': { ja: '⚠️ 議事録を作成しました（成功{done}区間 / 失敗{err}区間）。失敗分は保存済み音声から個別に再作成できます。', en: '⚠️ Minutes created ({done} ok / {err} failed). You can re-run failed segments from the saved audio.', zh: '⚠️ 已生成会议记录（成功 {done} 段 / 失败 {err} 段）。失败部分可用已保存的音频单独重做。' },
  'lr-none-done':     { ja: '⚠️ 有効な議事録が作成できませんでした。保存された音声から個別に作成をお試しください。', en: '⚠️ No minutes could be generated. Try generating from the saved audio individually.', zh: '⚠️ 未能生成有效的会议记录。请尝试用已保存的音频单独生成。' },
  'lr-waiting':       { ja: '最初の区間が区切られると、ここに一覧が表示されます。', en: 'Segments will appear here once the first interval completes.', zh: '第一段完成后，这里会显示片段列表。' },
  'lr-seg-name':      { ja: '第{n}区間（{label}）', en: 'Segment {n} ({label})', zh: '第 {n} 段（{label}）' },
  'lr-status-saving':     { ja: '保存中…', en: 'Saving…', zh: '保存中…' },
  'lr-status-processing': { ja: '議事録化中…', en: 'Generating…', zh: '生成中…' },
  'lr-status-done':       { ja: '完了', en: 'Done', zh: '完成' },
  'lr-status-error':      { ja: '失敗', en: 'Failed', zh: '失败' },

  // ---------- 文字起こしファイル読み込み ----------
  'tf-reading': { ja: '📄 {name} を読み込み中...', en: '📄 Reading {name}...', zh: '📄 正在读取 {name}...' },
  'tf-loaded':  { ja: '✅ {name} を読み込みました（{n}文字）', en: '✅ Loaded {name} ({n} chars)', zh: '✅ 已读取 {name}（{n} 字）' },
  'tf-empty':   { ja: 'テキストを抽出できませんでした。', en: 'No text could be extracted.', zh: '未能提取文本。' },
  'tf-error':   { ja: '{name} の読み込みに失敗しました（対応: .txt / .vtt / .srt / .docx）。', en: 'Failed to read {name} (supported: .txt / .vtt / .srt / .docx).', zh: '读取 {name} 失败（支持：.txt / .vtt / .srt / .docx）。' },

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

  // ---------- 議事録の翻訳 (言語切替時) ----------
  'tl-translating': { ja: '議事録を{lang}に翻訳中...', en: 'Translating minutes to {lang}...', zh: '正在将会议记录翻译为{lang}...' },
  'tl-done':        { ja: '✅ {lang}に翻訳しました', en: '✅ Translated to {lang}', zh: '✅ 已翻译为{lang}' },
  'tl-needkey':     { ja: '※ 内容の翻訳には高精度版(Gemini)のAPIキーが必要です。見出しのみ翻訳しました。', en: '* Translating the content requires a Gemini API key. Only the labels were translated.', zh: '※ 翻译内容需要 Gemini API 密钥。仅翻译了标题。' },
  'tl-lang-ja':     { ja: '日本語', en: 'Japanese', zh: '日语' },
  'tl-lang-en':     { ja: '英語', en: 'English', zh: '英语' },
  'tl-lang-zh':     { ja: '中国語', en: 'Chinese', zh: '中文' },

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
  'g-err-overloaded':{ ja: 'Gemini が混雑しています（高負荷）。自動で数回再試行しましたが失敗しました。少し待って再実行してください。', en: 'Gemini is busy (high demand). Auto-retried a few times but failed. Please wait a bit and try again.', zh: 'Gemini 繁忙（高负载）。已自动重试数次仍失败。请稍后重试。' },
  'g-err-api':      { ja: 'Gemini API エラー ({status}): {detail}', en: 'Gemini API error ({status}): {detail}', zh: 'Gemini API 错误（{status}）：{detail}' },
  'g-err-no-response':{ ja: 'Gemini から有効な応答が得られませんでした (理由: {reason})。', en: 'No valid response from Gemini (reason: {reason}).', zh: '未从 Gemini 获得有效响应（原因：{reason}）。' },
  'g-err-json':     { ja: 'Gemini の応答を JSON として解釈できませんでした。', en: 'Could not parse Gemini\'s response as JSON.', zh: '无法将 Gemini 的响应解析为 JSON。' },
  'g-err-maxtokens':{ ja: '会議が長く、AI の出力が上限に達しました。音声を分割（10〜15分程度）して再度お試しください。', en: 'The meeting is long and the AI output hit its limit. Please split the audio (about 10-15 min) and try again.', zh: '会议较长，AI 输出已达上限。请将音频分割（约10-15分钟）后重试。' },

  // ---------- transcribe.js ----------
  'tr-prepare':     { ja: '文字起こしエンジンを準備中... (初回はモデル DL に時間がかかります)', en: 'Preparing the transcription engine... (first run downloads the model)', zh: '正在准备转写引擎...（首次运行需下载模型）' },
  'tr-model':       { ja: 'モデル取得中 {file} {pct}%', en: 'Downloading model {file} {pct}%', zh: '正在获取模型 {file} {pct}%' },
  'tr-decoding':    { ja: '音声をデコード中...', en: 'Decoding audio...', zh: '正在解码音频...' },
  'tr-transcribing':{ ja: '文字起こし中... (長い音声ほど時間がかかります)', en: 'Transcribing... (longer audio takes more time)', zh: '正在转写...（音频越长耗时越久）' },
  'tr-done':        { ja: '文字起こし完了 ({n} 文字)', en: 'Transcription complete ({n} chars)', zh: '转写完成（{n} 字）' },
  'tr-err-empty':   { ja: '文字起こし結果が空でした。', en: 'The transcription result was empty.', zh: '转写结果为空。' },
  'tr-err-network': { ja: '文字起こしモデルの読み込みに失敗しました（ネットワークエラー）。通信環境を確認して再試行するか、高精度版(Gemini)をお試しください。', en: 'Failed to load the transcription model (network error). Check your connection and retry, or try the high-accuracy (Gemini) mode.', zh: '加载转写模型失败（网络错误）。请检查网络后重试，或尝试高精度版(Gemini)。' },
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
  'txt-speaker':  { ja: '発言', en: 'Speaker', zh: '发言' },
  'txt-ref':      { ja: '資料', en: 'Ref', zh: '资料' },
  'txt-footer':   { ja: '— AI により自動生成 (28 Tools)', en: '— Auto-generated by AI (28 Tools)', zh: '— 由 AI 自动生成（28 Tools）' },

  // ---------- ヒーロー・設定リスト (2026-08 のレイアウト刷新分) ----------
  'rec-hero-hint':      { ja: '打合せを録音するだけ。停止すると自動で議事録ができます。', en: 'Just record your meeting. Minutes are created automatically when you stop.', zh: '只需录制会议。停止后自动生成会议记录。' },
  'rec-hero-stop-hint': { ja: 'もう一度押すと停止し、議事録の作成が始まります。', en: 'Press again to stop and start creating the minutes.', zh: '再次按下即可停止并开始生成会议记录。' },
  'rec-recording-plain': { ja: '🔴 録音中', en: '🔴 Recording', zh: '🔴 录音中' },
  'lr-recording-part':  { ja: '🔴 録音中 — 第{part}区間', en: '🔴 Recording — segment {part}', zh: '🔴 录音中 — 第 {part} 段' },
  'mode-gemini-full':   { ja: '高精度版（Gemini）', en: 'High accuracy (Gemini)', zh: '高精度版（Gemini）' },
  'mode-simple-full':   { ja: '簡易版（ブラウザ完結）', en: 'Simple (in-browser)', zh: '简易版（浏览器内完成）' },
  'key-set':            { ja: '設定済み', en: 'Set', zh: '已设置' },
  'key-unset':          { ja: '未設定', en: 'Not set', zh: '未设置' },
  'lr-interval-value':  { ja: '{min}分ごとに分割', en: 'Split every {min} min', zh: '每 {min} 分钟分割' },
  'lr-folder-download': { ja: 'ダウンロード保存', en: 'Save as download', zh: '下载保存' },
  'log-show':           { ja: 'ログを表示', en: 'Show log', zh: '显示日志' },
  'log-hide':           { ja: 'ログを隠す', en: 'Hide log', zh: '隐藏日志' },
  'notice-more':        { ja: '詳しく', en: 'Details', zh: '详细' },
  'notice-close':       { ja: '閉じる', en: 'Close', zh: '关闭' },

  // ---------- render.js (タイムライン / 担当者別) ----------
  'mn-tl-flow':       { ja: '議論の流れ（時系列）', en: 'Discussion flow (chronological)', zh: '讨论过程（时间顺序）' },
  'mn-tl-conclusion': { ja: 'この打合せの結論', en: 'Conclusions of this meeting', zh: '本次会议的结论' },
  'mn-mx-title':      { ja: '担当者別 ToDo', en: 'To-Dos by assignee', zh: '按负责人分类的待办' },
  'mn-mx-unassigned': { ja: '未割当', en: 'Unassigned', zh: '未分配' },

  // ---------- ビジュアル資料 (画像生成 / gemini.js・app.js) ----------
  'vis-log-sending':  { ja: '画像モデル（{model}）に送信中...', en: 'Sending to image model ({model})...', zh: '正在发送到图像模型（{model}）...' },
  'vis-generating':   { ja: '🍌 ビジュアル資料を生成中...（30秒ほどかかります）', en: '🍌 Generating visual summary... (takes ~30s)', zh: '🍌 正在生成视觉资料...（约需30秒）' },
  'vis-done':         { ja: '✅ ビジュアル資料を生成しました', en: '✅ Visual summary generated', zh: '✅ 已生成视觉资料' },
  'vis-btn':          { ja: '🍌 ビジュアル資料', en: '🍌 Visual summary', zh: '🍌 视觉资料' },
  'vis-btn-run':      { ja: '画像を生成', en: 'Generate image', zh: '生成图像' },
  'vis-btn-running':  { ja: '生成中...', en: 'Generating...', zh: '生成中...' },
  'vis-btn-download': { ja: '⬇️ 画像を保存', en: '⬇️ Save image', zh: '⬇️ 保存图像' },
  'vis-alt':          { ja: '議事録のビジュアル資料（AI 生成画像）', en: 'Visual summary of the minutes (AI-generated image)', zh: '会议记录的视觉资料（AI 生成图像）' },
  'vis-caption':      { ja: '⚠️ AI が描いた画像です。画像内の文字は誤ることがあります（正式な記録は議事録本体をご利用ください）。', en: '⚠️ AI-drawn image. Text inside the image may contain errors — use the minutes themselves as the official record.', zh: '⚠️ 由 AI 绘制的图像。图中文字可能有误，正式记录请以会议记录正文为准。' },
  'vis-err-no-image': { ja: '画像が返りませんでした（{reason}）。もう一度お試しください。', en: 'No image was returned ({reason}). Please try again.', zh: '未返回图像（{reason}）。请重试。' },
  'vis-err-rate':     { ja: '画像生成の枠に達しました（画像モデルは議事録本体とは別枠です）。1日単位の枠はリセットが太平洋時間の0時＝日本時間の16〜17時ごろです。', en: 'Hit the image-generation limit (image models have a separate quota from the minutes). Daily quotas reset at midnight Pacific time.', zh: '已达到图像生成额度上限（图像模型与会议记录使用不同额度）。每日额度在太平洋时间 0 点重置。' },
  'vis-err-quota-zero': { ja: 'このキーでは画像モデルの無料枠が 0 のため生成できません（使い切ったのではなく、最初から割り当てが無い状態です）。Google AI Studio / Google Cloud でプロジェクトにお支払い情報を登録し、キーを作り直すと使えるようになります。', en: 'This key has a quota of 0 for the image model — it is not "used up", there is simply no free allocation. Enable billing for the project in Google AI Studio / Google Cloud and create a new key.', zh: '此密钥对图像模型的额度为 0（并非用尽，而是本就没有免费配额）。请在 Google AI Studio / Google Cloud 中为项目启用结算并重新创建密钥。' },
  'vis-err-retry-in': { ja: '（約{sec}秒後に再試行できます）', en: ' (you can retry in about {sec}s)', zh: '（约 {sec} 秒后可重试）' },
  'vis-err-quota-id':  { ja: '［枠: {id}］', en: ' [quota: {id}]', zh: '［额度: {id}］' },
  'vis-err-detail':    { ja: '［詳細: {detail}］', en: ' [detail: {detail}]', zh: '［详情: {detail}］' },
  'vis-log-retry-simple': { ja: 'このモデルは画像設定（サイズ・比率）に未対応のため、既定設定で再試行します。', en: 'This model does not accept the image config (size/aspect); retrying with defaults.', zh: '该模型不支持图像设置（尺寸/比例），将使用默认设置重试。' },
  'vis-err-billing':  { ja: '高品質版（Nano Banana Pro）はお使いの API キーで利用できません。Google AI Studio でお支払い情報を登録するか、標準版に切り替えてください。', en: 'The Pro model (Nano Banana Pro) is not available for your API key. Enable billing in Google AI Studio, or switch to the standard model.', zh: '您的 API 密钥无法使用高品质版（Nano Banana Pro）。请在 Google AI Studio 中启用结算，或切换为标准版。' },
  'vis-err-model':    { ja: 'このモデル（{model}）はお使いの API キーでは利用できませんでした。標準版に切り替えてお試しください。', en: 'This model ({model}) is not available for your API key. Try the standard model instead.', zh: '您的 API 密钥无法使用该模型（{model}）。请改用标准版。' },
};
