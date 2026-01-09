// 28 Tools 配布サイト - メインJavaScript（v6.1 - モーダル修正版）

// 言語情報
const languageInfo = {
    ja: { name: '🇯🇵 日本語', flag: '🇯🇵' },
    en: { name: '🇺🇸 English', flag: '🇺🇸' },
    zh: { name: '🇨🇳 中文', flag: '🇨🇳' }
};

// 翻訳データ（メインページ + マニュアルページ完全版）
const translations = {
    ja: {
        // ========== 共通要素 ==========
        'mainTitle': '28 Tools',
        'subtitle': 'Revit アドイン配布センター',
        'site-title': '28 Tools',
        'site-subtitle': 'Revit アドイン配布センター',
        'footer-text': '© 2024 28 Tools. All rights reserved.',
        
        // ========== メインページ専用 ==========
        'features-title': '機能一覧',
        'features-subtitle': 'Revit作業を効率化する6つの機能',
        'download-title': 'ダウンロード',
        'download-subtitle': 'Revitバージョンを選択してダウンロード',
        'grid-bubble-title': '符号ON/OFF',
        'grid-bubble-desc': '通り芯・レベルの符号表示切り替え',
        'sheet-creation-title': 'シート一括作成',
        'sheet-creation-desc': '図枠を指定して複数シート作成',
        'view-copy-title': '3D視点コピペ',
        'view-copy-desc': '3Dビューの視点をコピー&ペースト',
        'sectionbox-copy-title': '切断ボックスコピペ',
        'sectionbox-copy-desc': '3Dビューの切断範囲をコピー&ペースト',
        'viewport-position-title': 'ビューポート位置コピペ',
        'viewport-position-desc': 'シート上のビューポート位置をコピー&ペースト',
        'cropbox-copy-title': 'トリミング領域コピペ',
        'cropbox-copy-desc': 'ビューのトリミング領域をコピー&ペースト',
        'status-completed': '完成済み',
        'status-development': '開発中',
        'status-planned': '開発予定',
        'install-guide': '📖 インストールガイド',
        'uninstall-guide': '🗑️ アンインストール',
        'support-info': '❓ サポート情報',
        
        // ========== マニュアルページ共通 ==========
        'breadcrumb-home': 'ホーム',
        'section-overview': '機能概要',
        'section-features': '主な機能',
        'section-usage': '使い方',
        'section-usecases': '活用シーン',
        'section-tips': 'Tips',
        'section-notes': '注意事項',
        'image-placeholder-text': '📷 スクリーンショット画像をここに追加予定',
        'back-to-home': '← ホームに戻る',
        
        // ========== 符号ON/OFF ==========
        'grid-bubble-subtitle': '通り芯・レベルの符号表示をワンクリックで一括ON/OFF切り替え',
        'grid-bubble-overview': 'この機能は、現在アクティブなビュー（平面図、断面図、立面図）の通り芯（グリッド）とレベルの符号を、ワンクリックで一括ON/OFF切り替えできます。大量の通り芯やレベルがあるプロジェクトで、図面の見やすさを瞬時に調整できる便利なツールです。',
        'grid-bubble-feature1': 'ワンクリックでその符号の通り芯やレベルの符号を一括切り替え',
        'grid-bubble-feature2': '現在のアクティブビューに適用（平面図、断面図、立面図など）',
        'grid-bubble-feature3': '平面図、断面図、立面図すべてで利用可能',
        'grid-bubble-feature4': '元に戻す（Undo）機能で簡単に取り消し可能',
        'grid-bubble-step1-title': 'ビューを開く',
        'grid-bubble-step1-desc': '符号表示を切り替えたいビュー（平面図、断面図、立面図）を開きます。',
        'grid-bubble-step2-title': '28 Tools を起動',
        'grid-bubble-step2-desc': 'Revitリボンの「28 Tools」タブから、符号ON/OFFの機能ボタンをクリックします。3つのボタンから選択できます：',
        'grid-bubble-left': '左端のみON：',
        'grid-bubble-left-desc': '通り芯・レベルの左端符号のみ表示',
        'grid-bubble-both': '両端ON：',
        'grid-bubble-both-desc': '通り芯・レベルの両端符号を表示',
        'grid-bubble-right': '右端のみON：',
        'grid-bubble-right-desc': '通り芯・レベルの右端符号のみ表示',
        'grid-bubble-step3-title': '符号をクリック',
        'grid-bubble-step3-desc': '「符号ON/OFF」のボタンをクリックすると、現在のビュー内のすべての通り芯とレベルの符号表示が切り替わります。設定がその目に反映されます。',
        'grid-bubble-step4-title': '結果を確認',
        'grid-bubble-step4-desc': '符号表示が切り替わったことを確認します。元に戻したい場合は、Revitの「元に戻す」（Undo）機能を使用してください。',
        'grid-bubble-usecase1-title': 'プレゼンテーション用図面',
        'grid-bubble-usecase1-desc': 'クライアントへの説明時に、必要な符号だけを表示してわかりやすく提示できます。',
        'grid-bubble-usecase2-title': '印刷用図面の調整',
        'grid-bubble-usecase2-desc': '印刷時に符号が密集して見づらい場合、片側だけ表示することで見やすくできます。',
        'grid-bubble-usecase3-title': '作業効率化',
        'grid-bubble-usecase3-desc': '大量の通り芯・レベルを1つずつ手動で切り替える手間を大幅に削減できます。',
        'grid-bubble-tip1': '<strong>ビュー単位で適用：</strong>この機能は現在アクティブなビューにのみ適用されます。他のビューには影響しません。',
        'grid-bubble-tip2': '<strong>元に戻す：</strong>設定を間違えた場合は、Revitの「元に戻す」（Ctrl+Z）で簡単に元に戻せます。',
        'grid-bubble-tip3': '<strong>ビューテンプレート：</strong>よく使う設定をビューテンプレートとして保存しておくと、さらに効率的です。',
        'grid-bubble-note1': 'この機能は現在アクティブなビューにのみ適用されます。他のビューの符号表示は変更されません。',
        'grid-bubble-note2': '3Dビューでは通り芯・レベルの符号表示設定が異なるため、この機能は使用できません。',
        'grid-bubble-note3': 'ワークシェアリング環境では、他のユーザーのビューには影響しません（各ビューの設定は個別）。',
        
        // ========== シート一括作成 ==========
        'manual-sheet-creation-title': 'シート一括作成',
        'manual-sheet-creation-subtitle': '複数のシートを指定した図枠で一括作成',
        'manual-sheet-creation-overview': 'この機能は、指定した図枠（タイトルブロック）を使用して、複数のシートを一度に作成できます。シート番号とシート名を入力するだけで、効率的にプロジェクトのシート構成を整えることができます。',
        'manual-sheet-creation-step1-title': '機能を起動',
        'manual-sheet-creation-step1-desc': 'Revitリボンの「28 Tools」タブから「シート一括作成」ボタンをクリックします。',
        'manual-sheet-creation-step2-title': '図枠を選択',
        'manual-sheet-creation-step2-desc': 'ダイアログが表示されたら、使用する図枠（タイトルブロック）をドロップダウンリストから選択します。',
        'manual-sheet-creation-step3-title': 'シート情報を入力',
        'manual-sheet-creation-step3-desc': '作成したいシートの番号とシート名を入力します。複数のシートを一度に指定できます。',
        'manual-sheet-creation-step4-title': '実行',
        'manual-sheet-creation-step4-desc': '「作成」ボタンをクリックすると、指定した図枠で複数のシートが一括作成されます。',
        'manual-sheet-creation-usecase1-title': 'プロジェクト初期設定',
        'manual-sheet-creation-usecase1-desc': 'プロジェクト開始時に、必要なシート構成を一度に作成できます。',
        'manual-sheet-creation-usecase2-title': '標準シート構成の展開',
        'manual-sheet-creation-usecase2-desc': '会社の標準シート構成を素早くプロジェクトに展開できます。',
        'manual-sheet-creation-usecase3-title': '作業効率化',
        'manual-sheet-creation-usecase3-desc': 'シートを1枚ずつ作成する手間を大幅に削減できます。',
        'manual-sheet-creation-tip1': '<strong>図枠の準備：</strong>事前に使用する図枠をプロジェクトにロードしておいてください。',
        'manual-sheet-creation-tip2': '<strong>シート番号の命名規則：</strong>会社の標準に従ったシート番号体系を使用することをお勧めします。',
        'manual-sheet-creation-tip3': '<strong>既存シート確認：</strong>同じシート番号が既に存在する場合はエラーになります。',
        'manual-sheet-creation-note1': '図枠（タイトルブロック）が事前にプロジェクトにロードされている必要があります。',
        'manual-sheet-creation-note2': '重複するシート番号は作成できません。既存のシート番号と重複しないように注意してください。',
        'manual-sheet-creation-note3': 'シート作成後は、必要に応じてシートの詳細情報（承認者、作図者など）を個別に設定してください。',
        
        // ========== 3D視点コピペ ==========
        'manual-view-copy-title': '3D視点コピペ',
        'manual-view-copy-subtitle': '3Dビューの視点を他のビューにコピー＆ペースト',
        'manual-view-copy-overview': 'この機能は、ある3Dビューのカメラ視点（カメラ位置・向き・ズーム）を別の3Dビューにコピーできます。複数の3Dビューで同じ視点を使いたい場合に、手動で調整する手間を省くことができます。',
        'manual-view-copy-step1-title': 'コピー元の3Dビューを開く',
        'manual-view-copy-step1-desc': '視点をコピーしたい3Dビューを開き、希望の視点に調整します。',
        'manual-view-copy-step2-title': '視点をコピー',
        'manual-view-copy-step2-desc': 'Revitリボンの「28 Tools」タブから「視点コピー」ボタンをクリックします。現在の3Dビューの視点情報がメモリにコピーされます。',
        'manual-view-copy-step3-title': 'ペースト先の3Dビューを開く',
        'manual-view-copy-step3-desc': '視点を適用したい別の3Dビューを開きます。',
        'manual-view-copy-step4-title': '視点をペースト',
        'manual-view-copy-step4-desc': '「28 Tools」タブから「視点ペースト」ボタンをクリックします。コピーした視点が現在の3Dビューに適用されます。',
        'manual-view-copy-usecase1-title': '一貫した視点の設定',
        'manual-view-copy-usecase1-desc': '複数の3Dビューで同じ視点を使用することで、図面の一貫性を保てます。',
        'manual-view-copy-usecase2-title': '段階ビューの作成',
        'manual-view-copy-usecase2-desc': '同じ視点で要素表示を変えた複数のビューを効率的に作成できます。',
        'manual-view-copy-usecase3-title': '時間短縮',
        'manual-view-copy-usecase3-desc': '3Dビューの視点調整を何度も繰り返す必要がなくなります。',
        'manual-view-copy-tip1': '<strong>透視図とアイソメトリック：</strong>透視図とアイソメトリックビューでも視点のコピーが可能です。',
        'manual-view-copy-tip2': '<strong>テンプレートビュー作成：</strong>よく使う視点をテンプレートとして保存するビューを作成しておくと便利です。',
        'manual-view-copy-tip3': '<strong>ズームレベル：</strong>視点だけでなく、ズームレベルもコピーされます。',
        'manual-view-copy-note1': 'この機能は3Dビュー専用です。平面図や立面図などの2Dビューでは使用できません。',
        'manual-view-copy-note2': '視点コピー後にRevitを閉じると、コピーした視点情報は失われます。',
        'manual-view-copy-note3': 'ビューテンプレートの設定（表示/グラフィックス設定など）はコピーされません。視点情報のみがコピーされます。',
        
        // ========== 切断ボックスコピペ ==========
        'manual-sectionbox-copy-title': '切断ボックスコピペ',
        'manual-sectionbox-copy-subtitle': '3Dビューの切断ボックス範囲をコピー＆ペースト',
        'manual-sectionbox-copy-overview': 'この機能は、3Dビューの切断ボックス（Section Box）の範囲を別の3Dビューにコピーできます。複数の3Dビューで同じ表示範囲を使いたい場合に、切断ボックスを手動で調整する手間を省けます。',
        'manual-sectionbox-copy-step1-title': 'コピー元の3Dビューを開く',
        'manual-sectionbox-copy-step1-desc': '切断ボックスが設定されている3Dビューを開きます。切断ボックスが有効になっていることを確認してください（プロパティで「切断ボックス」がチェックされている状態）。',
        'manual-sectionbox-copy-step2-title': '切断ボックスをコピー',
        'manual-sectionbox-copy-step2-desc': 'Revitリボンの「28 Tools」タブから「切断ボックスコピー」ボタンをクリックします。現在の切断ボックスの範囲情報がメモリにコピーされます。',
        'manual-sectionbox-copy-step3-title': 'ペースト先の3Dビューを開く',
        'manual-sectionbox-copy-step3-desc': '切断ボックスを適用したい別の3Dビューを開きます。',
        'manual-sectionbox-copy-step4-title': '切断ボックスをペースト',
        'manual-sectionbox-copy-step4-desc': '「28 Tools」タブから「切断ボックスペースト」ボタンをクリックします。コピーした切断ボックスの範囲が現在の3Dビューに適用され、切断ボックスが自動的に有効化されます。',
        'manual-sectionbox-copy-usecase1-title': '階ごとの3Dビュー作成',
        'manual-sectionbox-copy-usecase1-desc': '各階の3Dビューで同じ範囲の切断ボックスを効率的に設定できます。',
        'manual-sectionbox-copy-usecase2-title': '詳細ビューの作成',
        'manual-sectionbox-copy-usecase2-desc': '特定範囲の詳細を複数の設定で表示する際に便利です。',
        'manual-sectionbox-copy-usecase3-title': '比較検討',
        'manual-sectionbox-copy-usecase3-desc': '同じ範囲で異なる表示設定のビューを素早く作成できます。',
        'manual-sectionbox-copy-tip1': '<strong>切断ボックスの確認：</strong>コピー元のビューで切断ボックスが有効になっているか確認してください。',
        'manual-sectionbox-copy-tip2': '<strong>自動有効化：</strong>ペースト先のビューで切断ボックスが無効でも、ペースト時に自動的に有効化されます。',
        'manual-sectionbox-copy-tip3': '<strong>座標系：</strong>切断ボックスはプロジェクトの座標系で保存されるため、異なるビューでも正確に適用されます。',
        'manual-sectionbox-copy-note1': 'この機能は3Dビュー専用です。2Dビューでは使用できません。',
        'manual-sectionbox-copy-note2': '切断ボックスコピー後にRevitを閉じると、コピーした範囲情報は失われます。',
        'manual-sectionbox-copy-note3': '切断ボックスの範囲のみがコピーされます。ビューの表示設定やビューテンプレートはコピーされません。',
        
        // ========== ビューポート位置コピペ ==========
        'manual-viewport-copy-title': 'ビューポート位置コピペ',
        'manual-viewport-copy-subtitle': 'シート上のビューポート位置をコピー＆ペースト',
        'manual-viewport-copy-overview': 'この機能は、シート上に配置されたビューポートの位置を別のシートの同じビューポートにコピーできます。複数のシートで統一されたレイアウトを作成する際に、ビューポート位置を手動で調整する手間を大幅に削減できます。',
        'manual-viewport-copy-step1-title': 'コピー元のシートを開く',
        'manual-viewport-copy-step1-desc': 'ビューポート位置をコピーしたいシートを開きます。',
        'manual-viewport-copy-step2-title': 'ビューポートを選択してコピー',
        'manual-viewport-copy-step2-desc': '位置をコピーしたいビューポートを選択します。Revitリボンの「28 Tools」タブから「ビューポート位置コピー」ボタンをクリックします。',
        'manual-viewport-copy-step3-title': 'ペースト先のシートを開く',
        'manual-viewport-copy-step3-desc': 'ビューポート位置を適用したい別のシートを開きます。',
        'manual-viewport-copy-step4-title': 'ビューポートを選択してペースト',
        'manual-viewport-copy-step4-desc': '位置を変更したいビューポートを選択します。「28 Tools」タブから「ビューポート位置ペースト」ボタンをクリックします。選択したビューポートがコピーした位置に移動します。',
        'manual-viewport-copy-usecase1-title': '標準シートレイアウト',
        'manual-viewport-copy-usecase1-desc': '複数のシートで統一されたビューポート配置を素早く実現できます。',
        'manual-viewport-copy-usecase2-title': '各階平面図の統一',
        'manual-viewport-copy-usecase2-desc': '各階の平面図シートで、ビューポート位置を統一して見やすくできます。',
        'manual-viewport-copy-usecase3-title': '作業効率化',
        'manual-viewport-copy-usecase3-desc': 'ビューポート位置を1枚ずつ調整する手間を大幅に削減できます。',
        'manual-viewport-copy-tip1': '<strong>図枠の統一：</strong>コピー元とペースト先で同じ図枠を使用すると、レイアウトが正確に再現されます。',
        'manual-viewport-copy-tip2': '<strong>複数ビューポート：</strong>1つずつビューポートを選択してコピー・ペーストを繰り返すことで、複数のビューポート位置を揃えられます。',
        'manual-viewport-copy-tip3': '<strong>微調整：</strong>ペースト後、必要に応じて微調整を行うことができます。',
        'manual-viewport-copy-note1': 'この機能はシート上のビューポート専用です。ビュー内では使用できません。',
        'manual-viewport-copy-note2': 'ビューポート位置のみがコピーされます。ビューポートのサイズ、縮尺、表示設定などはコピーされません。',
        'manual-viewport-copy-note3': '位置コピー後にRevitを閉じると、コピーした位置情報は失われます。',
        
        // ========== トリミング領域コピペ ==========
        'manual-cropbox-copy-title': 'トリミング領域コピペ',
        'manual-cropbox-copy-subtitle': 'ビューのトリミング領域をコピー＆ペースト',
        'manual-cropbox-copy-overview': 'この機能は、平面図や立面図などのビューのトリミング領域（表示範囲）を別のビューにコピーできます。複数のビューで同じ表示範囲を使いたい場合に、トリミング領域を手動で調整する手間を省けます。',
        'manual-cropbox-copy-step1-title': 'コピー元のビューを開く',
        'manual-cropbox-copy-step1-desc': 'トリミング領域をコピーしたいビューを開きます。トリミング領域が有効になっていることを確認してください（プロパティで「切り取り領域」がチェックされている状態）。',
        'manual-cropbox-copy-step2-title': 'トリミング領域をコピー',
        'manual-cropbox-copy-step2-desc': 'Revitリボンの「28 Tools」タブから「トリミング領域コピー」ボタンをクリックします。現在のビューのトリミング領域情報がメモリにコピーされます。',
        'manual-cropbox-copy-step3-title': 'ペースト先のビューを開く',
        'manual-cropbox-copy-step3-desc': 'トリミング領域を適用したい別のビューを開きます。',
        'manual-cropbox-copy-step4-title': 'トリミング領域をペースト',
        'manual-cropbox-copy-step4-desc': '「28 Tools」タブから「トリミング領域ペースト」ボタンをクリックします。コピーしたトリミング領域が現在のビューに適用され、トリミング領域が自動的に有効化されます。',
        'manual-cropbox-copy-usecase1-title': '各階平面図の統一',
        'manual-cropbox-copy-usecase1-desc': '各階の平面図で同じ表示範囲を効率的に設定できます。',
        'manual-cropbox-copy-usecase2-title': '詳細ビューの作成',
        'manual-cropbox-copy-usecase2-desc': '同じ範囲で異なる表示設定のビューを素早く作成できます。',
        'manual-cropbox-copy-usecase3-title': '一貫性の確保',
        'manual-cropbox-copy-usecase3-desc': '複数のビューで統一された表示範囲を維持できます。',
        'manual-cropbox-copy-tip1': '<strong>トリミング領域の確認：</strong>コピー元のビューでトリミング領域が有効になっているか確認してください。',
        'manual-cropbox-copy-tip2': '<strong>自動有効化：</strong>ペースト先のビューでトリミング領域が無効でも、ペースト時に自動的に有効化されます。',
        'manual-cropbox-copy-tip3': '<strong>ビュータイプ：</strong>平面図、立面図、断面図など、様々なビュータイプで使用できます。',
        'manual-cropbox-copy-note1': 'トリミング領域のみがコピーされます。ビューの表示設定やビューテンプレートはコピーされません。',
        'manual-cropbox-copy-note2': 'トリミング領域コピー後にRevitを閉じると、コピーした領域情報は失われます。',
        'manual-cropbox-copy-note3': '異なるビュータイプ間（例：平面図から立面図）でもコピー可能ですが、意図した結果にならない場合があります。'
    },
    
    en: {
        // 英語翻訳は前回と同じなので省略（実際のコードには含まれています）
        // ※文字数制限のため、このメッセージでは日本語のみ表示
    },
    
    zh: {
        // 中国語翻訳は前回と同じなので省略（実際のコードには含まれています）
        // ※文字数制限のため、このメッセージでは日本語のみ表示
    }
};

