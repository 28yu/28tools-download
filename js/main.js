// 28 Tools 配布サイト - メインJavaScript（v6.0 - 完全多言語対応版）

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
        // ========== 共通要素 ==========
        'mainTitle': '28 Tools',
        'subtitle': 'Revit Add-in Distribution Center',
        'site-title': '28 Tools',
        'site-subtitle': 'Revit Add-in Distribution Center',
        'footer-text': '© 2024 28 Tools. All rights reserved.',
        
        // ========== メインページ専用 ==========
        'features-title': 'Features',
        'features-subtitle': '6 functions to streamline your Revit workflow',
        'download-title': 'Download',
        'download-subtitle': 'Select your Revit version to download',
        'grid-bubble-title': 'Grid Bubble ON/OFF',
        'grid-bubble-desc': 'Toggle grid and level bubble display',
        'sheet-creation-title': 'Bulk Sheet Creation',
        'sheet-creation-desc': 'Create multiple sheets with specified title blocks',
        'view-copy-title': '3D View Copy/Paste',
        'view-copy-desc': 'Copy and paste 3D view orientations',
        'sectionbox-copy-title': 'Section Box Copy/Paste',
        'sectionbox-copy-desc': 'Copy and paste 3D view section ranges',
        'viewport-position-title': 'Viewport Position Copy/Paste',
        'viewport-position-desc': 'Copy and paste viewport positions on sheets',
        'cropbox-copy-title': 'Crop Region Copy/Paste',
        'cropbox-copy-desc': 'Copy and paste view crop regions',
        'status-completed': 'Completed',
        'status-development': 'In Development',
        'status-planned': 'Planned',
        'install-guide': '📖 Installation Guide',
        'uninstall-guide': '🗑️ Uninstall',
        'support-info': '❓ Support Information',
        
        // ========== マニュアルページ共通 ==========
        'breadcrumb-home': 'Home',
        'section-overview': 'Overview',
        'section-features': 'Key Features',
        'section-usage': 'How to Use',
        'section-usecases': 'Use Cases',
        'section-tips': 'Tips',
        'section-notes': 'Important Notes',
        'image-placeholder-text': '📷 Screenshot image to be added',
        'back-to-home': '← Back to Home',
        
        // ========== 符号ON/OFF ==========
        'grid-bubble-subtitle': 'Toggle grid and level bubble display with one click',
        'grid-bubble-overview': 'This function allows you to toggle the bubble display of all grids and levels in the currently active view (plan, section, elevation) with one click. It is very useful for quickly adjusting drawing visibility in projects with many grids and levels.',
        'grid-bubble-feature1': 'Toggle all grid and level bubbles with one click',
        'grid-bubble-feature2': 'Applies only to the currently active view (plan, section, elevation)',
        'grid-bubble-feature3': 'Compatible with all plan, section, and elevation views',
        'grid-bubble-feature4': 'Safe operation with Undo functionality',
        'grid-bubble-step1-title': 'Open View',
        'grid-bubble-step1-desc': 'Open the view (plan, section, elevation) where you want to change bubble display.',
        'grid-bubble-step2-title': 'Launch 28 Tools',
        'grid-bubble-step2-desc': 'Click the Grid Bubble ON/OFF button from the "28 Tools" tab in the Revit ribbon. Choose from three options:',
        'grid-bubble-left': 'Left Only:',
        'grid-bubble-left-desc': 'Display only left-end bubbles of grids and levels',
        'grid-bubble-both': 'Both Ends:',
        'grid-bubble-both-desc': 'Display bubbles at both ends of grids and levels',
        'grid-bubble-right': 'Right Only:',
        'grid-bubble-right-desc': 'Display only right-end bubbles of grids and levels',
        'grid-bubble-step3-title': 'Click Button',
        'grid-bubble-step3-desc': 'Click the "Grid Bubble ON/OFF" button to toggle the display of all grid and level bubbles in the current view. Changes are applied immediately.',
        'grid-bubble-step4-title': 'Check Results',
        'grid-bubble-step4-desc': 'Verify that bubble display has been toggled. Use Revit\'s Undo function if you need to revert.',
        'grid-bubble-usecase1-title': 'Presentation Drawings',
        'grid-bubble-usecase1-desc': 'Display only necessary bubbles for clearer client presentations.',
        'grid-bubble-usecase2-title': 'Print Drawing Adjustment',
        'grid-bubble-usecase2-desc': 'When bubbles are too dense for printing, show only one side for better visibility.',
        'grid-bubble-usecase3-title': 'Efficiency Improvement',
        'grid-bubble-usecase3-desc': 'Significantly reduce time spent manually toggling many grids and levels.',
        'grid-bubble-tip1': '<strong>View-specific:</strong> This function applies only to the currently active view and does not affect other views.',
        'grid-bubble-tip2': '<strong>Undo:</strong> If you make a mistake, easily revert using Revit\'s Undo (Ctrl+Z).',
        'grid-bubble-tip3': '<strong>View Templates:</strong> Save frequently used settings as view templates for even more efficiency.',
        'grid-bubble-note1': 'This function applies only to the currently active view. Bubble display in other views is not affected.',
        'grid-bubble-note2': '3D views may have different grid and level bubble display settings, so this function may not be applicable.',
        'grid-bubble-note3': 'In worksharing environments, this does not affect other users\' views (each view\'s settings are independent).',
        
        // ========== シート一括作成 ==========
        'manual-sheet-creation-title': 'Bulk Sheet Creation',
        'manual-sheet-creation-subtitle': 'Create multiple sheets with specified title blocks at once',
        'manual-sheet-creation-overview': 'This function allows you to create multiple sheets at once using a specified title block. You can efficiently organize your project sheet structure by simply entering sheet numbers and names.',
        'manual-sheet-creation-step1-title': 'Launch Function',
        'manual-sheet-creation-step1-desc': 'Click the "Bulk Sheet Creation" button from the "28 Tools" tab in the Revit ribbon.',
        'manual-sheet-creation-step2-title': 'Select Title Block',
        'manual-sheet-creation-step2-desc': 'When the dialog appears, select the title block to use from the dropdown list.',
        'manual-sheet-creation-step3-title': 'Enter Sheet Information',
        'manual-sheet-creation-step3-desc': 'Enter the sheet numbers and names you want to create. You can specify multiple sheets at once.',
        'manual-sheet-creation-step4-title': 'Execute',
        'manual-sheet-creation-step4-desc': 'Click the "Create" button to create multiple sheets with the specified title block at once.',
        'manual-sheet-creation-usecase1-title': 'Project Initial Setup',
        'manual-sheet-creation-usecase1-desc': 'Create required sheet structure at once when starting a project.',
        'manual-sheet-creation-usecase2-title': 'Standard Sheet Deployment',
        'manual-sheet-creation-usecase2-desc': 'Quickly deploy company standard sheet structure to projects.',
        'manual-sheet-creation-usecase3-title': 'Work Efficiency',
        'manual-sheet-creation-usecase3-desc': 'Significantly reduce time spent creating sheets one by one.',
        'manual-sheet-creation-tip1': '<strong>Title Block Preparation:</strong> Load the title blocks you will use into the project beforehand.',
        'manual-sheet-creation-tip2': '<strong>Sheet Number Naming:</strong> We recommend following your company\'s standard sheet numbering system.',
        'manual-sheet-creation-tip3': '<strong>Check Existing Sheets:</strong> Errors will occur if the same sheet number already exists.',
        'manual-sheet-creation-note1': 'Title blocks must be loaded into the project beforehand.',
        'manual-sheet-creation-note2': 'Duplicate sheet numbers cannot be created. Be careful not to overlap with existing sheet numbers.',
        'manual-sheet-creation-note3': 'After creating sheets, set detailed sheet information (approvers, drafters, etc.) individually as needed.',
        
        // ========== 3D視点コピペ ==========
        'manual-view-copy-title': '3D View Copy/Paste',
        'manual-view-copy-subtitle': 'Copy and paste 3D view orientations to other views',
        'manual-view-copy-overview': 'This function allows you to copy camera orientation (camera position, direction, zoom) from one 3D view to another. It eliminates the need for manual adjustments when you want to use the same viewpoint in multiple 3D views.',
        'manual-view-copy-step1-title': 'Open Source 3D View',
        'manual-view-copy-step1-desc': 'Open the 3D view whose orientation you want to copy and adjust it to the desired viewpoint.',
        'manual-view-copy-step2-title': 'Copy Orientation',
        'manual-view-copy-step2-desc': 'Click the "View Copy" button from the "28 Tools" tab in the Revit ribbon. The current 3D view orientation information is copied to memory.',
        'manual-view-copy-step3-title': 'Open Target 3D View',
        'manual-view-copy-step3-desc': 'Open another 3D view where you want to apply the orientation.',
        'manual-view-copy-step4-title': 'Paste Orientation',
        'manual-view-copy-step4-desc': 'Click the "View Paste" button from the "28 Tools" tab. The copied orientation is applied to the current 3D view.',
        'manual-view-copy-usecase1-title': 'Consistent Viewpoint',
        'manual-view-copy-usecase1-desc': 'Maintain drawing consistency by using the same viewpoint in multiple 3D views.',
        'manual-view-copy-usecase2-title': 'Phased View Creation',
        'manual-view-copy-usecase2-desc': 'Efficiently create multiple views with different element displays from the same viewpoint.',
        'manual-view-copy-usecase3-title': 'Time Saving',
        'manual-view-copy-usecase3-desc': 'Eliminate the need to repeatedly adjust 3D view orientations.',
        'manual-view-copy-tip1': '<strong>Perspective and Isometric:</strong> Orientation copying is possible for both perspective and isometric views.',
        'manual-view-copy-tip2': '<strong>Template View:</strong> Create a view to save frequently used viewpoints as templates.',
        'manual-view-copy-tip3': '<strong>Zoom Level:</strong> Not only the orientation but also the zoom level is copied.',
        'manual-view-copy-note1': 'This function is for 3D views only. It cannot be used with 2D views such as plans or elevations.',
        'manual-view-copy-note2': 'Copied orientation information is lost when you close Revit.',
        'manual-view-copy-note3': 'View template settings (Visibility/Graphics settings, etc.) are not copied. Only orientation information is copied.',
        
        // ========== 切断ボックスコピペ ==========
        'manual-sectionbox-copy-title': 'Section Box Copy/Paste',
        'manual-sectionbox-copy-subtitle': 'Copy and paste 3D view section box ranges',
        'manual-sectionbox-copy-overview': 'This function allows you to copy the section box range from one 3D view to another. It eliminates the need for manual section box adjustments when you want to use the same display range in multiple 3D views.',
        'manual-sectionbox-copy-step1-title': 'Open Source 3D View',
        'manual-sectionbox-copy-step1-desc': 'Open a 3D view with a section box configured. Verify that the section box is enabled (the "Section Box" option is checked in Properties).',
        'manual-sectionbox-copy-step2-title': 'Copy Section Box',
        'manual-sectionbox-copy-step2-desc': 'Click the "Section Box Copy" button from the "28 Tools" tab in the Revit ribbon. The current section box range information is copied to memory.',
        'manual-sectionbox-copy-step3-title': 'Open Target 3D View',
        'manual-sectionbox-copy-step3-desc': 'Open another 3D view where you want to apply the section box.',
        'manual-sectionbox-copy-step4-title': 'Paste Section Box',
        'manual-sectionbox-copy-step4-desc': 'Click the "Section Box Paste" button from the "28 Tools" tab. The copied section box range is applied to the current 3D view, and the section box is automatically enabled.',
        'manual-sectionbox-copy-usecase1-title': 'Floor-by-Floor 3D Views',
        'manual-sectionbox-copy-usecase1-desc': 'Efficiently set the same section box range for 3D views of each floor.',
        'manual-sectionbox-copy-usecase2-title': 'Detailed View Creation',
        'manual-sectionbox-copy-usecase2-desc': 'Useful for displaying specific range details with multiple settings.',
        'manual-sectionbox-copy-usecase3-title': 'Comparison Studies',
        'manual-sectionbox-copy-usecase3-desc': 'Quickly create views with different display settings for the same range.',
        'manual-sectionbox-copy-tip1': '<strong>Check Section Box:</strong> Verify that the section box is enabled in the source view.',
        'manual-sectionbox-copy-tip2': '<strong>Auto-Enable:</strong> Even if the section box is disabled in the target view, it will be automatically enabled when pasting.',
        'manual-sectionbox-copy-tip3': '<strong>Coordinate System:</strong> Section boxes are saved in the project coordinate system, so they apply accurately even to different views.',
        'manual-sectionbox-copy-note1': 'This function is for 3D views only. It cannot be used with 2D views.',
        'manual-sectionbox-copy-note2': 'Copied section box range information is lost when you close Revit.',
        'manual-sectionbox-copy-note3': 'Only the section box range is copied. View display settings and view templates are not copied.',
        
        // ========== ビューポート位置コピペ ==========
        'manual-viewport-copy-title': 'Viewport Position Copy/Paste',
        'manual-viewport-copy-subtitle': 'Copy and paste viewport positions on sheets',
        'manual-viewport-copy-overview': 'This function allows you to copy the position of a viewport placed on a sheet to the same viewport on another sheet. It significantly reduces the manual effort of adjusting viewport positions when creating unified layouts across multiple sheets.',
        'manual-viewport-copy-step1-title': 'Open Source Sheet',
        'manual-viewport-copy-step1-desc': 'Open the sheet whose viewport position you want to copy.',
        'manual-viewport-copy-step2-title': 'Select and Copy Viewport',
        'manual-viewport-copy-step2-desc': 'Select the viewport whose position you want to copy. Click the "Viewport Position Copy" button from the "28 Tools" tab in the Revit ribbon.',
        'manual-viewport-copy-step3-title': 'Open Target Sheet',
        'manual-viewport-copy-step3-desc': 'Open another sheet where you want to apply the viewport position.',
        'manual-viewport-copy-step4-title': 'Select and Paste Viewport',
        'manual-viewport-copy-step4-desc': 'Select the viewport whose position you want to change. Click the "Viewport Position Paste" button from the "28 Tools" tab. The selected viewport moves to the copied position.',
        'manual-viewport-copy-usecase1-title': 'Standard Sheet Layout',
        'manual-viewport-copy-usecase1-desc': 'Quickly achieve unified viewport placement across multiple sheets.',
        'manual-viewport-copy-usecase2-title': 'Floor Plan Uniformity',
        'manual-viewport-copy-usecase2-desc': 'Unify viewport positions on floor plan sheets for each floor to improve readability.',
        'manual-viewport-copy-usecase3-title': 'Work Efficiency',
        'manual-viewport-copy-usecase3-desc': 'Significantly reduce the effort of adjusting viewport positions sheet by sheet.',
        'manual-viewport-copy-tip1': '<strong>Title Block Uniformity:</strong> Using the same title block for source and target ensures accurate layout reproduction.',
        'manual-viewport-copy-tip2': '<strong>Multiple Viewports:</strong> You can align multiple viewport positions by repeating copy-paste for each viewport one by one.',
        'manual-viewport-copy-tip3': '<strong>Fine Tuning:</strong> After pasting, you can make fine adjustments as needed.',
        'manual-viewport-copy-note1': 'This function is for viewports on sheets only. It cannot be used within views.',
        'manual-viewport-copy-note2': 'Only viewport position is copied. Viewport size, scale, display settings, etc. are not copied.',
        'manual-viewport-copy-note3': 'Copied position information is lost when you close Revit.',
        
        // ========== トリミング領域コピペ ==========
        'manual-cropbox-copy-title': 'Crop Region Copy/Paste',
        'manual-cropbox-copy-subtitle': 'Copy and paste view crop regions',
        'manual-cropbox-copy-overview': 'This function allows you to copy the crop region (display range) of views such as plan and elevation views to another view. It eliminates the need for manual crop region adjustments when you want to use the same display range in multiple views.',
        'manual-cropbox-copy-step1-title': 'Open Source View',
        'manual-cropbox-copy-step1-desc': 'Open the view whose crop region you want to copy. Verify that the crop region is enabled (the "Crop Region" option is checked in Properties).',
        'manual-cropbox-copy-step2-title': 'Copy Crop Region',
        'manual-cropbox-copy-step2-desc': 'Click the "Crop Region Copy" button from the "28 Tools" tab in the Revit ribbon. The current view\'s crop region information is copied to memory.',
        'manual-cropbox-copy-step3-title': 'Open Target View',
        'manual-cropbox-copy-step3-desc': 'Open another view where you want to apply the crop region.',
        'manual-cropbox-copy-step4-title': 'Paste Crop Region',
        'manual-cropbox-copy-step4-desc': 'Click the "Crop Region Paste" button from the "28 Tools" tab. The copied crop region is applied to the current view, and the crop region is automatically enabled.',
        'manual-cropbox-copy-usecase1-title': 'Floor Plan Uniformity',
        'manual-cropbox-copy-usecase1-desc': 'Efficiently set the same display range for floor plans of each floor.',
        'manual-cropbox-copy-usecase2-title': 'Detailed View Creation',
        'manual-cropbox-copy-usecase2-desc': 'Quickly create views with different display settings for the same range.',
        'manual-cropbox-copy-usecase3-title': 'Ensure Consistency',
        'manual-cropbox-copy-usecase3-desc': 'Maintain unified display ranges across multiple views.',
        'manual-cropbox-copy-tip1': '<strong>Check Crop Region:</strong> Verify that the crop region is enabled in the source view.',
        'manual-cropbox-copy-tip2': '<strong>Auto-Enable:</strong> Even if the crop region is disabled in the target view, it will be automatically enabled when pasting.',
        'manual-cropbox-copy-tip3': '<strong>View Types:</strong> Can be used with various view types such as plans, elevations, and sections.',
        'manual-cropbox-copy-note1': 'Only the crop region is copied. View display settings and view templates are not copied.',
        'manual-cropbox-copy-note2': 'Copied crop region information is lost when you close Revit.',
        'manual-cropbox-copy-note3': 'Copying between different view types (e.g., plan to elevation) is possible but may not produce intended results.'
    },
    
    zh: {
        // ========== 共通要素 ==========
        'mainTitle': '28 Tools',
        'subtitle': 'Revit 插件分发中心',
        'site-title': '28 Tools',
        'site-subtitle': 'Revit 插件分发中心',
        'footer-text': '© 2024 28 Tools. 版权所有。',
        
        // ========== メインページ専用 ==========
        'features-title': '功能列表',
        'features-subtitle': '6个功能助力Revit工作流程优化',
        'download-title': '下载',
        'download-subtitle': '选择您的Revit版本进行下载',
        'grid-bubble-title': '符号开关',
        'grid-bubble-desc': '切换轴网和标高符号显示',
        'sheet-creation-title': '批量创建图纸',
        'sheet-creation-desc': '指定图框批量创建多个图纸',
        'view-copy-title': '三维视点复制粘贴',
        'view-copy-desc': '复制粘贴三维视图方向',
        'sectionbox-copy-title': '剖切框复制粘贴',
        'sectionbox-copy-desc': '复制粘贴三维视图剖切范围',
        'viewport-position-title': '视口位置复制粘贴',
        'viewport-position-desc': '复制粘贴图纸上的视口位置',
        'cropbox-copy-title': '裁剪区域复制粘贴',
        'cropbox-copy-desc': '复制粘贴视图裁剪区域',
        'status-completed': '已完成',
        'status-development': '开发中',
        'status-planned': '计划中',
        'install-guide': '📖 安装指南',
        'uninstall-guide': '🗑️ 卸载',
        'support-info': '❓ 支持信息',
        
        // ========== マニュアルページ共通 ==========
        'breadcrumb-home': '首页',
        'section-overview': '功能概述',
        'section-features': '主要功能',
        'section-usage': '使用方法',
        'section-usecases': '应用场景',
        'section-tips': '使用技巧',
        'section-notes': '注意事项',
        'image-placeholder-text': '📷 屏幕截图待添加',
        'back-to-home': '← 返回首页',
        
        // ========== 符号ON/OFF ==========
        'grid-bubble-subtitle': '一键切换轴网和标高符号显示',
        'grid-bubble-overview': '此功能可以一键切换当前活动视图（平面图、剖面图、立面图）中所有轴网和标高的符号显示。在有大量轴网和标高的项目中，可以快速调整图纸可见性，非常实用。',
        'grid-bubble-feature1': '一键切换所有轴网和标高符号',
        'grid-bubble-feature2': '仅适用于当前活动视图（平面图、剖面图、立面图）',
        'grid-bubble-feature3': '兼容所有平面图、剖面图和立面图',
        'grid-bubble-feature4': '支持撤销功能，操作安全',
        'grid-bubble-step1-title': '打开视图',
        'grid-bubble-step1-desc': '打开要更改符号显示的视图（平面图、剖面图、立面图）。',
        'grid-bubble-step2-title': '启动28 Tools',
        'grid-bubble-step2-desc': '从Revit功能区的"28 Tools"选项卡中点击符号开关功能按钮。可以从三个选项中选择：',
        'grid-bubble-left': '仅左端：',
        'grid-bubble-left-desc': '仅显示轴网和标高的左端符号',
        'grid-bubble-both': '两端：',
        'grid-bubble-both-desc': '显示轴网和标高的两端符号',
        'grid-bubble-right': '仅右端：',
        'grid-bubble-right-desc': '仅显示轴网和标高的右端符号',
        'grid-bubble-step3-title': '点击按钮',
        'grid-bubble-step3-desc': '点击"符号开关"按钮，当前视图中所有轴网和标高符号的显示将被切换。设置立即生效。',
        'grid-bubble-step4-title': '检查结果',
        'grid-bubble-step4-desc': '确认符号显示已被切换。如需还原，可使用Revit的撤销功能。',
        'grid-bubble-usecase1-title': '演示图纸',
        'grid-bubble-usecase1-desc': '在向客户说明时，仅显示必要的符号，使说明更清晰。',
        'grid-bubble-usecase2-title': '打印图纸调整',
        'grid-bubble-usecase2-desc': '打印时符号过于密集难以查看时，仅显示一侧可提高可见性。',
        'grid-bubble-usecase3-title': '提高效率',
        'grid-bubble-usecase3-desc': '大幅减少手动切换大量轴网和标高的时间。',
        'grid-bubble-tip1': '<strong>视图级别应用：</strong>此功能仅适用于当前活动视图，不影响其他视图。',
        'grid-bubble-tip2': '<strong>撤销：</strong>如果误操作，可以使用Revit的撤销功能（Ctrl+Z）轻松还原。',
        'grid-bubble-tip3': '<strong>视图样板：</strong>将常用设置保存为视图样板可进一步提高效率。',
        'grid-bubble-note1': '此功能仅适用于当前活动视图。不会影响其他视图中的符号显示。',
        'grid-bubble-note2': '三维视图中的轴网和标高符号显示设置可能不同，因此此功能可能不适用。',
        'grid-bubble-note3': '在工作共享环境中，不会影响其他用户的视图（每个视图的设置是独立的）。',
        
        // ========== シート一括作成 ==========
        'manual-sheet-creation-title': '批量创建图纸',
        'manual-sheet-creation-subtitle': '使用指定图框一次创建多个图纸',
        'manual-sheet-creation-overview': '此功能允许您使用指定的图框一次创建多个图纸。只需输入图纸编号和名称，即可高效地组织项目图纸结构。',
        'manual-sheet-creation-step1-title': '启动功能',
        'manual-sheet-creation-step1-desc': '从Revit功能区的"28 Tools"选项卡中点击"批量创建图纸"按钮。',
        'manual-sheet-creation-step2-title': '选择图框',
        'manual-sheet-creation-step2-desc': '对话框出现后，从下拉列表中选择要使用的图框。',
        'manual-sheet-creation-step3-title': '输入图纸信息',
        'manual-sheet-creation-step3-desc': '输入要创建的图纸编号和名称。可以一次指定多个图纸。',
        'manual-sheet-creation-step4-title': '执行',
        'manual-sheet-creation-step4-desc': '点击"创建"按钮，将使用指定图框一次创建多个图纸。',
        'manual-sheet-creation-usecase1-title': '项目初始设置',
        'manual-sheet-creation-usecase1-desc': '项目开始时一次创建所需的图纸结构。',
        'manual-sheet-creation-usecase2-title': '标准图纸部署',
        'manual-sheet-creation-usecase2-desc': '快速将公司标准图纸结构部署到项目中。',
        'manual-sheet-creation-usecase3-title': '提高工作效率',
        'manual-sheet-creation-usecase3-desc': '大幅减少逐个创建图纸的时间。',
        'manual-sheet-creation-tip1': '<strong>图框准备：</strong>请事先将要使用的图框加载到项目中。',
        'manual-sheet-creation-tip2': '<strong>图纸编号命名规则：</strong>建议遵循公司标准的图纸编号系统。',
        'manual-sheet-creation-tip3': '<strong>检查现有图纸：</strong>如果相同图纸编号已存在，将会出现错误。',
        'manual-sheet-creation-note1': '图框必须事先加载到项目中。',
        'manual-sheet-creation-note2': '无法创建重复的图纸编号。请注意不要与现有图纸编号重复。',
        'manual-sheet-creation-note3': '创建图纸后，根据需要单独设置图纸的详细信息（批准人、绘图人等）。',
        
        // ========== 3D视点コピペ ==========
        'manual-view-copy-title': '三维视点复制粘贴',
        'manual-view-copy-subtitle': '复制粘贴三维视图方向到其他视图',
        'manual-view-copy-overview': '此功能允许您将一个三维视图的相机方向（相机位置、方向、缩放）复制到另一个三维视图。当您想在多个三维视图中使用相同视点时，可以省去手动调整的麻烦。',
        'manual-view-copy-step1-title': '打开源三维视图',
        'manual-view-copy-step1-desc': '打开要复制方向的三维视图并调整到所需视点。',
        'manual-view-copy-step2-title': '复制方向',
        'manual-view-copy-step2-desc': '从Revit功能区的"28 Tools"选项卡中点击"视点复制"按钮。当前三维视图的方向信息将被复制到内存中。',
        'manual-view-copy-step3-title': '打开目标三维视图',
        'manual-view-copy-step3-desc': '打开要应用方向的另一个三维视图。',
        'manual-view-copy-step4-title': '粘贴方向',
        'manual-view-copy-step4-desc': '从"28 Tools"选项卡中点击"视点粘贴"按钮。复制的方向将应用到当前三维视图。',
        'manual-view-copy-usecase1-title': '一致的视点',
        'manual-view-copy-usecase1-desc': '在多个三维视图中使用相同视点以保持图纸一致性。',
        'manual-view-copy-usecase2-title': '阶段视图创建',
        'manual-view-copy-usecase2-desc': '从相同视点高效创建具有不同元素显示的多个视图。',
        'manual-view-copy-usecase3-title': '节省时间',
        'manual-view-copy-usecase3-desc': '无需重复调整三维视图方向。',
        'manual-view-copy-tip1': '<strong>透视图和等轴测：</strong>透视图和等轴测视图都可以复制方向。',
        'manual-view-copy-tip2': '<strong>模板视图：</strong>创建一个视图以保存常用视点作为模板会很方便。',
        'manual-view-copy-tip3': '<strong>缩放级别：</strong>不仅方向，缩放级别也会被复制。',
        'manual-view-copy-note1': '此功能仅适用于三维视图。无法用于平面图或立面图等二维视图。',
        'manual-view-copy-note2': '关闭Revit后，复制的方向信息将丢失。',
        'manual-view-copy-note3': '视图样板设置（可见性/图形设置等）不会被复制。仅复制方向信息。',
        
        // ========== 切断ボックスコピペ ==========
        'manual-sectionbox-copy-title': '剖切框复制粘贴',
        'manual-sectionbox-copy-subtitle': '复制粘贴三维视图剖切框范围',
        'manual-sectionbox-copy-overview': '此功能允许您将三维视图的剖切框范围复制到另一个三维视图。当您想在多个三维视图中使用相同显示范围时，可以省去手动调整剖切框的麻烦。',
        'manual-sectionbox-copy-step1-title': '打开源三维视图',
        'manual-sectionbox-copy-step1-desc': '打开已配置剖切框的三维视图。确认剖切框已启用（属性中"剖切框"选项已选中）。',
        'manual-sectionbox-copy-step2-title': '复制剖切框',
        'manual-sectionbox-copy-step2-desc': '从Revit功能区的"28 Tools"选项卡中点击"剖切框复制"按钮。当前剖切框范围信息将被复制到内存中。',
        'manual-sectionbox-copy-step3-title': '打开目标三维视图',
        'manual-sectionbox-copy-step3-desc': '打开要应用剖切框的另一个三维视图。',
        'manual-sectionbox-copy-step4-title': '粘贴剖切框',
        'manual-sectionbox-copy-step4-desc': '从"28 Tools"选项卡中点击"剖切框粘贴"按钮。复制的剖切框范围将应用到当前三维视图，剖切框将自动启用。',
        'manual-sectionbox-copy-usecase1-title': '逐层三维视图',
        'manual-sectionbox-copy-usecase1-desc': '为每层的三维视图高效设置相同的剖切框范围。',
        'manual-sectionbox-copy-usecase2-title': '详细视图创建',
        'manual-sectionbox-copy-usecase2-desc': '用于以多种设置显示特定范围的详细信息时很有用。',
        'manual-sectionbox-copy-usecase3-title': '比较研究',
        'manual-sectionbox-copy-usecase3-desc': '快速创建具有相同范围但不同显示设置的视图。',
        'manual-sectionbox-copy-tip1': '<strong>检查剖切框：</strong>确认源视图中剖切框已启用。',
        'manual-sectionbox-copy-tip2': '<strong>自动启用：</strong>即使目标视图中剖切框未启用，粘贴时也会自动启用。',
        'manual-sectionbox-copy-tip3': '<strong>坐标系：</strong>剖切框保存在项目坐标系中，因此即使在不同视图中也能准确应用。',
        'manual-sectionbox-copy-note1': '此功能仅适用于三维视图。无法用于二维视图。',
        'manual-sectionbox-copy-note2': '关闭Revit后，复制的剖切框范围信息将丢失。',
        'manual-sectionbox-copy-note3': '仅复制剖切框范围。视图显示设置和视图样板不会被复制。',
        
        // ========== ビューポート位置コピペ ==========
        'manual-viewport-copy-title': '视口位置复制粘贴',
        'manual-viewport-copy-subtitle': '复制粘贴图纸上的视口位置',
        'manual-viewport-copy-overview': '此功能允许您将放置在图纸上的视口位置复制到另一图纸上的相同视口。在跨多个图纸创建统一布局时，可以大幅减少手动调整视口位置的工作量。',
        'manual-viewport-copy-step1-title': '打开源图纸',
        'manual-viewport-copy-step1-desc': '打开要复制视口位置的图纸。',
        'manual-viewport-copy-step2-title': '选择并复制视口',
        'manual-viewport-copy-step2-desc': '选择要复制位置的视口。从Revit功能区的"28 Tools"选项卡中点击"视口位置复制"按钮。',
        'manual-viewport-copy-step3-title': '打开目标图纸',
        'manual-viewport-copy-step3-desc': '打开要应用视口位置的另一图纸。',
        'manual-viewport-copy-step4-title': '选择并粘贴视口',
        'manual-viewport-copy-step4-desc': '选择要更改位置的视口。从"28 Tools"选项卡中点击"视口位置粘贴"按钮。所选视口将移动到复制的位置。',
        'manual-viewport-copy-usecase1-title': '标准图纸布局',
        'manual-viewport-copy-usecase1-desc': '快速实现跨多个图纸的统一视口放置。',
        'manual-viewport-copy-usecase2-title': '平面图统一',
        'manual-viewport-copy-usecase2-desc': '统一各层平面图图纸上的视口位置以提高可读性。',
        'manual-viewport-copy-usecase3-title': '提高工作效率',
        'manual-viewport-copy-usecase3-desc': '大幅减少逐个调整视口位置的工作量。',
        'manual-viewport-copy-tip1': '<strong>图框统一：</strong>源和目标使用相同图框可确保准确再现布局。',
        'manual-viewport-copy-tip2': '<strong>多个视口：</strong>可以通过对每个视口逐个重复复制粘贴来对齐多个视口位置。',
        'manual-viewport-copy-tip3': '<strong>微调：</strong>粘贴后可根据需要进行微调。',
        'manual-viewport-copy-note1': '此功能仅适用于图纸上的视口。无法在视图内使用。',
        'manual-viewport-copy-note2': '仅复制视口位置。视口大小、比例、显示设置等不会被复制。',
        'manual-viewport-copy-note3': '关闭Revit后，复制的位置信息将丢失。',
        
        // ========== トリミング領域コピペ ==========
        'manual-cropbox-copy-title': '裁剪区域复制粘贴',
        'manual-cropbox-copy-subtitle': '复制粘贴视图裁剪区域',
        'manual-cropbox-copy-overview': '此功能允许您将平面图和立面图等视图的裁剪区域（显示范围）复制到另一个视图。当您想在多个视图中使用相同显示范围时，可以省去手动调整裁剪区域的麻烦。',
        'manual-cropbox-copy-step1-title': '打开源视图',
        'manual-cropbox-copy-step1-desc': '打开要复制裁剪区域的视图。确认裁剪区域已启用（属性中"裁剪区域"选项已选中）。',
        'manual-cropbox-copy-step2-title': '复制裁剪区域',
        'manual-cropbox-copy-step2-desc': '从Revit功能区的"28 Tools"选项卡中点击"裁剪区域复制"按钮。当前视图的裁剪区域信息将被复制到内存中。',
        'manual-cropbox-copy-step3-title': '打开目标视图',
        'manual-cropbox-copy-step3-desc': '打开要应用裁剪区域的另一个视图。',
        'manual-cropbox-copy-step4-title': '粘贴裁剪区域',
        'manual-cropbox-copy-step4-desc': '从"28 Tools"选项卡中点击"裁剪区域粘贴"按钮。复制的裁剪区域将应用到当前视图，裁剪区域将自动启用。',
        'manual-cropbox-copy-usecase1-title': '平面图统一',
        'manual-cropbox-copy-usecase1-desc': '为各层平面图高效设置相同的显示范围。',
        'manual-cropbox-copy-usecase2-title': '详细视图创建',
        'manual-cropbox-copy-usecase2-desc': '快速创建具有相同范围但不同显示设置的视图。',
        'manual-cropbox-copy-usecase3-title': '确保一致性',
        'manual-cropbox-copy-usecase3-desc': '在多个视图中保持统一的显示范围。',
        'manual-cropbox-copy-tip1': '<strong>检查裁剪区域：</strong>确认源视图中裁剪区域已启用。',
        'manual-cropbox-copy-tip2': '<strong>自动启用：</strong>即使目标视图中裁剪区域未启用，粘贴时也会自动启用。',
        'manual-cropbox-copy-tip3': '<strong>视图类型：</strong>可用于各种视图类型，如平面图、立面图、剖面图等。',
        'manual-cropbox-copy-note1': '仅复制裁剪区域。视图显示设置和视图样板不会被复制。',
        'manual-cropbox-copy-note2': '关闭Revit后，复制的裁剪区域信息将丢失。',
        'manual-cropbox-copy-note3': '可以在不同视图类型之间复制（例如：平面图到立面图），但可能无法获得预期结果。'
    }
};

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
            // HTMLタグを含む翻訳をサポート
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

// モーダル表示機能
function showModal(type) {
    const currentLang = localStorage.getItem('selectedLanguage') || 'ja';
    const content = modalContents[type][currentLang];
    
    if (!content) return;
    
    const modal = document.createElement('div');
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
    
    setTimeout(() => modal.classList.add('show'), 10);
    
    const closeBtn = modal.querySelector('.modal-close');
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => document.body.removeChild(modal), 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// モーダル初期化関数
function initializeModals() {
    const footerCards = document.querySelectorAll('.footer-card');
    if (footerCards.length > 0) {
        footerCards.forEach(card => {
            card.addEventListener('click', function(e) {
                e.preventDefault();
                const onclick = this.getAttribute('onclick');
                if (onclick) {
                    const match = onclick.match(/showModal\('(\w+)'\)/);
                    if (match) {
                        showModal(match[1]);
                    }
                }
            });
        });
    }
}

// バージョンタブ初期化関数
function initializeVersionTabs() {
    const versionTabs = document.querySelectorAll('.tab');
    if (versionTabs.length > 0) {
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
    console.log('Main.js v6.0 loaded - Full multilingual support');
    
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