// ※ 英語と中国語の翻訳データは前回提供したものと同じです
// ※ 実際に使用する際は、前回のmain.jsから en: {} と zh: {} セクションをコピーしてください

// バージョン別パスワード
const passwords = {
    '2021': 'tools2021',
    '2022': 'tools2022',
    '2023': 'tools2023',
    '2024': 'tools2024',
    '2025': 'tools2025',
    '2026': 'tools2026'
};

// モーダルコンテンツ
const modalContents = {
    install: {
        ja: {
            title: 'インストールガイド',
            content: `
                <h3>システム要件</h3>
                <ul>
                    <li>Autodesk Revit 2021-2026</li>
                    <li>Windows 10/11 (64bit)</li>
                    <li>.NET Framework 4.8以上</li>
                </ul>
                
                <h3>インストール手順</h3>
                <ol>
                    <li>ダウンロードしたZIPファイルを解凍</li>
                    <li>「自動インストール.bat」を右クリック→管理者として実行</li>
                    <li>Revitを再起動</li>
                    <li>アドインタブに「28 Tools」が表示されることを確認</li>
                </ol>
                
                <div class="warning-box">
                    <strong>注意:</strong> 管理者権限が必要です。セキュリティソフトが警告を出す場合がありますが、安全なファイルです。
                </div>
            `
        },
        en: {
            title: 'Installation Guide',
            content: `
                <h3>System Requirements</h3>
                <ul>
                    <li>Autodesk Revit 2021-2026</li>
                    <li>Windows 10/11 (64bit)</li>
                    <li>.NET Framework 4.8 or higher</li>
                </ul>
                
                <h3>Installation Steps</h3>
                <ol>
                    <li>Extract the downloaded ZIP file</li>
                    <li>Right-click "自動インストール.bat" → Run as administrator</li>
                    <li>Restart Revit</li>
                    <li>Verify "28 Tools" appears in the Add-ins tab</li>
                </ol>
                
                <div class="warning-box">
                    <strong>Note:</strong> Administrator privileges required. Security software may show warnings, but the files are safe.
                </div>
            `
        },
        zh: {
            title: '安装指南',
            content: `
                <h3>系统要求</h3>
                <ul>
                    <li>Autodesk Revit 2021-2026</li>
                    <li>Windows 10/11 (64位)</li>
                    <li>.NET Framework 4.8或更高版本</li>
                </ul>
                
                <h3>安装步骤</h3>
                <ol>
                    <li>解压下载的ZIP文件</li>
                    <li>右键点击"自動インストール.bat"→以管理员身份运行</li>
                    <li>重启Revit</li>
                    <li>确认"28 Tools"出现在加载项选项卡中</li>
                </ol>
                
                <div class="warning-box">
                    <strong>注意:</strong> 需要管理员权限。安全软件可能会显示警告，但文件是安全的。
                </div>
            `
        }
    },
    uninstall: {
        ja: {
            title: 'アンインストール',
            content: `
                <h3>自動アンインストール</h3>
                <ol>
                    <li>「アンインストール.bat」を右クリック→管理者として実行</li>
                    <li>Revitを再起動</li>
                    <li>アドインタブから「28 Tools」が消えることを確認</li>
                </ol>
                
                <h3>手動アンインストール</h3>
                <p>以下のファイルを削除してください：</p>
                <ul>
                    <li><code>%AppData%\\Autodesk\\Revit\\Addins\\20XX\\28Tools\\</code></li>
                    <li><code>%AppData%\\Autodesk\\Revit\\Addins\\20XX\\Tools28.addin</code></li>
                </ul>
            `
        },
        en: {
            title: 'Uninstall',
            content: `
                <h3>Automatic Uninstall</h3>
                <ol>
                    <li>Right-click "アンインストール.bat" → Run as administrator</li>
                    <li>Restart Revit</li>
                    <li>Verify "28 Tools" disappears from Add-ins tab</li>
                </ol>
                
                <h3>Manual Uninstall</h3>
                <p>Delete the following files:</p>
                <ul>
                    <li><code>%AppData%\\Autodesk\\Revit\\Addins\\20XX\\28Tools\\</code></li>
                    <li><code>%AppData%\\Autodesk\\Revit\\Addins\\20XX\\Tools28.addin</code></li>
                </ul>
            `
        },
        zh: {
            title: '卸载',
            content: `
                <h3>自动卸载</h3>
                <ol>
                    <li>右键点击"アンインストール.bat"→以管理员身份运行</li>
                    <li>重启Revit</li>
                    <li>确认"28 Tools"从加载项选项卡中消失</li>
                </ol>
                
                <h3>手动卸载</h3>
                <p>删除以下文件：</p>
                <ul>
                    <li><code>%AppData%\\Autodesk\\Revit\\Addins\\20XX\\28Tools\\</code></li>
                    <li><code>%AppData%\\Autodesk\\Revit\\Addins\\20XX\\Tools28.addin</code></li>
                </ul>
            `
        }
    },
    support: {
        ja: {
            title: 'サポート情報',
            content: `
                <h3>よくある質問</h3>
                <div class="faq-item">
                    <strong>Q: アドインが表示されません</strong><br>
                    A: Revitを完全に再起動し、管理者権限でインストールされているか確認してください。
                </div>
                
                <div class="faq-item">
                    <strong>Q: 機能が動作しません</strong><br>
                    A: 対象要素（通り芯・レベル等）がビューに存在するか確認してください。
                </div>
                
                <h3>トラブルシューティング</h3>
                <ul>
                    <li>「診断ツール.bat」を実行して環境をチェック</li>
                    <li>Revitのバージョンとアドインのバージョンが一致しているか確認</li>
                    <li>一時的に他のアドインを無効化して動作確認</li>
                </ul>
                
                <h3>お問い合わせ</h3>
                <p>問題が解決しない場合は、診断ツールの結果と併せてご連絡ください。</p>
            `
        },
        en: {
            title: 'Support Information',
            content: `
                <h3>Frequently Asked Questions</h3>
                <div class="faq-item">
                    <strong>Q: Add-in not showing</strong><br>
                    A: Completely restart Revit and verify installation with administrator privileges.
                </div>
                
                <div class="faq-item">
                    <strong>Q: Functions not working</strong><br>
                    A: Check if target elements (grids, levels, etc.) exist in the view.
                </div>
                
                <h3>Troubleshooting</h3>
                <ul>
                    <li>Run "診断ツール.bat" to check environment</li>
                    <li>Verify Revit version matches add-in version</li>
                    <li>Temporarily disable other add-ins for testing</li>
                </ul>
                
                <h3>Contact</h3>
                <p>If issues persist, please contact us with diagnostic tool results.</p>
            `
        },
        zh: {
            title: '支持信息',
            content: `
                <h3>常见问题</h3>
                <div class="faq-item">
                    <strong>问：加载项未显示</strong><br>
                    答：完全重启Revit，确认是否以管理员权限安装。
                </div>
                
                <div class="faq-item">
                    <strong>问：功能无法使用</strong><br>
                    答：检查视图中是否存在目标元素（轴网、标高等）。
                </div>
                
                <h3>故障排除</h3>
                <ul>
                    <li>运行"診断ツール.bat"检查环境</li>
                    <li>确认Revit版本与加载项版本匹配</li>
                    <li>暂时禁用其他加载项进行测试</li>
                </ul>
                
                <h3>联系我们</h3>
                <p>如果问题仍然存在，请连同诊断工具结果一起联系我们。</p>
            `
        }
    }
};

// ヘッダー読み込み関数
async function loadHeader() {
    try {
        const basePath = window.location.pathname.includes('/manual/') ? '../' : './';
        const response = await fetch(basePath + 'includes/header.html');
        
        if (!response.ok) {
            throw new Error('Header file not found');
        }
        const headerHTML = await response.text();
        
        const headerContainer = document.getElementById('header-container');
        if (headerContainer) {
            headerContainer.innerHTML = headerHTML;
            
            if (document.body.classList.contains('manual-page')) {
                const mainTitle = document.querySelector('.main-title');
                if (mainTitle) {
                    mainTitle.style.cursor = 'pointer';
                    mainTitle.addEventListener('click', () => {
                        window.location.href = '../index.html';
                    });
                }
            }
            
            initializeLanguageSwitcher();
            
            const currentLang = localStorage.getItem('selectedLanguage') || 'ja';
            updateLanguage(currentLang);
            updateLanguageButton(currentLang);
        }
    } catch (error) {
        console.error('Failed to load header:', error);
    }
}

// 言語更新機能
function updateLanguage(lang) {
    console.log('Updating language to:', lang);
    
    const elements = document.querySelectorAll('[data-lang-key]');
    elements.forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (translations[lang] && translations[lang][key]) {
            if (translations[lang][key].includes('<strong>') || translations[lang][key].includes('<')) {
                element.innerHTML = translations[lang][key];
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });

    const oldElements = document.querySelectorAll('[data-lang]');
    oldElements.forEach(element => {
        const key = element.getAttribute('data-lang');
        if (translations[lang] && translations[lang][key]) {
            if (translations[lang][key].includes('<strong>') || translations[lang][key].includes('<')) {
                element.innerHTML = translations[lang][key];
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });

    localStorage.setItem('selectedLanguage', lang);
}

// 言語切り替えボタンの表示更新
function updateLanguageButton(lang) {
    const langFlag = document.querySelector('.lang-flag');
    const langText = document.querySelector('.lang-text');
    
    if (langFlag && langText) {
        const langConfig = {
            'ja': { flag: '🇯🇵', text: '日本語' },
            'en': { flag: '🇺🇸', text: 'English' },
            'zh': { flag: '🇨🇳', text: '中文' }
        };
        
        const config = langConfig[lang] || langConfig['ja'];
        langFlag.textContent = config.flag;
        langText.textContent = config.text;
        
        const langOptions = document.querySelectorAll('.lang-option');
        langOptions.forEach(option => {
            option.classList.remove('active');
            if (option.onclick && option.onclick.toString().includes(`'${lang}'`)) {
                option.classList.add('active');
            }
        });
    }
}

// 言語切り替え関数
function switchLanguage(lang) {
    console.log('switchLanguage called with:', lang);
    localStorage.setItem('selectedLanguage', lang);
    updateLanguage(lang);
    updateLanguageButton(lang);
    
    const langMenu = document.getElementById('langMenu');
    if (langMenu) {
        langMenu.classList.remove('show');
        langMenu.style.display = 'none';
    }
}

// 言語メニューの表示切り替え
function toggleLanguageMenu() {
    console.log('toggleLanguageMenu called');
    const langMenu = document.getElementById('langMenu');
    if (langMenu) {
        const isVisible = langMenu.style.display === 'block' || langMenu.classList.contains('show');
        
        if (isVisible) {
            langMenu.classList.remove('show');
            langMenu.style.display = 'none';
        } else {
            langMenu.style.display = 'block';
            setTimeout(() => {
                langMenu.classList.add('show');
            }, 10);
        }
    }
}

// 言語切り替えの初期化
function initializeLanguageSwitcher() {
    document.addEventListener('click', function(event) {
        const langSwitcher = document.querySelector('.language-switcher');
        const langMenu = document.getElementById('langMenu');
        
        if (langSwitcher && langMenu && !langSwitcher.contains(event.target)) {
            langMenu.classList.remove('show');
            langMenu.style.display = 'none';
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const langMenu = document.getElementById('langMenu');
            if (langMenu) {
                langMenu.classList.remove('show');
                langMenu.style.display = 'none';
            }
        }
    });
}

// モーダル表示機能（修正版：既存モーダルを再利用）
function showModal(type) {
    const currentLang = localStorage.getItem('selectedLanguage') || 'ja';
    const content = modalContents[type][currentLang];
    
    if (!content) return;
    
    // 既存のモーダルを探す
    let modal = document.querySelector('.modal-overlay');
    
    if (modal) {
        // 既存のモーダルがある場合は内容を更新
        const modalHeader = modal.querySelector('.modal-header h2');
        const modalBody = modal.querySelector('.modal-body');
        
        if (modalHeader && modalBody) {
            // フェードアウト効果
            modal.classList.remove('show');
            
            setTimeout(() => {
                // 内容を更新
                modalHeader.textContent = content.title;
                modalBody.innerHTML = content.content;
                
                // フェードイン効果
                modal.classList.add('show');
            }, 150);
        }
    } else {
        // 新規モーダルを作成
        modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${content.title}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content.content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // アニメーション用のクラス追加
        setTimeout(() => modal.classList.add('show'), 10);
        
        // 閉じるボタンのイベント
        const closeBtn = modal.querySelector('.modal-close');
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    document.body.removeChild(modal);
                }
            }, 300);
        };
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // ESCキーで閉じる
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
}

// モーダル初期化関数（修正版）
function initializeModals() {
    const footerCards = document.querySelectorAll('.footer-card');
    if (footerCards.length > 0) {
        console.log('Footer cards found:', footerCards.length);
        footerCards.forEach(card => {
            // 既存のイベントリスナーを削除して重複を防止
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            // 新しいイベントリスナーを追加
            newCard.addEventListener('click', function(e) {
                e.preventDefault();
                const modalType = this.getAttribute('data-modal');
                if (modalType) {
                    console.log('Opening modal:', modalType);
                    showModal(modalType);
                }
            });
        });
    }
}

// バージョンタブ初期化関数
function initializeVersionTabs() {
    const versionTabs = document.querySelectorAll('.tab');
    if (versionTabs.length > 0) {
        console.log('Version tabs found:', versionTabs.length);
        versionTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const onclick = this.getAttribute('onclick');
                if (onclick) {
                    const match = onclick.match(/selectVersion\('(\d+)', '(\w+)'\)/);
                    if (match) {
                        const version = match[1];
                        const status = match[2];
                        selectVersion(version, status);
                    }
                }
            });
        });
    }
}

// バージョン選択関数
function selectVersion(version, status) {
    const currentLang = localStorage.getItem('selectedLanguage') || 'ja';
    
    if (status === 'planned') {
        const messages = {
            ja: `Revit ${version}版は開発予定です。`,
            en: `Revit ${version} version is planned for development.`,
            zh: `Revit ${version}版本计划开发中。`
        };
        alert(messages[currentLang] || messages.ja);
        return;
    }
    
    if (status === 'development') {
        const messages = {
            ja: `Revit ${version}版は開発中です。`,
            en: `Revit ${version} version is under development.`,
            zh: `Revit ${version}版本正在开发中。`
        };
        alert(messages[currentLang] || messages.ja);
        return;
    }
    
    const promptMessages = {
        ja: `Revit ${version}版のパスワードを入力してください:`,
        en: `Enter password for Revit ${version}:`,
        zh: `请输入Revit ${version}版本的密码:`
    };
    
    const inputPassword = prompt(promptMessages[currentLang] || promptMessages.ja);
    
    if (inputPassword === passwords[version]) {
        const successMessages = {
            ja: `Revit ${version}版のダウンロードを開始します。`,
            en: `Starting download for Revit ${version}.`,
            zh: `开始下载Revit ${version}版本。`
        };
        alert(successMessages[currentLang] || successMessages.ja);
        
        // window.location.href = `downloads/28Tools_Revit${version}_v1.0.zip`;
        
    } else if (inputPassword !== null) {
        const errorMessages = {
            ja: 'パスワードが正しくありません。',
            en: 'Incorrect password.',
            zh: '密码不正确。'
        };
        alert(errorMessages[currentLang] || errorMessages.ja);
    }
}

// DOMContentLoaded イベントリスナー
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js v6.1 loaded - Modal fix applied');
    
    loadHeader();
    
    setTimeout(() => {
        initializeModals();
        initializeVersionTabs();
        
        const savedLanguage = localStorage.getItem('selectedLanguage') || 'ja';
        console.log('Initial language:', savedLanguage);
        updateLanguage(savedLanguage);
        
    }, 300);
});

// グローバルに公開
window.updateLanguage = updateLanguage;
window.showModal = showModal;
window.switchLanguage = switchLanguage;
window.toggleLanguageMenu = toggleLanguageMenu;
window.selectVersion = selectVersion;
