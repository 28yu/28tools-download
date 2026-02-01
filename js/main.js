// ========================================
// 28 Tools Download Center - Main JavaScript
// Version: 7.3 (サポート情報・インストール手順の汎用化)
// ========================================

// グローバル変数
let currentLanguage = 'ja';
const translations = {};

// ========================================
// パスワード保護ダウンロード設定
// ========================================

const downloadConfig = {
    // パスワード設定
    password: '28tools',
    
    // ダウンロードURL
    urls: {
        'revit2021': 'https://github.com/28yu/28tools-download/releases/download/v1.0.0-Revit2021/28Tools_Revit2021_v1.0.zip',
        'revit2022': '', // 将来追加
        'revit2023': '', // 将来追加
        'revit2024': 'https://github.com/28yu/28tools-download/releases/download/v1.0.0-Revit2024/28Tools_Revit2024_v1.0.zip',
        'revit2025': '', // 将来追加
        'revit2026': ''  // 将来追加
    },
    
    // 多言語メッセージ
    messages: {
        ja: {
            promptMessage: 'ダウンロードにはパスワードが必要です。\nパスワードを入力してください：',
            invalidPassword: 'パスワードが正しくありません。',
            notAvailable: 'このバージョンはまだ利用できません。',
            downloadStarted: 'ダウンロードを開始します...'
        },
        en: {
            promptMessage: 'Password is required to download.\nPlease enter the password:',
            invalidPassword: 'Invalid password.',
            notAvailable: 'This version is not available yet.',
            downloadStarted: 'Starting download...'
        },
        zh: {
            promptMessage: '下载需要密码。\n请输入密码：',
            invalidPassword: '密码错误。',
            notAvailable: '此版本尚未提供。',
            downloadStarted: '开始下载...'
        }
    }
};

// ========================================
// 1. 初期化処理
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 28 Tools Download Center - Initializing...');
    
    // 共通ヘッダーの読み込み
    loadHeader();
    
    // 言語設定の読み込み
    loadLanguagePreference();
    
    // 翻訳データの初期化
    initTranslations();
    
    // イベントリスナーの設定
    initEventListeners();
    
    // ページ固有の初期化
    initPageSpecific();
    
    // モーダルボタンの初期化
    setupModalButtons();
    
    // ダウンロードボタンの初期化
    setupDownloadButtons();
    
    console.log('✅ Initialization complete');
});

// ========================================
// 2. 共通ヘッダー読み込み
// ========================================

async function loadHeader() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) {
        console.warn('⚠️ Header container not found');
        return;
    }

    try {
        // パス解決（マニュアルページ対応）
        const isManualPage = document.body.classList.contains('manual-page');
        const headerPath = isManualPage ? '../includes/header.html' : 'includes/header.html';
        
        console.log(`📄 Loading header from: ${headerPath}`);
        
        const response = await fetch(headerPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const headerHTML = await response.text();
        headerContainer.innerHTML = headerHTML;
        
        console.log('✅ Header loaded successfully');
        
        // ヘッダー読み込み後の初期化
        initLanguageSwitcher();
        updateAllContent();
        
    } catch (error) {
        console.error('❌ Error loading header:', error);
        headerContainer.innerHTML = '<p style="color: red;">ヘッダーの読み込みに失敗しました</p>';
    }
}

// ========================================
// 3. 言語設定管理
// ========================================

function loadLanguagePreference() {
    const savedLang = localStorage.getItem('28tools-language');
    if (savedLang && ['ja', 'en', 'zh'].includes(savedLang)) {
        currentLanguage = savedLang;
        console.log(`🌐 Language preference loaded: ${currentLanguage}`);
    } else {
        currentLanguage = 'ja';
        console.log('🌐 Using default language: ja');
    }
}

function saveLanguagePreference(lang) {
    localStorage.setItem('28tools-language', lang);
    console.log(`💾 Language preference saved: ${lang}`);
}

// ========================================
// 4. 言語切り替え機能
// ========================================

function initLanguageSwitcher() {
    const langBtn = document.getElementById('lang-btn');
    const langDropdown = document.getElementById('lang-dropdown');
    
    if (!langBtn || !langDropdown) {
        console.warn('⚠️ Language switcher elements not found');
        return;
    }

    // ドロップダウン表示/非表示
    langBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        langDropdown.classList.toggle('show');
    });

    // 言語選択
    const langOptions = langDropdown.querySelectorAll('.lang-option');
    langOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const selectedLang = this.dataset.lang;
            changeLanguage(selectedLang);
            langDropdown.classList.remove('show');
        });
    });

    // 外部クリックでドロップダウンを閉じる
    document.addEventListener('click', function() {
        langDropdown.classList.remove('show');
    });

    // 現在の言語を表示
    updateLanguageButton();
}

function updateLanguageButton() {
    const langBtn = document.getElementById('lang-btn');
    if (!langBtn) return;

    const langMap = {
        'ja': { text: 'JP', flag: '🇯🇵' },
        'en': { text: 'US', flag: '🇺🇸' },
        'zh': { text: 'CN', flag: '🇨🇳' }
    };

    const lang = langMap[currentLanguage];
    langBtn.innerHTML = `
        <span class="lang-text">${lang.text}</span>
        <span class="flag-emoji">${lang.flag}</span>
        <span class="arrow">▼</span>
    `;
}

function changeLanguage(lang) {
    if (currentLanguage === lang) return;
    
    console.log(`🌐 Changing language: ${currentLanguage} → ${lang}`);
    currentLanguage = lang;
    saveLanguagePreference(lang);
    updateLanguageButton();
    updateAllContent();
}

// ========================================
// 5. 翻訳データ定義
// ========================================

function initTranslations() {
    // 共通翻訳
    translations.common = {
        'site-title': {
            ja: '28 Tools',
            en: '28 Tools',
            zh: '28 Tools'
        },
        'site-subtitle': {
            ja: 'Revit 作図サポートツール',
            en: 'Revit Drafting Support Tools',
            zh: 'Revit 制图支持工具'
        },
        'breadcrumb-home': {
            ja: 'ホーム',
            en: 'Home',
            zh: '主页'
        }
    };

    // セクション共通
    translations.sections = {
        'section-overview': {
            ja: '機能概要',
            en: 'Overview',
            zh: '功能概述'
        },
        'section-usage': {
            ja: '使い方',
            en: 'How to Use',
            zh: '使用方法'
        },
        'section-usecases': {
            ja: '活用シーン',
            en: 'Use Cases',
            zh: '应用场景'
        },
        'section-tips': {
            ja: 'Tips',
            en: 'Tips',
            zh: '小贴士'
        },
        'section-notes': {
            ja: '注意事項',
            en: 'Notes',
            zh: '注意事项'
        },
        'back-to-home': {
            ja: '← ホームに戻る',
            en: '← Back to Home',
            zh: '← 返回主页'
        },
        'image-placeholder-text': {
            ja: '📷 スクリーンショット画像をここに追加予定',
            en: '📷 Screenshot image will be added here',
            zh: '📷 此处将添加截图'
        }
    };

    // ========================================
    // index.html専用翻訳
    // ========================================
    translations.indexPage = {
        'section-features': {
            ja: '機能一覧',
            en: 'Features',
            zh: '功能列表'
        },
        'feature-grid-title': {
            ja: '符号ON/OFF',
            en: 'Grid Bubble ON/OFF',
            zh: '轴号开关'
        },
        'feature-grid-desc': {
            ja: '通り芯・レベルの符号表示を一括切替',
            en: 'Batch toggle grid and level bubble visibility',
            zh: '批量切换轴网和标高符号显示'
        },
        'feature-sheet-title': {
            ja: 'シート一括作成',
            en: 'Batch Sheet Creation',
            zh: '批量创建图纸'
        },
        'feature-sheet-desc': {
            ja: '図枠を指定して複数シートをまとめて作成',
            en: 'Create multiple sheets with specified title blocks',
            zh: '使用指定的标题栏一次创建多个图纸'
        },
        'feature-view-title': {
            ja: '3D視点コピペ',
            en: '3D View Copy & Paste',
            zh: '3D视点复制粘贴'
        },
        'feature-view-desc': {
            ja: '3Dビューの視点を他のビューに反映',
            en: 'Copy and paste 3D view orientation',
            zh: '将3D视图的视点复制并粘贴'
        },
        'feature-section-title': {
            ja: '切断ボックスコピペ',
            en: 'Section Box Copy & Paste',
            zh: '剖切框复制粘贴'
        },
        'feature-section-desc': {
            ja: '3Dビューの切断ボックス範囲を反映',
            en: 'Copy and paste section box range',
            zh: '复制并粘贴剖切框范围'
        },
        'feature-viewport-title': {
            ja: 'ビューポート位置コピペ',
            en: 'Viewport Position Copy & Paste',
            zh: '视口位置复制粘贴'
        },
        'feature-viewport-desc': {
            ja: 'シート上のビューポート位置を反映',
            en: 'Copy and paste viewport positions',
            zh: '复制并粘贴视口位置'
        },
        'feature-crop-title': {
            ja: 'トリミング領域コピペ',
            en: 'Crop Region Copy & Paste',
            zh: '裁剪区域复制粘贴'
        },
        'feature-crop-desc': {
            ja: 'ビューのトリミング領域を反映',
            en: 'Copy and paste crop regions',
            zh: '复制并粘贴裁剪区域'
        },
        'version-title': {
            ja: 'Revitバージョンを選択',
            en: 'Select Revit Version',
            zh: '选择Revit版本'
        },
        'version-2021': {
            ja: 'Revit 2021',
            en: 'Revit 2021',
            zh: 'Revit 2021'
        },
        'version-2022': {
            ja: 'Revit 2022',
            en: 'Revit 2022',
            zh: 'Revit 2022'
        },
        'version-2023': {
            ja: 'Revit 2023',
            en: 'Revit 2023',
            zh: 'Revit 2023'
        },
        'version-2024': {
            ja: 'Revit 2024',
            en: 'Revit 2024',
            zh: 'Revit 2024'
        },
        'version-2025': {
            ja: 'Revit 2025',
            en: 'Revit 2025',
            zh: 'Revit 2025'
        },
        'version-2026': {
            ja: 'Revit 2026',
            en: 'Revit 2026',
            zh: 'Revit 2026'
        },
        'version-status-available': {
            ja: '利用可能',
            en: 'Available',
            zh: '可用'
        },
        'version-status-development': {
            ja: '開発中',
            en: 'In Development',
            zh: '开发中'
        },
        'version-status-planned': {
            ja: '計画中',
            en: 'Planned',
            zh: '计划中'
        },
        'footer-title': {
            ja: 'サポート',
            en: 'Support',
            zh: '支持'
        },
        'footer-install': {
            ja: 'インストール手順',
            en: 'Installation Guide',
            zh: '安装指南'
        },
        'footer-uninstall': {
            ja: 'アンインストール',
            en: 'Uninstall',
            zh: '卸载'
        },
        'footer-support': {
            ja: 'サポート情報',
            en: 'Support',
            zh: '支持信息'
        },
        'modal-close': {
            ja: '閉じる',
            en: 'Close',
            zh: '关闭'
        }
    };

    // ========================================
    // モーダル翻訳（インストール手順）- v7.3で修正
    // ========================================
    translations.installGuide = {
        'modal-install-title': {
            ja: 'インストール手順',
            en: 'Installation Guide',
            zh: '安装指南'
        },
        'install-step1-title': {
            ja: 'ダウンロード',
            en: 'Download',
            zh: '下载'
        },
        'install-step1-button': {
            ja: 'ボタン:',
            en: 'Button:',
            zh: '按钮:'
        },
        'install-step1-download': {
            ja: '対応するバージョンをダウンロード',
            en: 'Download the corresponding version',
            zh: '下载对应的版本'
        },
        'install-step1-save': {
            ja: '保存先:',
            en: 'Save Location:',
            zh: '保存位置:'
        },
        'install-step1-auto': {
            ja: 'フォルダ（自動）',
            en: 'Folder (Automatic)',
            zh: '文件夹（自动）'
        },
        'install-step1-file': {
            ja: 'ファイル:',
            en: 'File:',
            zh: '文件:'
        },
        'install-step2-title': {
            ja: '解凍',
            en: 'Extract',
            zh: '解压'
        },
        'install-step2-action': {
            ja: 'ZIP ファイルをダブルクリック',
            en: 'Double-click the ZIP file',
            zh: '双击 ZIP 文件'
        },
        'install-step2-action2': {
            ja: '右クリック → 「すべて展開」',
            en: 'Right-click → "Extract All"',
            zh: '右键点击 → "全部提取"'
        },
        'install-step2-folder': {
            ja: '自動的にフォルダが生成:',
            en: 'Folder is automatically generated:',
            zh: '自动生成文件夹:'
        },
        'install-step3-title': {
            ja: 'インストール',
            en: 'Install',
            zh: '安装'
        },
        'install-step3-action': {
            ja: 'install.bat を右クリック',
            en: 'Right-click install.bat',
            zh: '右键点击 install.bat'
        },
        'install-step3-admin': {
            ja: '「管理者として実行」を選択',
            en: 'Select "Run as administrator"',
            zh: '选择"以管理员身份运行"'
        },
        'install-step3-follow': {
            ja: '画面に従ってインストール完了',
            en: 'Follow on-screen instructions to complete',
            zh: '按照屏幕上的说明完成安装'
        },
        'install-step3-location': {
            ja: 'ファイルが以下に配置される:',
            en: 'Files are placed in:',
            zh: '文件放置在:'
        },
        'install-step3-required': {
            ja: '必須',
            en: 'Required',
            zh: '必需'
        },
        'install-step4-title': {
            ja: '動作確認',
            en: 'Verification',
            zh: '验证'
        },
        'install-step4-launch': {
            ja: 'Revit を起動',
            en: 'Launch Revit',
            zh: '启动 Revit'
        },
        'install-step4-ribbon': {
            ja: 'リボンに「28 Tools」タブが表示',
            en: '"28 Tools" tab appears in ribbon',
            zh: '功能区中显示"28 Tools"选项卡'
        },
        'install-step4-available': {
            ja: '全6機能が利用可能',
            en: 'All 6 features available',
            zh: '所有 6 个功能都可用'
        },
        'install-step5-title': {
            ja: 'ダウンロードファイルの削除 ✅',
            en: 'Delete Download Files ✅',
            zh: '删除下载文件 ✅'
        },
        'install-step5-zip': {
            ja: '❌ ZIP ファイルを削除:',
            en: '❌ Delete ZIP file:',
            zh: '❌ 删除 ZIP 文件:'
        },
        'install-step5-folder': {
            ja: '❌ 解凍フォルダを削除:',
            en: '❌ Delete extracted folder:',
            zh: '❌ 删除解压文件夹:'
        },
        'install-step5-reason': {
            ja: '理由:',
            en: 'Reason:',
            zh: '原因:'
        },
        'install-step5-reason1': {
            ja: '実際に動作するファイルは Addins フォルダに配置済み',
            en: 'Working files are already placed in Addins folder',
            zh: '实际文件已放置在 Addins 文件夹中'
        },
        'install-step5-reason2': {
            ja: 'これらはインストール用の一時的なファイル',
            en: 'These are temporary installation files',
            zh: '这些是临时安装文件'
        },
        'install-step5-reason3': {
            ja: 'ディスク容量の節約',
            en: 'Save disk space',
            zh: '节省磁盘空间'
        }
    };

    // ========================================
    // モーダル翻訳（アンインストール）
    // ========================================
    translations.uninstallGuide = {
        'modal-uninstall-title': {
            ja: 'アンインストール',
            en: 'Uninstall',
            zh: '卸载'
        },
        'uninstall-step1': {
            ja: '方法 1: 自動アンインストール（推奨）',
            en: 'Method 1: Automatic Uninstall (Recommended)',
            zh: '方法 1: 自动卸载（推荐）'
        },
        'uninstall-step1-desc': {
            ja: 'ダウンロード時に含まれていた uninstall.bat を実行します。',
            en: 'Run the uninstall.bat included in the download.',
            zh: '运行下载中包含的 uninstall.bat。'
        },
        'uninstall-step1-1': {
            ja: 'uninstall.bat を右クリック',
            en: 'Right-click uninstall.bat',
            zh: '右键点击 uninstall.bat'
        },
        'uninstall-step1-2': {
            ja: '「管理者として実行」を選択',
            en: 'Select "Run as administrator"',
            zh: '选择"以管理员身份运行"'
        },
        'uninstall-step1-3': {
            ja: '画面に従ってアンインストール完了',
            en: 'Follow on-screen instructions to complete',
            zh: '按照屏幕上的说明完成卸载'
        },
        'uninstall-step2': {
            ja: '方法 2: 手動削除',
            en: 'Method 2: Manual Deletion',
            zh: '方法 2: 手动删除'
        },
        'uninstall-step2-desc': {
            ja: '以下のフォルダから手動で削除します。',
            en: 'Manually delete from the following folder.',
            zh: '从以下文件夹中手动删除。'
        },
        'uninstall-step2-delete': {
            ja: '以下のファイルを削除:',
            en: 'Delete the following files:',
            zh: '删除以下文件:'
        },
        'uninstall-note': {
            ja: '※ Revit を再起動すると変更が反映されます',
            en: '※ Restart Revit to apply changes',
            zh: '※ 重新启动 Revit 以应用更改'
        }
    };

    // ========================================
    // モーダル翻訳（サポート情報）- v7.3で修正
    // ========================================
    translations.supportInfo = {
        'modal-support-title': {
            ja: 'サポート情報',
            en: 'Support Information',
            zh: '支持信息'
        },
        'support-faq': {
            ja: 'よくある質問',
            en: 'Frequently Asked Questions',
            zh: '常见问题'
        },
        'support-q1': {
            ja: 'Q: インストールがうまくいきません',
            en: 'Q: Installation is not working',
            zh: 'Q: 安装不成功'
        },
        'support-a1': {
            ja: 'A: 以下をご確認ください:\n• install.bat を「管理者として実行」していますか？\n• Revit が起動していないか確認してください\n• ウイルス対策ソフトがブロックしていないか確認してください',
            en: 'A: Please check the following:\n• Are you running install.bat "as administrator"?\n• Make sure Revit is not running\n• Check if antivirus software is blocking it',
            zh: 'A: 请检查以下内容:\n• 您是否以"管理员身份运行"install.bat？\n• 确保 Revit 未在运行\n• 检查防病毒软件是否正在阻止'
        },
        'support-q2': {
            ja: 'Q: リボンに「28 Tools」が表示されません',
            en: 'Q: "28 Tools" tab does not appear in ribbon',
            zh: 'Q: 功能区中没有显示"28 Tools"选项卡'
        },
        'support-a2': {
            ja: 'A: Revit を再起動してください。それでも表示されない場合は:\n• verify.bat を実行して診断してください\n• インストール手順を再度実施してください',
            en: 'A: Restart Revit. If it still does not appear:\n• Run verify.bat to diagnose\n• Re-run the installation steps',
            zh: 'A: 重新启动 Revit。如果仍未显示:\n• 运行 verify.bat 进行诊断\n• 重新执行安装步骤'
        },
        'support-q3': {
            ja: 'Q: 複数のRevitバージョンを使用しています',
            en: 'Q: I use multiple Revit versions',
            zh: 'Q: 我使用多个 Revit 版本'
        },
        'support-a3': {
            ja: 'A: 各バージョンに対応したパッケージをそれぞれインストールしてください。\n例: Revit 2021 版と Revit 2024 版を同時にインストール可能です',
            en: 'A: Install the package for each version separately.\nExample: You can install both Revit 2021 and 2024 versions',
            zh: 'A: 为每个版本分别安装软件包。\n例如: 可以同时安装 Revit 2021 和 2024 版本'
        },
        'support-contact': {
            ja: 'ご不明な点',
            en: 'Questions',
            zh: '问题'
        },
        'support-contact-form': {
            ja: '今後、問い合わせフォームで対応予定です。',
            en: 'A contact form will be provided in the future.',
            zh: '我们计划在未来提供联系表单。'
        }
    };

    // ========================================
    // grid-bubble.html (符号ON/OFF)
    // ========================================
    translations.gridBubble = {
        'manual-grid-bubble-title': {
            ja: '符号ON/OFF',
            en: 'Grid Bubble ON/OFF',
            zh: '轴号开关'
        },
        'manual-grid-bubble-subtitle': {
            ja: '通り芯・レベルの符号表示を一括切り替え',
            en: 'Batch toggle grid and level bubble visibility',
            zh: '批量切换轴网和标高符号显示'
        },
        'manual-grid-bubble-overview': {
            ja: 'この機能は、ビュー内のすべての通り芯（グリッド）とレベルの符号（バブル）表示を一括でON/OFFできます。左端のみ、両端、右端のみの3パターンから選択可能で、図面の見栄えを素早く調整できます。',
            en: 'This feature allows you to batch toggle the visibility of all grid and level bubbles in a view. You can choose from three patterns: left end only, both ends, or right end only, enabling quick adjustment of drawing appearance.',
            zh: '此功能可以批量切换视图中所有轴网和标高符号的显示。可以从三种模式中选择：仅左端、两端或仅右端，从而快速调整图纸外观。'
        },
        'manual-grid-bubble-step1-title': {
            ja: '対象ビューを開く',
            en: 'Open Target View',
            zh: '打开目标视图'
        },
        'manual-grid-bubble-step1-desc': {
            ja: '符号表示を変更したいビュー（平面図、立面図、断面図など）を開きます。',
            en: 'Open the view (floor plan, elevation, section, etc.) where you want to change bubble visibility.',
            zh: '打开要更改符号显示的视图（平面图、立面图、剖面图等）。'
        },
        'manual-grid-bubble-step2-title': {
            ja: '表示パターンを選択',
            en: 'Select Display Pattern',
            zh: '选择显示模式'
        },
        'manual-grid-bubble-step2-desc': {
            ja: 'Revitリボンの「28 Tools」タブから、希望する表示パターンのボタンをクリックします：',
            en: 'Click the button for your desired display pattern from the "28 Tools" tab in the Revit ribbon:',
            zh: '从Revit功能区的"28 Tools"选项卡中点击所需显示模式的按钮：'
        },
        'manual-grid-bubble-step2-pattern1': {
            ja: '左端符号のみ表示',
            en: 'Show left end bubbles only',
            zh: '仅显示左端符号'
        },
        'manual-grid-bubble-step2-pattern2': {
            ja: '両端符号を表示',
            en: 'Show bubbles on both ends',
            zh: '显示两端符号'
        },
        'manual-grid-bubble-step2-pattern3': {
            ja: '右端符号のみ表示',
            en: 'Show right end bubbles only',
            zh: '仅显示右端符号'
        },
        'manual-grid-bubble-step3-title': {
            ja: '自動適用',
            en: 'Automatic Application',
            zh: '自动应用'
        },
        'manual-grid-bubble-step3-desc': {
            ja: 'ビュー内のすべての通り芯とレベルに、選択したパターンが自動的に適用されます。',
            en: 'The selected pattern is automatically applied to all grids and levels in the view.',
            zh: '所选模式将自动应用于视图中的所有轴网和标高。'
        },
        'manual-grid-bubble-usecase1-title': {
            ja: '図面の整理',
            en: 'Drawing Organization',
            zh: '图纸整理'
        },
        'manual-grid-bubble-usecase1-desc': {
            ja: '必要な情報だけを表示することで、図面を見やすく整理できます。',
            en: 'Organize drawings for better readability by displaying only necessary information.',
            zh: '通过仅显示必要信息来整理图纸，提高可读性。'
        },
        'manual-grid-bubble-usecase2-title': {
            ja: 'プレゼン資料作成',
            en: 'Presentation Material Creation',
            zh: '演示材料制作'
        },
        'manual-grid-bubble-usecase2-desc': {
            ja: 'クライアント向け資料では符号を最小限にして、すっきりした図面を作成できます。',
            en: 'Create clean drawings with minimal bubbles for client-facing materials.',
            zh: '为客户材料创建简洁的图纸，将符号最小化。'
        },
        'manual-grid-bubble-usecase3-title': {
            ja: '作図基準への対応',
            en: 'Compliance with Drawing Standards',
            zh: '符合制图标准'
        },
        'manual-grid-bubble-usecase3-desc': {
            ja: 'プロジェクトごとの作図基準に合わせて、符号表示を統一できます。',
            en: 'Standardize bubble display according to project-specific drawing standards.',
            zh: '根据项目特定的制图标准统一符号显示。'
        },
        'manual-grid-bubble-tip1': {
            ja: '変更は現在のビューにのみ適用されます。他のビューには影響しません。',
            en: 'Changes apply only to the current view and do not affect other views.',
            zh: '更改仅应用于当前视图，不影响其他视图。'
        },
        'manual-grid-bubble-tip1-strong': {
            ja: 'ビュー単位の設定：',
            en: 'View-Specific Settings:',
            zh: '视图特定设置：'
        },
        'manual-grid-bubble-tip2': {
            ja: 'ビューテンプレートと組み合わせることで、複数ビューに同じ設定を効率的に適用できます。',
            en: 'Combine with view templates to efficiently apply the same settings to multiple views.',
            zh: '与视图模板结合使用，可以有效地将相同设置应用于多个视图。'
        },
        'manual-grid-bubble-tip2-strong': {
            ja: 'ビューテンプレート活用：',
            en: 'Use View Templates:',
            zh: '使用视图模板：'
        },
        'manual-grid-bubble-tip3': {
            ja: '元に戻す（Ctrl+Z）で変更を取り消すことができます。',
            en: 'You can undo changes with Undo (Ctrl+Z).',
            zh: '可以使用撤消（Ctrl+Z）来撤消更改。'
        },
        'manual-grid-bubble-tip3-strong': {
            ja: 'やり直しが可能：',
            en: 'Undo Available:',
            zh: '可撤消：'
        },
        'manual-grid-bubble-note1': {
            ja: '3Dビューでは通り芯の符号は表示されないため、この機能は効果がありません。',
            en: 'Grid bubbles are not displayed in 3D views, so this feature has no effect.',
            zh: '轴网符号不会在3D视图中显示，因此此功能无效。'
        },
        'manual-grid-bubble-note2': {
            ja: 'ビューの「切断領域」内にある通り芯とレベルのみが対象となります。',
            en: 'Only grids and levels within the view\'s "Crop Region" are affected.',
            zh: '仅影响视图"裁剪区域"内的轴网和标高。'
        },
        'manual-grid-bubble-note3': {
            ja: '個別に非表示設定した通り芯やレベルには影響しません。',
            en: 'Grids or levels individually set to hidden are not affected.',
            zh: '单独设置为隐藏的轴网或标高不受影响。'
        }
    };

    // ========================================
    // sheet-creation.html (シート一括作成)
    // ========================================
    translations.sheetCreation = {
        'manual-sheet-creation-title': {
            ja: 'シート一括作成',
            en: 'Batch Sheet Creation',
            zh: '批量创建图纸'
        },
        'manual-sheet-creation-subtitle': {
            ja: '図枠を指定して複数シートをまとめて作成',
            en: 'Create multiple sheets at once with specified title blocks',
            zh: '使用指定的标题栏一次创建多个图纸'
        },
        'manual-sheet-creation-overview': {
            ja: 'この機能は、同じ図枠を使用する複数のシートを一度に作成できます。シート番号とシート名をリスト形式で入力することで、従来の繰り返し作業を大幅に削減できます。',
            en: 'This feature allows you to create multiple sheets with the same title block at once. By entering sheet numbers and names in a list format, you can significantly reduce repetitive tasks.',
            zh: '此功能允许您一次使用相同的标题栏创建多个图纸。通过以列表格式输入图纸编号和名称，可以显著减少重复性工作。'
        },
        'manual-sheet-creation-step1-title': {
            ja: 'シート一括作成を起動',
            en: 'Launch Batch Sheet Creation',
            zh: '启动批量创建图纸'
        },
        'manual-sheet-creation-step1-desc': {
            ja: 'Revitリボンの「28 Tools」タブから「シート一括作成」ボタンをクリックします。',
            en: 'Click the "Batch Sheet Creation" button from the "28 Tools" tab in the Revit ribbon.',
            zh: '从Revit功能区的"28 Tools"选项卡中点击"批量创建图纸"按钮。'
        },
        'manual-sheet-creation-step2-title': {
            ja: '図枠を選択',
            en: 'Select Title Block',
            zh: '选择标题栏'
        },
        'manual-sheet-creation-step2-desc': {
            ja: 'ダイアログが表示されたら、使用したい図枠をドロップダウンリストから選択します。',
            en: 'When the dialog appears, select the title block you want to use from the dropdown list.',
            zh: '当对话框出现时，从下拉列表中选择要使用的标题栏。'
        },
        'manual-sheet-creation-step3-title': {
            ja: 'シート情報を入力',
            en: 'Enter Sheet Information',
            zh: '输入图纸信息'
        },
        'manual-sheet-creation-step3-desc': {
            ja: 'テキストボックスに、シート番号とシート名を1行ずつ入力します。',
            en: 'Enter sheet numbers and sheet names in the text box, one per line.',
            zh: '在文本框中输入图纸编号和图纸名称，每行一个。'
        },
        'manual-sheet-creation-step3-format': {
            ja: '入力形式：シート番号<Tab>シート名',
            en: 'Format: SheetNumber<Tab>SheetName',
            zh: '格式：图纸编号<Tab>图纸名称'
        },
        'manual-sheet-creation-step3-example': {
            ja: '例：',
            en: 'Example:',
            zh: '示例：'
        },
        'manual-sheet-creation-step4-title': {
            ja: 'シートを作成',
            en: 'Create Sheets',
            zh: '创建图纸'
        },
        'manual-sheet-creation-step4-desc': {
            ja: '「作成」ボタンをクリックすると、入力したすべてのシートが一括で作成されます。',
            en: 'Click the "Create" button to create all entered sheets at once.',
            zh: '点击"创建"按钮一次创建所有输入的图纸。'
        },
        'manual-sheet-creation-usecase1-title': {
            ja: '新規プロジェクト立ち上げ',
            en: 'New Project Setup',
            zh: '新项目启动'
        },
        'manual-sheet-creation-usecase1-desc': {
            ja: 'プロジェクト開始時に必要なシートをまとめて作成できます。',
            en: 'Create all necessary sheets at once when starting a project.',
            zh: '在项目开始时一次创建所有必要的图纸。'
        },
        'manual-sheet-creation-usecase2-title': {
            ja: '図面リスト更新',
            en: 'Drawing List Updates',
            zh: '图纸列表更新'
        },
        'manual-sheet-creation-usecase2-desc': {
            ja: 'Excelなどで管理している図面リストから、シート情報をコピー＆ペーストして効率的に作成できます。',
            en: 'Efficiently create sheets by copying and pasting sheet information from drawing lists managed in Excel.',
            zh: '通过从Excel等管理的图纸列表中复制和粘贴图纸信息来高效创建图纸。'
        },
        'manual-sheet-creation-usecase3-title': {
            ja: '時間短縮',
            en: 'Time Saving',
            zh: '节省时间'
        },
        'manual-sheet-creation-usecase3-desc': {
            ja: '1枚ずつシートを作成する手間を省き、作業時間を大幅に短縮できます。',
            en: 'Save significant time by eliminating the need to create sheets one by one.',
            zh: '通过消除逐个创建图纸的需要来大幅节省时间。'
        },
        'manual-sheet-creation-tip1': {
            ja: 'Excelで図面リストを作成し、番号と名前をコピーして貼り付けると効率的です。',
            en: 'Create a drawing list in Excel and copy-paste numbers and names for efficiency.',
            zh: '在Excel中创建图纸列表并复制粘贴编号和名称以提高效率。'
        },
        'manual-sheet-creation-tip1-strong': {
            ja: 'Excel連携：',
            en: 'Excel Integration:',
            zh: 'Excel集成：'
        },
        'manual-sheet-creation-tip2': {
            ja: 'シート番号は必ずプロジェクト内で一意である必要があります。',
            en: 'Sheet numbers must be unique within the project.',
            zh: '图纸编号必须在项目中唯一。'
        },
        'manual-sheet-creation-tip2-strong': {
            ja: '重複チェック：',
            en: 'Duplicate Check:',
            zh: '重复检查：'
        },
        'manual-sheet-creation-tip3': {
            ja: '作成後のシートは、通常のシートと同様に編集・削除が可能です。',
            en: 'Created sheets can be edited and deleted like regular sheets.',
            zh: '创建的图纸可以像常规图纸一样进行编辑和删除。'
        },
        'manual-sheet-creation-tip3-strong': {
            ja: '後から編集可能：',
            en: 'Editable Later:',
            zh: '稀后可编辑：'
        },
        'manual-sheet-creation-note1': {
            ja: 'シート番号が既に存在する場合、そのシートはスキップされます。',
            en: 'If a sheet number already exists, that sheet will be skipped.',
            zh: '如果图纸编号已存在，则该图纸将被跳过。'
        },
        'manual-sheet-creation-note2': {
            ja: 'シート番号とシート名の間は必ずタブ文字で区切ってください。スペースでは正しく認識されません。',
            en: 'Sheet numbers and names must be separated by a tab character. Spaces will not be recognized correctly.',
            zh: '图纸编号和名称必须用制表符分隔。空格将无法正确识别。'
        },
        'manual-sheet-creation-note3': {
            ja: '大量のシートを一度に作成すると、処理に時間がかかる場合があります。',
            en: 'Creating a large number of sheets at once may take some time to process.',
            zh: '一次创建大量图纸可能需要一些时间来处理。'
        }
    };

    // ========================================
    // view-copy.html (3D視点コピペ)
    // ========================================
    translations.viewCopy = {
        'manual-view-copy-title': {
            ja: '3D視点コピペ',
            en: '3D View Copy & Paste',
            zh: '3D视点复制粘贴'
        },
        'manual-view-copy-subtitle': {
            ja: '3Dビューの視点を他のビューにコピー＆ペースト',
            en: 'Copy and paste 3D view orientation to other views',
            zh: '将3D视图的视点复制并粘贴到其他视图'
        },
        'manual-view-copy-overview': {
            ja: 'この機能は、ある3Dビューのカメラ視点（カメラ位置・向き・ズーム）を別の3Dビューにコピーできます。複数の3Dビューで同じ視点を使いたい場合に、手動で調整する手間を省くことができます。',
            en: 'This feature allows you to copy the camera orientation (position, direction, and zoom) from one 3D view to another. It saves you the effort of manually adjusting when you want to use the same viewpoint across multiple 3D views.',
            zh: '此功能可以将一个3D视图的摄像机视点（位置、方向和缩放）复制到另一个3D视图。当您想在多个3D视图中使用相同的视点时，可以省去手动调整的麻烦。'
        },
        'manual-view-copy-step1-title': {
            ja: 'コピー元の3Dビューを開く',
            en: 'Open the Source 3D View',
            zh: '打开源3D视图'
        },
        'manual-view-copy-step1-desc': {
            ja: '視点をコピーしたい3Dビューを開き、希望の視点に調整します。',
            en: 'Open the 3D view from which you want to copy the viewpoint and adjust it to the desired orientation.',
            zh: '打开要复制视点的3D视图，并调整到所需的视点。'
        },
        'manual-view-copy-step2-title': {
            ja: '視点をコピー',
            en: 'Copy the Viewpoint',
            zh: '复制视点'
        },
        'manual-view-copy-step2-desc': {
            ja: 'Revitリボンの「28 Tools」タブから「視点コピー」ボタンをクリックします。現在の3Dビューの視点情報がメモリにコピーされます。',
            en: 'Click the "Copy View" button from the "28 Tools" tab in the Revit ribbon. The viewpoint information of the current 3D view will be copied to memory.',
            zh: '从Revit功能区的"28 Tools"选项卡中点击"视点复制"按钮。当前3D视图的视点信息将被复制到内存中。'
        },
        'manual-view-copy-step3-title': {
            ja: 'ペースト先の3Dビューを開く',
            en: 'Open the Target 3D View',
            zh: '打开目标3D视图'
        },
        'manual-view-copy-step3-desc': {
            ja: '視点を適用したい別の3Dビューを開きます。',
            en: 'Open another 3D view where you want to apply the viewpoint.',
            zh: '打开要应用视点的另一个3D视图。'
        },
        'manual-view-copy-step4-title': {
            ja: '視点をペースト',
            en: 'Paste the Viewpoint',
            zh: '粘贴视点'
        },
        'manual-view-copy-step4-desc': {
            ja: '「28 Tools」タブから「視点ペースト」ボタンをクリックします。コピーした視点が現在の3Dビューに適用されます。',
            en: 'Click the "Paste View" button from the "28 Tools" tab. The copied viewpoint will be applied to the current 3D view.',
            zh: '从"28 Tools"选项卡中点击"视点粘贴"按钮。复制的视点将应用于当前3D视图。'
        },
        'manual-view-copy-usecase1-title': {
            ja: '一貫した視点の設定',
            en: 'Consistent View Settings',
            zh: '设置一致的视点'
        },
        'manual-view-copy-usecase1-desc': {
            ja: '複数の3Dビューで同じ視点を使用することで、図面の一貫性を保てます。',
            en: 'Maintain drawing consistency by using the same viewpoint across multiple 3D views.',
            zh: '通过在多个3D视图中使用相同的视点来保持图纸的一致性。'
        },
        'manual-view-copy-usecase2-title': {
            ja: '段階ビューの作成',
            en: 'Creating Phase Views',
            zh: '创建阶段视图'
        },
        'manual-view-copy-usecase2-desc': {
            ja: '同じ視点で要素表示を変えた複数のビューを効率的に作成できます。',
            en: 'Efficiently create multiple views with different element visibility from the same viewpoint.',
            zh: '从相同视点高效创建具有不同元素显示的多个视图。'
        },
        'manual-view-copy-usecase3-title': {
            ja: '時間短縮',
            en: 'Time Saving',
            zh: '节省时间'
        },
        'manual-view-copy-usecase3-desc': {
            ja: '3Dビューの視点調整を何度も繰り返す必要がなくなります。',
            en: 'Eliminate the need to repeatedly adjust 3D view orientations.',
            zh: '无需反复调整3D视图的视点。'
        },
        'manual-view-copy-tip1': {
            ja: '透視図とアイソメトリックビューでも視点のコピーが可能です。',
            en: 'Viewpoint copying is also possible with perspective and isometric views.',
            zh: '透视图和等轴测视图也可以进行视点复制。'
        },
        'manual-view-copy-tip1-strong': {
            ja: '透視図とアイソメトリック：',
            en: 'Perspective and Isometric:',
            zh: '透视图和等轴测：'
        },
        'manual-view-copy-tip2': {
            ja: 'よく使う視点をテンプレートとして保存するビューを作成しておくと便利です。',
            en: 'It is useful to create views that save frequently used viewpoints as templates.',
            zh: '创建将常用视点保存为模板的视图很有用。'
        },
        'manual-view-copy-tip2-strong': {
            ja: 'テンプレートビュー作成：',
            en: 'Create Template Views:',
            zh: '创建模板视图：'
        },
        'manual-view-copy-tip3': {
            ja: '視点だけでなく、ズームレベルもコピーされます。',
            en: 'Not only the viewpoint but also the zoom level is copied.',
            zh: '不仅复制视点，还复制缩放级别。'
        },
        'manual-view-copy-tip3-strong': {
            ja: 'ズームレベル：',
            en: 'Zoom Level:',
            zh: '缩放级别：'
        },
        'manual-view-copy-note1': {
            ja: 'この機能は3Dビュー専用です。平面図や立面図などの2Dビューでは使用できません。',
            en: 'This feature is for 3D views only. It cannot be used with 2D views such as floor plans or elevations.',
            zh: '此功能仅适用于3D视图。不能用于平面图或立面图等2D视图。'
        },
        'manual-view-copy-note2': {
            ja: '視点コピー後にRevitを閉じると、コピーした視点情報は失われます。',
            en: 'If you close Revit after copying a viewpoint, the copied viewpoint information will be lost.',
            zh: '如果在复制视点后关闭Revit，复制的视点信息将丢失。'
        },
        'manual-view-copy-note3': {
            ja: 'ビューテンプレートの設定（表示/グラフィックス設定など）はコピーされません。視点情報のみがコピーされます。',
            en: 'View template settings (such as Visibility/Graphics settings) are not copied. Only viewpoint information is copied.',
            zh: '不会复制视图模板设置（如可见性/图形设置）。仅复制视点信息。'
        }
    };

    // ========================================
    // sectionbox-copy.html (切断ボックスコピペ)
    // ========================================
    translations.sectionboxCopy = {
        'manual-sectionbox-copy-title': {
            ja: '切断ボックスコピペ',
            en: 'Section Box Copy & Paste',
            zh: '剖切框复制粘贴'
        },
        'manual-sectionbox-copy-subtitle': {
            ja: '3Dビューの切断ボックス範囲をコピー＆ペースト',
            en: 'Copy and paste 3D view section box range',
            zh: '复制并粘贴3D视图的剖切框范围'
        },
        'manual-sectionbox-copy-overview': {
            ja: 'この機能は、3Dビューで設定した切断ボックス（Section Box）の範囲を別の3Dビューにコピーできます。複数の3Dビューで同じ範囲を切り出したい場合に、手動で調整する手間を省くことができます。',
            en: 'This feature allows you to copy the section box range set in a 3D view to another 3D view. It saves you the effort of manual adjustment when you want to use the same cutout range across multiple 3D views.',
            zh: '此功能可以将3D视图中设置的剖切框范围复制到另一个3D视图。当您想在多个3D视图中使用相同的切割范围时，可以省去手动调整的麻烦。'
        },
        'manual-sectionbox-copy-step1-title': {
            ja: 'コピー元の3Dビューを開く',
            en: 'Open the Source 3D View',
            zh: '打开源3D视图'
        },
        'manual-sectionbox-copy-step1-desc': {
            ja: '切断ボックスが設定されている3Dビューを開きます。切断ボックスの範囲を希望通りに調整してください。',
            en: 'Open a 3D view with a section box set. Adjust the section box range as desired.',
            zh: '打开已设置剖切框的3D视图。根据需要调整剖切框范围。'
        },
        'manual-sectionbox-copy-step2-title': {
            ja: '切断ボックスをコピー',
            en: 'Copy the Section Box',
            zh: '复制剖切框'
        },
        'manual-sectionbox-copy-step2-desc': {
            ja: 'Revitリボンの「28 Tools」タブから「切断ボックスコピー」ボタンをクリックします。現在の3Dビューの切断ボックス範囲がメモリにコピーされます。',
            en: 'Click the "Copy Section Box" button from the "28 Tools" tab in the Revit ribbon. The section box range of the current 3D view will be copied to memory.',
            zh: '从Revit功能区的"28 Tools"选项卡中点击"剖切框复制"按钮。当前3D视图的剖切框范围将被复制到内存中。'
        },
        'manual-sectionbox-copy-step3-title': {
            ja: 'ペースト先の3Dビューを開く',
            en: 'Open the Target 3D View',
            zh: '打开目标3D视图'
        },
        'manual-sectionbox-copy-step3-desc': {
            ja: '切断ボックスを適用したい別の3Dビューを開きます。',
            en: 'Open another 3D view where you want to apply the section box.',
            zh: '打开要应用剖切框的另一个3D视图。'
        },
        'manual-sectionbox-copy-step4-title': {
            ja: '切断ボックスをペースト',
            en: 'Paste the Section Box',
            zh: '粘贴剖切框'
        },
        'manual-sectionbox-copy-step4-desc': {
            ja: '「28 Tools」タブから「切断ボックスペースト」ボタンをクリックします。コピーした切断ボックス範囲が現在の3Dビューに適用され、切断ボックスが自動的にONになります。',
            en: 'Click the "Paste Section Box" button from the "28 Tools" tab. The copied section box range will be applied to the current 3D view, and the section box will be automatically turned on.',
            zh: '从"28 Tools"选项卡中点击"剖切框粘贴"按钮。复制的剖切框范围将应用于当前3D视图，剖切框将自动打开。'
        },
        'manual-sectionbox-copy-usecase1-title': {
            ja: '部分詳細図の作成',
            en: 'Creating Partial Detail Views',
            zh: '创建局部详图'
        },
        'manual-sectionbox-copy-usecase1-desc': {
            ja: '建物の特定部分を複数のビューで詳細に表示する際に便利です。',
            en: 'Useful when displaying specific parts of a building in detail across multiple views.',
            zh: '在多个视图中详细显示建筑物的特定部分时很有用。'
        },
        'manual-sectionbox-copy-usecase2-title': {
            ja: 'フロアごとの表示',
            en: 'Floor-by-Floor Display',
            zh: '逐层显示'
        },
        'manual-sectionbox-copy-usecase2-desc': {
            ja: '各階の3Dビューで同じ範囲を切り出すことで、一貫した表現ができます。',
            en: 'Achieve consistent representation by cutting the same range in 3D views of each floor.',
            zh: '通过在每层的3D视图中切割相同范围来实现一致的表现。'
        },
        'manual-sectionbox-copy-usecase3-title': {
            ja: '時間短縮',
            en: 'Time Saving',
            zh: '节省时间'
        },
        'manual-sectionbox-copy-usecase3-desc': {
            ja: '切断ボックスの手動調整を何度も繰り返す必要がなくなります。',
            en: 'Eliminate the need to repeatedly manually adjust section boxes.',
            zh: '无需反复手动调整剖切框。'
        },
        'manual-sectionbox-copy-tip1': {
            ja: '切断ボックスの範囲だけでなく、ON/OFF状態もコピーされます。',
            en: 'Not only the section box range but also the ON/OFF state is copied.',
            zh: '不仅复制剖切框范围，还复制开关状态。'
        },
        'manual-sectionbox-copy-tip1-strong': {
            ja: '状態も保持：',
            en: 'State Preserved:',
            zh: '保留状态：'
        },
        'manual-sectionbox-copy-tip2': {
            ja: 'ペースト後も切断ボックスは手動で調整できます。微調整が必要な場合に便利です。',
            en: 'The section box can still be manually adjusted after pasting. Useful for fine-tuning.',
            zh: '粘贴后仍可手动调整剖切框。对于微调很有用。'
        },
        'manual-sectionbox-copy-tip2-strong': {
            ja: '後から調整可能：',
            en: 'Adjustable Later:',
            zh: '稍后可调整：'
        },
        'manual-sectionbox-copy-tip3': {
            ja: 'コピー元で切断ボックスがOFFの場合、範囲情報のみがコピーされます。',
            en: 'If the section box is OFF in the source, only the range information is copied.',
            zh: '如果源中的剖切框关闭，则仅复制范围信息。'
        },
        'manual-sectionbox-copy-tip3-strong': {
            ja: 'OFF状態での動作：',
            en: 'Behavior When OFF:',
            zh: '关闭时的行为：'
        },
        'manual-sectionbox-copy-note1': {
            ja: 'この機能は3Dビュー専用です。平面図や立面図などの2Dビューでは使用できません。',
            en: 'This feature is for 3D views only. It cannot be used with 2D views such as floor plans or elevations.',
            zh: '此功能仅适用于3D视图。不能用于平面图或立面图等2D视图。'
        },
        'manual-sectionbox-copy-note2': {
            ja: '切断ボックスコピー後にRevitを閉じると、コピーした範囲情報は失われます。',
            en: 'If you close Revit after copying a section box, the copied range information will be lost.',
            zh: '如果在复制剖切框后关闭Revit，复制的范围信息将丢失。'
        },
        'manual-sectionbox-copy-note3': {
            ja: 'ビューテンプレートの設定や表示設定はコピーされません。切断ボックスの範囲情報のみがコピーされます。',
            en: 'View template settings or display settings are not copied. Only the section box range information is copied.',
            zh: '不会复制视图模板设置或显示设置。仅复制剖切框范围信息。'
        }
    };

    // ========================================
    // viewport-position.html (ビューポート位置コピペ)
    // ========================================
    translations.viewportPosition = {
        'manual-viewport-position-title': {
            ja: 'ビューポート位置コピペ',
            en: 'Viewport Position Copy & Paste',
            zh: '视口位置复制粘贴'
        },
        'manual-viewport-position-subtitle': {
            ja: 'シート上のビューポート位置をコピー＆ペースト',
            en: 'Copy and paste viewport positions on sheets',
            zh: '在图纸上复制并粘贴视口位置'
        },
        'manual-viewport-position-overview': {
            ja: 'この機能は、シート上に配置されたビューポートの位置（X座標・Y座標）を別のシートのビューポートにコピーできます。複数のシートで同じレイアウトを使用したい場合に、手動で位置合わせする手間を省くことができます。',
            en: 'This feature allows you to copy the position (X and Y coordinates) of a viewport placed on a sheet to viewports on other sheets. It saves you the effort of manual alignment when you want to use the same layout across multiple sheets.',
            zh: '此功能可以将放置在图纸上的视口位置（X和Y坐标）复制到其他图纸上的视口。当您想在多个图纸上使用相同的布局时，可以省去手动对齐的麻烦。'
        },
        'manual-viewport-position-step1-title': {
            ja: 'コピー元のシートを開く',
            en: 'Open the Source Sheet',
            zh: '打开源图纸'
        },
        'manual-viewport-position-step1-desc': {
            ja: '位置をコピーしたいビューポートが配置されているシートを開きます。',
            en: 'Open the sheet containing the viewport whose position you want to copy.',
            zh: '打开包含要复制位置的视口的图纸。'
        },
        'manual-viewport-position-step2-title': {
            ja: 'ビューポートを選択してコピー',
            en: 'Select and Copy Viewport',
            zh: '选择并复制视口'
        },
        'manual-viewport-position-step2-desc': {
            ja: '対象のビューポートを選択し、Revitリボンの「28 Tools」タブから「ビューポート位置コピー」ボタンをクリックします。ビューポートの位置情報がメモリにコピーされます。',
            en: 'Select the target viewport and click the "Copy Viewport Position" button from the "28 Tools" tab in the Revit ribbon. The viewport position information will be copied to memory.',
            zh: '选择目标视口并从Revit功能区的"28 Tools"选项卡中点击"视口位置复制"按钮。视口位置信息将被复制到内存中。'
        },
        'manual-viewport-position-step3-title': {
            ja: 'ペースト先のシートを開く',
            en: 'Open the Target Sheet',
            zh: '打开目标图纸'
        },
        'manual-viewport-position-step3-desc': {
            ja: '位置を適用したいビューポートが配置されているシートを開きます。',
            en: 'Open the sheet containing the viewport where you want to apply the position.',
            zh: '打开包含要应用位置的视口的图纸。'
        },
        'manual-viewport-position-step4-title': {
            ja: 'ビューポートを選択してペースト',
            en: 'Select and Paste Viewport',
            zh: '选择并粘贴视口'
        },
        'manual-viewport-position-step4-desc': {
            ja: '対象のビューポートを選択し、「28 Tools」タブから「ビューポート位置ペースト」ボタンをクリックします。コピーした位置が選択したビューポートに適用されます。',
            en: 'Select the target viewport and click the "Paste Viewport Position" button from the "28 Tools" tab. The copied position will be applied to the selected viewport.',
            zh: '选择目标视口并从"28 Tools"选项卡中点击"视口位置粘贴"按钮。复制的位置将应用于所选视口。'
        },
        'manual-viewport-position-usecase1-title': {
            ja: 'レイアウトの統一',
            en: 'Layout Standardization',
            zh: '布局标准化'
        },
        'manual-viewport-position-usecase1-desc': {
            ja: '複数のシートで同じレイアウトを使用することで、図面セットの統一感を保てます。',
            en: 'Maintain consistency across drawing sets by using the same layout on multiple sheets.',
            zh: '通过在多个图纸上使用相同的布局来保持图纸集的一致性。'
        },
        'manual-viewport-position-usecase2-title': {
            ja: 'シリーズ図面の作成',
            en: 'Creating Series Drawings',
            zh: '创建系列图纸'
        },
        'manual-viewport-position-usecase2-desc': {
            ja: '各階平面図など、同じレイアウトで内容が異なる図面を効率的に作成できます。',
            en: 'Efficiently create drawings with the same layout but different content, such as floor plans for each level.',
            zh: '高效创建具有相同布局但内容不同的图纸，例如每层的平面图。'
        },
        'manual-viewport-position-usecase3-title': {
            ja: '時間短縮',
            en: 'Time Saving',
            zh: '节省时间'
        },
        'manual-viewport-position-usecase3-desc': {
            ja: 'ビューポートの位置調整を手動で繰り返す必要がなくなります。',
            en: 'Eliminate the need to repeatedly manually adjust viewport positions.',
            zh: '无需反复手动调整视口位置。'
        },
        'manual-viewport-position-tip1': {
            ja: 'シート上の図枠の基準点からの相対位置がコピーされます。',
            en: 'The relative position from the title block reference point on the sheet is copied.',
            zh: '复制从图纸上标题栏参考点的相对位置。'
        },
        'manual-viewport-position-tip1-strong': {
            ja: '相対位置：',
            en: 'Relative Position:',
            zh: '相对位置：'
        },
        'manual-viewport-position-tip2': {
            ja: '異なるサイズの図枠間でもコピー可能ですが、位置がずれる場合があります。',
            en: 'Copying is possible between different title block sizes, but positions may shift.',
            zh: '可以在不同大小的标题栏之间进行复制，但位置可能会偏移。'
        },
        'manual-viewport-position-tip2-strong': {
            ja: '図枠サイズの違い：',
            en: 'Title Block Size Differences:',
            zh: '标题栏大小差异：'
        },
        'manual-viewport-position-tip3': {
            ja: 'ビューポートのサイズや回転角度はコピーされません。位置情報のみが対象です。',
            en: 'Viewport size and rotation angle are not copied. Only position information is transferred.',
            zh: '不会复制视口大小和旋转角度。仅传输位置信息。'
        },
        'manual-viewport-position-tip3-strong': {
            ja: '位置のみ：',
            en: 'Position Only:',
            zh: '仅位置：'
        },
        'manual-viewport-position-note1': {
            ja: 'この機能はシート上のビューポート専用です。ビュー内では使用できません。',
            en: 'This feature is for viewports on sheets only. It cannot be used within views.',
            zh: '此功能仅适用于图纸上的视口。不能在视图中使用。'
        },
        'manual-viewport-position-note2': {
            ja: 'ビューポート位置コピー後にRevitを閉じると、コピーした位置情報は失われます。',
            en: 'If you close Revit after copying viewport position, the copied position information will be lost.',
            zh: '如果在复制视口位置后关闭Revit，复制的位置信息将丢失。'
        },
        'manual-viewport-position-note3': {
            ja: 'ビューポートが選択されていない状態でペーストしようとすると、エラーメッセージが表示されます。',
            en: 'If you try to paste without selecting a viewport, an error message will be displayed.',
            zh: '如果在未选择视口的情况下尝试粘贴，将显示错误消息。'
        }
    };

    // ========================================
    // cropbox-copy.html (トリミング領域コピペ)
    // ========================================
    translations.cropboxCopy = {
        'manual-cropbox-copy-title': {
            ja: 'トリミング領域コピペ',
            en: 'Crop Region Copy & Paste',
            zh: '裁剪区域复制粘贴'
        },
        'manual-cropbox-copy-subtitle': {
            ja: 'ビューのトリミング領域をコピー＆ペースト',
            en: 'Copy and paste view crop regions',
            zh: '复制并粘贴视图裁剪区域'
        },
        'manual-cropbox-copy-overview': {
            ja: 'この機能は、あるビューで設定したトリミング領域（Crop Region）の範囲と形状を別のビューにコピーできます。複数のビューで同じ範囲を表示したい場合に、手動で調整する手間を省くことができます。',
            en: 'This feature allows you to copy the range and shape of a crop region set in one view to another view. It saves you the effort of manual adjustment when you want to display the same range across multiple views.',
            zh: '此功能可以将一个视图中设置的裁剪区域的范围和形状复制到另一个视图。当您想在多个视图中显示相同的范围时，可以省去手动调整的麻烦。'
        },
        'manual-cropbox-copy-step1-title': {
            ja: 'コピー元のビューを開く',
            en: 'Open the Source View',
            zh: '打开源视图'
        },
        'manual-cropbox-copy-step1-desc': {
            ja: 'トリミング領域をコピーしたいビューを開き、希望の範囲に調整します。トリミング領域が表示されていることを確認してください。',
            en: 'Open the view from which you want to copy the crop region and adjust it to the desired range. Make sure the crop region is visible.',
            zh: '打开要复制裁剪区域的视图，并调整到所需的范围。确保裁剪区域可见。'
        },
        'manual-cropbox-copy-step2-title': {
            ja: 'トリミング領域をコピー',
            en: 'Copy the Crop Region',
            zh: '复制裁剪区域'
        },
        'manual-cropbox-copy-step2-desc': {
            ja: 'Revitリボンの「28 Tools」タブから「トリミング領域コピー」ボタンをクリックします。現在のビューのトリミング領域情報がメモリにコピーされます。',
            en: 'Click the "Copy Crop Region" button from the "28 Tools" tab in the Revit ribbon. The crop region information of the current view will be copied to memory.',
            zh: '从Revit功能区的"28 Tools"选项卡中点击"裁剪区域复制"按钮。当前视图的裁剪区域信息将被复制到内存中。'
        },
        'manual-cropbox-copy-step3-title': {
            ja: 'ペースト先のビューを開く',
            en: 'Open the Target View',
            zh: '打开目标视图'
        },
        'manual-cropbox-copy-step3-desc': {
            ja: 'トリミング領域を適用したい別のビューを開きます。',
            en: 'Open another view where you want to apply the crop region.',
            zh: '打开要应用裁剪区域的另一个视图。'
        },
        'manual-cropbox-copy-step4-title': {
            ja: 'トリミング領域をペースト',
            en: 'Paste the Crop Region',
            zh: '粘贴裁剪区域'
        },
        'manual-cropbox-copy-step4-desc': {
            ja: '「28 Tools」タブから「トリミング領域ペースト」ボタンをクリックします。コピーしたトリミング領域が現在のビューに適用され、トリミング領域が自動的にONになります。',
            en: 'Click the "Paste Crop Region" button from the "28 Tools" tab. The copied crop region will be applied to the current view, and the crop region will be automatically turned on.',
            zh: '从"28 Tools"选项卡中点击"裁剪区域粘贴"按钮。复制的裁剪区域将应用于当前视图，裁剪区域将自动打开。'
        },
        'manual-cropbox-copy-usecase1-title': {
            ja: '整合図面の作成',
            en: 'Creating Coordinated Drawings',
            zh: '创建协调图纸'
        },
        'manual-cropbox-copy-usecase1-desc': {
            ja: '平面図・天井伏図・設備図など、同じ範囲を表示する複数の図面を効率的に作成できます。',
            en: 'Efficiently create multiple drawings displaying the same range, such as floor plans, reflected ceiling plans, and MEP plans.',
            zh: '高效创建显示相同范围的多个图纸，例如平面图、天花板反射图和MEP图。'
        },
        'manual-cropbox-copy-usecase2-title': {
            ja: '詳細図のシリーズ化',
            en: 'Creating Series of Detail Views',
            zh: '创建详图系列'
        },
        'manual-cropbox-copy-usecase2-desc': {
            ja: '同じ範囲で異なる情報を表示する詳細図を複数作成する際に便利です。',
            en: 'Useful when creating multiple detail views displaying different information in the same range.',
            zh: '在创建在相同范围内显示不同信息的多个详图时很有用。'
        },
        'manual-cropbox-copy-usecase3-title': {
            ja: '時間短縮',
            en: 'Time Saving',
            zh: '节省时间'
        },
        'manual-cropbox-copy-usecase3-desc': {
            ja: 'トリミング領域の手動調整を何度も繰り返す必要がなくなります。',
            en: 'Eliminate the need to repeatedly manually adjust crop regions.',
            zh: '无需反复手动调整裁剪区域。'
        },
        'manual-cropbox-copy-tip1': {
            ja: '平面図、立面図、断面図、3Dビューなど、すべてのビュータイプで使用できます。',
            en: 'Can be used with all view types including floor plans, elevations, sections, and 3D views.',
            zh: '可用于所有视图类型，包括平面图、立面图、剖面图和3D视图。'
        },
        'manual-cropbox-copy-tip1-strong': {
            ja: '全ビュータイプ対応：',
            en: 'All View Types Supported:',
            zh: '支持所有视图类型：'
        },
        'manual-cropbox-copy-tip2': {
            ja: 'トリミング領域の形状（矩形・非矩形）もコピーされます。',
            en: 'The crop region shape (rectangular or non-rectangular) is also copied.',
            zh: '裁剪区域形状（矩形或非矩形）也会被复制。'
        },
        'manual-cropbox-copy-tip2-strong': {
            ja: '形状も保持：',
            en: 'Shape Preserved:',
            zh: '保留形状：'
        },
        'manual-cropbox-copy-tip3': {
            ja: 'ペースト後もトリミング領域は手動で調整できます。微調整が必要な場合に便利です。',
            en: 'The crop region can still be manually adjusted after pasting. Useful for fine-tuning.',
            zh: '粘贴后仍可手动调整裁剪区域。对于微调很有用。'
        },
        'manual-cropbox-copy-tip3-strong': {
            ja: '後から調整可能：',
            en: 'Adjustable Later:',
            zh: '稀后可调整：'
        },
        'manual-cropbox-copy-note1': {
            ja: 'コピー元でトリミング領域がOFFの場合でも、範囲情報はコピーされます。',
            en: 'Even if the crop region is OFF in the source, the range information is still copied.',
            zh: '即使源中的裁剪区域关闭，范围信息仍会被复制。'
        },
        'manual-cropbox-copy-note2': {
            ja: 'トリミング領域コピー後にRevitを閉じると、コピーした範囲情報は失われます。',
            en: 'If you close Revit after copying a crop region, the copied range information will be lost.',
            zh: '如果在复制裁剪区域后关闭Revit，复制的范围信息将丢失。'
        },
        'manual-cropbox-copy-note3': {
            ja: 'ビューテンプレートの設定や表示設定はコピーされません。トリミング領域の範囲情報のみがコピーされます。',
            en: 'View template settings or display settings are not copied. Only the crop region range information is copied.',
            zh: '不会复制视图模板设置或显示设置。仅复制裁剪区域范围信息。'
        }
    };

    // ========================================
    // フッターリンク翻訳
    // ========================================
    translations.footerLinks = {
        'footer-about': {
            ja: '運営者情報',
            en: 'About',
            zh: '关于我们'
        },
        'footer-contact': {
            ja: 'お問い合わせ',
            en: 'Contact',
            zh: '联系我们'
        },
        'footer-privacy': {
            ja: 'プライバシーポリシー',
            en: 'Privacy Policy',
            zh: '隐私政策'
        },
        'footer-terms': {
            ja: '利用規約',
            en: 'Terms of Service',
            zh: '使用条款'
        },
        'footer-copyright': {
            ja: '© 2026 28 Tools. All rights reserved.',
            en: '© 2026 28 Tools. All rights reserved.',
            zh: '© 2026 28 Tools. 版权所有。'
        }
    };

    // ========================================
    // プライバシーポリシーページ翻訳
    // ========================================
    translations.privacyPage = {
        'privacy-title': {
            ja: 'プライバシーポリシー',
            en: 'Privacy Policy',
            zh: '隐私政策'
        },
        'privacy-subtitle': {
            ja: '個人情報の取り扱いについて',
            en: 'About Handling of Personal Information',
            zh: '关于个人信息的处理'
        },
        'privacy-section-policy': {
            ja: '基本方針',
            en: 'Basic Policy',
            zh: '基本方针'
        },
        'privacy-policy-text': {
            ja: '28 Tools（以下「当サイト」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。本プライバシーポリシーでは、当サイトにおける情報の収集、利用、保護について説明します。',
            en: '28 Tools ("this site") respects user privacy and strives to protect personal information. This Privacy Policy explains the collection, use, and protection of information on this site.',
            zh: '28 Tools（以下简称"本站"）尊重用户隐私，致力于保护个人信息。本隐私政策说明本站对信息的收集、使用和保护。'
        },
        'privacy-section-collection': {
            ja: '収集する情報',
            en: 'Information We Collect',
            zh: '我们收集的信息'
        },
        'privacy-collection-auto': {
            ja: '自動的に収集される情報',
            en: 'Automatically Collected Information',
            zh: '自动收集的信息'
        },
        'privacy-collection-auto-text': {
            ja: '当サイトでは、Google Analytics を使用してアクセス情報を収集しています。収集される情報には以下が含まれます：',
            en: 'This site uses Google Analytics to collect access information. The information collected includes:',
            zh: '本站使用Google Analytics收集访问信息。收集的信息包括：'
        },
        'privacy-collection-item1': {
            ja: 'IPアドレス（匿名化処理済み）',
            en: 'IP address (anonymized)',
            zh: 'IP地址（已匿名化）'
        },
        'privacy-collection-item2': {
            ja: 'ブラウザの種類とバージョン',
            en: 'Browser type and version',
            zh: '浏览器类型和版本'
        },
        'privacy-collection-item3': {
            ja: 'オペレーティングシステム',
            en: 'Operating system',
            zh: '操作系统'
        },
        'privacy-collection-item4': {
            ja: '参照元URL',
            en: 'Referring URL',
            zh: '引荐来源网址'
        },
        'privacy-collection-item5': {
            ja: '閲覧したページと滞在時間',
            en: 'Pages viewed and time spent',
            zh: '浏览的页面和停留时间'
        },
        'privacy-collection-item6': {
            ja: 'アクセス日時',
            en: 'Access date and time',
            zh: '访问日期和时间'
        },
        'privacy-collection-note': {
            ja: 'これらの情報は統計的な分析のみに使用され、個人を特定することはありません。',
            en: 'This information is used only for statistical analysis and does not identify individuals.',
            zh: '这些信息仅用于统计分析，不会识别个人身份。'
        },
        'privacy-section-cookies': {
            ja: 'Cookieについて',
            en: 'About Cookies',
            zh: '关于Cookie'
        },
        'privacy-cookies-text1': {
            ja: '当サイトでは、ユーザー体験の向上とアクセス解析のためにCookie（クッキー）を使用しています。',
            en: 'This site uses cookies to improve user experience and for access analysis.',
            zh: '本站使用Cookie来改善用户体验和进行访问分析。'
        },
        'privacy-cookies-types': {
            ja: '使用するCookieの種類',
            en: 'Types of Cookies Used',
            zh: '使用的Cookie类型'
        },
        'privacy-cookies-type1': {
            ja: '機能性Cookie：言語設定などのユーザー設定を保存します',
            en: 'Functional Cookies: Store user preferences such as language settings',
            zh: '功能性Cookie：保存语言设置等用户偏好'
        },
        'privacy-cookies-type2': {
            ja: '分析Cookie：Google Analytics によるアクセス解析に使用します',
            en: 'Analytics Cookies: Used for access analysis by Google Analytics',
            zh: '分析Cookie：用于Google Analytics的访问分析'
        },
        'privacy-cookies-type3': {
            ja: '広告Cookie：第三者の広告配信サービスによる広告表示に使用する場合があります',
            en: 'Advertising Cookies: May be used for ad display by third-party advertising services',
            zh: '广告Cookie：可能用于第三方广告服务的广告展示'
        },
        'privacy-cookies-optout': {
            ja: 'Cookieの無効化',
            en: 'Disabling Cookies',
            zh: '禁用Cookie'
        },
        'privacy-cookies-optout-text': {
            ja: 'ブラウザの設定によりCookieを無効にすることができます。ただし、Cookieを無効にすると、当サイトの一部機能が正常に動作しない場合があります。',
            en: 'You can disable cookies through your browser settings. However, disabling cookies may prevent some features of this site from working properly.',
            zh: '您可以通过浏览器设置禁用Cookie。但是，禁用Cookie可能会导致本站的某些功能无法正常工作。'
        },
        'privacy-section-ads': {
            ja: '広告について',
            en: 'About Advertising',
            zh: '关于广告'
        },
        'privacy-ads-text1': {
            ja: '当サイトでは、第三者配信の広告サービス（Google AdSense など）を利用する場合があります。',
            en: 'This site may use third-party advertising services (such as Google AdSense).',
            zh: '本站可能使用第三方广告服务（如Google AdSense）。'
        },
        'privacy-ads-text2': {
            ja: '広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookieを使用することがあります。これにより、ユーザーが当サイトや他のサイトにアクセスした際の情報に基づいて、適切な広告が配信されます。',
            en: 'Advertising providers may use cookies to display ads based on user interests. This allows appropriate ads to be delivered based on information from when users access this site or other sites.',
            zh: '广告提供商可能使用Cookie来展示基于用户兴趣的广告。这使得可以根据用户访问本站或其他网站时的信息来投放适当的广告。'
        },
        'privacy-ads-text3': {
            ja: 'パーソナライズ広告を無効にする場合は、Googleの広告設定から設定を変更できます。',
            en: 'To disable personalized ads, you can change the settings in Google Ad Settings.',
            zh: '如需禁用个性化广告，您可以在Google广告设置中更改设置。'
        },
        'privacy-section-analytics': {
            ja: 'アクセス解析ツール',
            en: 'Analytics Tools',
            zh: '分析工具'
        },
        'privacy-analytics-text1': {
            ja: '当サイトでは、Googleによるアクセス解析ツール「Google Analytics」を使用しています。Google Analytics はCookieを使用してデータを収集しますが、このデータは匿名で収集されており、個人を特定するものではありません。',
            en: 'This site uses Google Analytics, an access analysis tool by Google. Google Analytics uses cookies to collect data, but this data is collected anonymously and does not identify individuals.',
            zh: '本站使用Google提供的访问分析工具"Google Analytics"。Google Analytics使用Cookie收集数据，但这些数据是匿名收集的，不会识别个人身份。'
        },
        'privacy-analytics-text2': {
            ja: 'Google Analytics によるデータ収集を無効にする場合は、Google Analytics オプトアウト アドオンをご利用ください。',
            en: 'To disable data collection by Google Analytics, please use the Google Analytics Opt-out Add-on.',
            zh: '如需禁用Google Analytics的数据收集，请使用Google Analytics选择退出插件。'
        },
        'privacy-analytics-text3': {
            ja: 'Google Analytics の利用規約については、Google Analytics 利用規約をご確認ください。',
            en: 'For Google Analytics Terms of Service, please refer to the Google Analytics Terms of Service.',
            zh: '有关Google Analytics服务条款，请参阅Google Analytics服务条款。'
        },
        'privacy-section-purpose': {
            ja: '情報の利用目的',
            en: 'Purpose of Use',
            zh: '信息使用目的'
        },
        'privacy-purpose-text': {
            ja: '収集した情報は、以下の目的で利用します：',
            en: 'The collected information is used for the following purposes:',
            zh: '收集的信息用于以下目的：'
        },
        'privacy-purpose-item1': {
            ja: 'サイトの利用状況の把握と改善',
            en: 'Understanding and improving site usage',
            zh: '了解和改善网站使用情况'
        },
        'privacy-purpose-item2': {
            ja: 'ユーザー体験の向上',
            en: 'Improving user experience',
            zh: '改善用户体验'
        },
        'privacy-purpose-item3': {
            ja: 'サービスの品質向上',
            en: 'Improving service quality',
            zh: '提高服务质量'
        },
        'privacy-purpose-item4': {
            ja: 'お問い合わせへの対応',
            en: 'Responding to inquiries',
            zh: '回复咨询'
        },
        'privacy-section-thirdparty': {
            ja: '第三者への情報提供',
            en: 'Third-Party Disclosure',
            zh: '向第三方提供信息'
        },
        'privacy-thirdparty-text': {
            ja: '当サイトは、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。ただし、以下の場合は例外とします：',
            en: 'This site will not provide personal information to third parties without user consent, except as required by law. However, the following cases are exceptions:',
            zh: '除法律要求外，本站不会在未经用户同意的情况下向第三方提供个人信息。但以下情况除外：'
        },
        'privacy-thirdparty-item1': {
            ja: '法令に基づく開示請求があった場合',
            en: 'When there is a disclosure request based on law',
            zh: '根据法律要求披露时'
        },
        'privacy-thirdparty-item2': {
            ja: '人の生命、身体または財産の保護のために必要な場合',
            en: 'When necessary to protect life, body, or property',
            zh: '为保护生命、身体或财产所必需时'
        },
        'privacy-thirdparty-item3': {
            ja: '公衆衛生の向上または児童の健全育成に特に必要な場合',
            en: 'When particularly necessary for public health improvement or child development',
            zh: '为改善公共卫生或促进儿童健康成长特别需要时'
        },
        'privacy-section-changes': {
            ja: 'プライバシーポリシーの変更',
            en: 'Changes to Privacy Policy',
            zh: '隐私政策的变更'
        },
        'privacy-changes-text': {
            ja: '当サイトは、必要に応じて本プライバシーポリシーを変更することがあります。変更した場合は、当ページにて公開します。重要な変更がある場合は、サイト上でお知らせします。',
            en: 'This site may change this Privacy Policy as necessary. Changes will be published on this page. Important changes will be announced on the site.',
            zh: '本站可能会根据需要更改本隐私政策。更改将在本页面上公布。重要更改将在网站上公告。'
        },
        'privacy-section-contact': {
            ja: 'お問い合わせ',
            en: 'Contact',
            zh: '联系我们'
        },
        'privacy-contact-text': {
            ja: '本プライバシーポリシーに関するお問い合わせは、お問い合わせページよりご連絡ください。',
            en: 'For inquiries regarding this Privacy Policy, please contact us through the Contact page.',
            zh: '有关本隐私政策的咨询，请通过联系页面与我们联系。'
        },
        'privacy-lastupdate': {
            ja: '最終更新日：2026年1月27日',
            en: 'Last updated: January 27, 2026',
            zh: '最后更新：2026年1月27日'
        }
    };

    // ========================================
    // お問い合わせページ翻訳
    // ========================================
    translations.contactPage = {
        'contact-title': {
            ja: 'お問い合わせ',
            en: 'Contact Us',
            zh: '联系我们'
        },
        'contact-subtitle': {
            ja: 'ご質問・ご要望をお寄せください',
            en: 'Send us your questions and requests',
            zh: '请发送您的问题和请求'
        },
        'contact-section-before': {
            ja: 'お問い合わせの前に',
            en: 'Before Contacting',
            zh: '联系前请注意'
        },
        'contact-before-text': {
            ja: 'お問い合わせの前に、以下のページをご確認ください。よくあるご質問への回答が見つかる場合があります。',
            en: 'Before contacting us, please check the following pages. You may find answers to frequently asked questions.',
            zh: '在联系我们之前，请查看以下页面。您可能会找到常见问题的答案。'
        },
        'contact-link-faq': {
            ja: 'よくある質問（FAQ）',
            en: 'FAQ',
            zh: '常见问题'
        },
        'contact-link-install': {
            ja: 'インストール手順',
            en: 'Installation Guide',
            zh: '安装指南'
        },
        'contact-section-types': {
            ja: 'お問い合わせ種別',
            en: 'Contact Types',
            zh: '联系类型'
        },
        'contact-type-bug': {
            ja: 'バグ報告',
            en: 'Bug Report',
            zh: '错误报告'
        },
        'contact-type-bug-desc': {
            ja: 'ツールの不具合やエラーについてのご報告',
            en: 'Report tool issues or errors',
            zh: '报告工具故障或错误'
        },
        'contact-type-feature': {
            ja: '機能要望',
            en: 'Feature Request',
            zh: '功能请求'
        },
        'contact-type-feature-desc': {
            ja: '新機能や改善のご提案',
            en: 'Suggestions for new features or improvements',
            zh: '新功能或改进建议'
        },
        'contact-type-question': {
            ja: 'ご質問',
            en: 'Question',
            zh: '问题咨询'
        },
        'contact-type-question-desc': {
            ja: '使い方やインストールに関するご質問',
            en: 'Questions about usage or installation',
            zh: '关于使用或安装的问题'
        },
        'contact-type-other': {
            ja: 'その他',
            en: 'Other',
            zh: '其他'
        },
        'contact-type-other-desc': {
            ja: '上記以外のお問い合わせ',
            en: 'Other inquiries',
            zh: '其他咨询'
        },
        'contact-section-form': {
            ja: 'お問い合わせフォーム',
            en: 'Contact Form',
            zh: '联系表单'
        },
        'contact-form-name': {
            ja: 'お名前',
            en: 'Name',
            zh: '姓名'
        },
        'contact-form-email': {
            ja: 'メールアドレス',
            en: 'Email Address',
            zh: '电子邮件'
        },
        'contact-form-category': {
            ja: 'お問い合わせ種別',
            en: 'Inquiry Type',
            zh: '咨询类型'
        },
        'contact-form-select': {
            ja: '選択してください',
            en: 'Please select',
            zh: '请选择'
        },
        'contact-form-option-bug': {
            ja: 'バグ報告',
            en: 'Bug Report',
            zh: '错误报告'
        },
        'contact-form-option-feature': {
            ja: '機能要望',
            en: 'Feature Request',
            zh: '功能请求'
        },
        'contact-form-option-question': {
            ja: 'ご質問',
            en: 'Question',
            zh: '问题咨询'
        },
        'contact-form-option-other': {
            ja: 'その他',
            en: 'Other',
            zh: '其他'
        },
        'contact-form-revit': {
            ja: '使用中のRevitバージョン',
            en: 'Revit Version in Use',
            zh: '使用的Revit版本'
        },
        'contact-form-select-optional': {
            ja: '選択してください（任意）',
            en: 'Please select (optional)',
            zh: '请选择（可选）'
        },
        'contact-form-subject': {
            ja: '件名',
            en: 'Subject',
            zh: '主题'
        },
        'contact-form-message': {
            ja: 'お問い合わせ内容',
            en: 'Message',
            zh: '咨询内容'
        },
        'contact-form-privacy': {
            ja: 'プライバシーポリシーに同意します',
            en: 'I agree to the Privacy Policy',
            zh: '我同意隐私政策'
        },
        'contact-form-submit': {
            ja: '送信する',
            en: 'Submit',
            zh: '提交'
        },
        'contact-success-title': {
            ja: '送信完了',
            en: 'Sent Successfully',
            zh: '发送成功'
        },
        'contact-success-text': {
            ja: 'お問い合わせありがとうございます。内容を確認の上、ご返信いたします。',
            en: 'Thank you for your inquiry. We will review and respond to you.',
            zh: '感谢您的咨询。我们将审核并回复您。'
        },
        'contact-error-title': {
            ja: '送信エラー',
            en: 'Send Error',
            zh: '发送错误'
        },
        'contact-error-text': {
            ja: '送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
            en: 'An error occurred while sending. Please try again later.',
            zh: '发送时发生错误。请稍后再试。'
        },
        'contact-section-response': {
            ja: '回答について',
            en: 'About Response',
            zh: '关于回复'
        },
        'contact-response-text1': {
            ja: '通常、3〜5営業日以内にご返信いたします。',
            en: 'We usually respond within 3-5 business days.',
            zh: '我们通常在3-5个工作日内回复。'
        },
        'contact-response-time': {
            ja: '回答時間：',
            en: 'Response Time:',
            zh: '回复时间：'
        },
        'contact-response-text2': {
            ja: 'バグ報告の場合は、エラーメッセージや再現手順を詳しく記載いただくと、より迅速に対応できます。',
            en: 'For bug reports, including error messages and detailed reproduction steps helps us respond more quickly.',
            zh: '对于错误报告，附上错误消息和详细的重现步骤可以帮助我们更快地回复。'
        },
        'contact-response-details': {
            ja: '詳細情報：',
            en: 'Details:',
            zh: '详细信息：'
        },
        'contact-placeholder-name': {
            ja: '山田 太郎',
            en: 'John Smith',
            zh: '张三'
        },
        'contact-placeholder-subject': {
            ja: 'お問い合わせの件名を入力',
            en: 'Enter the subject of your inquiry',
            zh: '输入咨询主题'
        },
        'contact-placeholder-message': {
            ja: '詳細をご記入ください',
            en: 'Please provide details',
            zh: '请填写详细内容'
        }
    };

    // ========================================
    // 運営者情報ページ翻訳
    // ========================================
    translations.aboutPage = {
        'about-title': {
            ja: '運営者情報',
            en: 'About Us',
            zh: '关于我们'
        },
        'about-subtitle': {
            ja: '28 Tools について',
            en: 'About 28 Tools',
            zh: '关于28 Tools'
        },
        'about-section-site': {
            ja: '当サイトについて',
            en: 'About This Site',
            zh: '关于本站'
        },
        'about-site-text1': {
            ja: '28 Tools は、Autodesk Revit 用のアドインを開発・配布するサイトです。建築・建設業界で働くRevitユーザーの日々の作業効率化を目指し、実用的なツールを提供しています。',
            en: '28 Tools is a site that develops and distributes add-ins for Autodesk Revit. We provide practical tools aimed at improving daily work efficiency for Revit users in the architecture and construction industry.',
            zh: '28 Tools是一个开发和分发Autodesk Revit插件的网站。我们为建筑和建设行业的Revit用户提供实用工具，旨在提高日常工作效率。'
        },
        'about-site-text2': {
            ja: '当サイトで配布するツールは、実際のプロジェクトワークで生まれた課題を解決するために開発されました。シンプルで直感的な操作性を重視し、誰でもすぐに使い始められるツールを目指しています。',
            en: 'The tools distributed on this site were developed to solve challenges that arose in actual project work. We focus on simple and intuitive operation, aiming for tools that anyone can start using immediately.',
            zh: '本站分发的工具是为了解决实际项目工作中出现的问题而开发的。我们注重简单直观的操作，致力于让任何人都能立即开始使用。'
        },
        'about-section-features': {
            ja: '28 Tools の特徴',
            en: 'Features of 28 Tools',
            zh: '28 Tools的特点'
        },
        'about-feature1-title': {
            ja: '実務に即した機能',
            en: 'Practical Features',
            zh: '实用功能'
        },
        'about-feature1-desc': {
            ja: '実際の設計業務で必要とされる機能を厳選して実装しています。',
            en: 'We carefully select and implement features needed in actual design work.',
            zh: '我们精心挑选并实现实际设计工作中所需的功能。'
        },
        'about-feature2-title': {
            ja: 'シンプルな操作',
            en: 'Simple Operation',
            zh: '简单操作'
        },
        'about-feature2-desc': {
            ja: '複雑な設定は不要。ワンクリックで作業を効率化できます。',
            en: 'No complex settings required. Streamline your work with one click.',
            zh: '无需复杂设置。一键即可提高工作效率。'
        },
        'about-feature3-title': {
            ja: '継続的な改善',
            en: 'Continuous Improvement',
            zh: '持续改进'
        },
        'about-feature3-desc': {
            ja: 'ユーザーの声を反映し、定期的にアップデートを行っています。',
            en: 'We regularly update based on user feedback.',
            zh: '我们根据用户反馈定期更新。'
        },
        'about-feature4-title': {
            ja: '多言語対応',
            en: 'Multi-language Support',
            zh: '多语言支持'
        },
        'about-feature4-desc': {
            ja: '日本語・英語・中国語に対応。グローバルに利用できます。',
            en: 'Available in Japanese, English, and Chinese for global use.',
            zh: '支持日语、英语和中文，可在全球使用。'
        },
        'about-section-tools': {
            ja: '提供ツール一覧',
            en: 'Available Tools',
            zh: '可用工具列表'
        },
        'about-tools-intro': {
            ja: '現在、以下の6つのツールを提供しています：',
            en: 'Currently, we provide the following 6 tools:',
            zh: '目前，我们提供以下6个工具：'
        },
        'about-tool1': {
            ja: '符号ON/OFF - 通り芯・レベルの符号表示を一括切替',
            en: 'Grid Bubble ON/OFF - Batch toggle grid and level bubble visibility',
            zh: '轴号开关 - 批量切换轴网和标高符号显示'
        },
        'about-tool2': {
            ja: 'シート一括作成 - 図枠を指定して複数シートをまとめて作成',
            en: 'Batch Sheet Creation - Create multiple sheets with specified title blocks',
            zh: '批量创建图纸 - 使用指定的标题栏一次创建多个图纸'
        },
        'about-tool3': {
            ja: '3D視点コピペ - 3Dビューの視点を他のビューにコピー＆ペースト',
            en: '3D View Copy - Copy and paste 3D view perspectives to other views',
            zh: '3D视点复制 - 将3D视图视角复制并粘贴到其他视图'
        },
        'about-tool4': {
            ja: '切断ボックスコピペ - 3Dビューの切断ボックス範囲をコピー＆ペースト',
            en: 'Section Box Copy - Copy and paste 3D view section box range',
            zh: '剖切框复制 - 复制并粘贴3D视图的剖切框范围'
        },
        'about-tool5': {
            ja: 'ビューポート位置コピペ - シート上のビューポート位置をコピー＆ペースト',
            en: 'Viewport Position Copy - Copy and paste viewport positions on sheets',
            zh: '视口位置复制 - 复制并粘贴图纸上的视口位置'
        },
        'about-tool6': {
            ja: 'トリミング領域コピペ - ビューのトリミング領域をコピー＆ペースト',
            en: 'Crop Region Copy - Copy and paste view crop regions',
            zh: '裁剪区域复制 - 复制并粘贴视图的裁剪区域'
        },
        'about-tools-more': {
            ja: '各ツールの詳細は、ホームページのマニュアルをご参照ください。',
            en: 'For details on each tool, please refer to the manuals on the homepage.',
            zh: '有关每个工具的详细信息，请参阅主页上的手册。'
        },
        'about-section-versions': {
            ja: '対応バージョン',
            en: 'Supported Versions',
            zh: '支持的版本'
        },
        'about-versions-text': {
            ja: '28 Tools は以下の Revit バージョンに対応しています：',
            en: '28 Tools supports the following Revit versions:',
            zh: '28 Tools支持以下Revit版本：'
        },
        'about-versions-legend': {
            ja: '✓ 利用可能 / 🚧 開発中 / ⏳ 計画中',
            en: '✓ Available / 🚧 In Development / ⏳ Planned',
            zh: '✓ 可用 / 🚧 开发中 / ⏳ 计划中'
        },
        'about-section-operator': {
            ja: '運営者',
            en: 'Operator',
            zh: '运营者'
        },
        'about-operator-name': {
            ja: 'サイト名',
            en: 'Site Name',
            zh: '网站名称'
        },
        'about-operator-url': {
            ja: 'URL',
            en: 'URL',
            zh: '网址'
        },
        'about-operator-contact': {
            ja: 'お問い合わせ',
            en: 'Contact',
            zh: '联系方式'
        },
        'about-operator-since': {
            ja: '運営開始',
            en: 'Since',
            zh: '运营开始'
        },
        'about-section-tech': {
            ja: '開発環境',
            en: 'Development Environment',
            zh: '开发环境'
        },
        'about-tech-text1': {
            ja: 'C# (.NET Framework)',
            en: 'C# (.NET Framework)',
            zh: 'C# (.NET Framework)'
        },
        'about-tech-lang': {
            ja: '開発言語：',
            en: 'Language:',
            zh: '开发语言：'
        },
        'about-tech-text2': {
            ja: 'Revit API',
            en: 'Revit API',
            zh: 'Revit API'
        },
        'about-tech-api': {
            ja: '使用API：',
            en: 'API:',
            zh: '使用API：'
        },
        'about-tech-text3': {
            ja: 'GitHub Pages',
            en: 'GitHub Pages',
            zh: 'GitHub Pages'
        },
        'about-tech-hosting': {
            ja: 'ホスティング：',
            en: 'Hosting:',
            zh: '托管：'
        },
        'about-section-disclaimer': {
            ja: '免責事項',
            en: 'Disclaimer',
            zh: '免责声明'
        },
        'about-disclaimer-text': {
            ja: '当サイトで配布するツールは、可能な限り正確な動作を目指していますが、すべての環境での動作を保証するものではありません。ツールの使用により生じた損害について、運営者は一切の責任を負いません。詳しくは利用規約をご確認ください。',
            en: 'The tools distributed on this site aim to operate as accurately as possible, but we do not guarantee operation in all environments. The operator assumes no responsibility for any damages arising from the use of these tools. Please refer to the Terms of Service for details.',
            zh: '本站分发的工具旨在尽可能准确地运行，但我们不保证在所有环境中都能正常工作。运营者对因使用这些工具而产生的任何损害不承担任何责任。详情请参阅使用条款。'
        },
        'about-operator-contact-link': {
            ja: 'お問い合わせフォーム',
            en: 'Contact Form',
            zh: '联系表单'
        },
        'about-operator-since-value': {
            ja: '2026年1月',
            en: 'January 2026',
            zh: '2026年1月'
        }
    };

    // ========================================
    // 利用規約ページ翻訳
    // ========================================
    translations.termsPage = {
        'terms-title': {
            ja: '利用規約',
            en: 'Terms of Service',
            zh: '使用条款'
        },
        'terms-subtitle': {
            ja: 'ご利用の際は必ずお読みください',
            en: 'Please read before use',
            zh: '使用前请务必阅读'
        },
        'terms-section-intro': {
            ja: 'はじめに',
            en: 'Introduction',
            zh: '简介'
        },
        'terms-intro-text': {
            ja: '本利用規約（以下「本規約」）は、28 Tools（以下「当サイト」）が提供するソフトウェア（以下「本ソフトウェア」）の利用条件を定めるものです。ユーザーの皆様（以下「ユーザー」）には、本規約に同意いただいた上で、本ソフトウェアをご利用いただきます。',
            en: 'These Terms of Service ("Terms") set forth the conditions for using the software ("Software") provided by 28 Tools ("this site"). Users ("Users") are required to agree to these Terms before using the Software.',
            zh: '本使用条款（以下简称"本条款"）规定了使用28 Tools（以下简称"本站"）提供的软件（以下简称"本软件"）的条件。用户（以下简称"用户"）在使用本软件前需同意本条款。'
        },
        'terms-section-definition': {
            ja: '第1条（定義）',
            en: 'Article 1 (Definitions)',
            zh: '第1条（定义）'
        },
        'terms-definition-text': {
            ja: '本規約において使用する用語の定義は以下の通りです：',
            en: 'The definitions of terms used in these Terms are as follows:',
            zh: '本条款中使用的术语定义如下：'
        },
        'terms-definition-item1': {
            ja: '「本ソフトウェア」とは、当サイトが配布する Revit アドインプログラムを指します。',
            en: '"Software" refers to the Revit add-in programs distributed by this site.',
            zh: '"本软件"指本站分发的Revit插件程序。'
        },
        'terms-definition-item2': {
            ja: '「ユーザー」とは、本ソフトウェアをダウンロードまたは使用する個人または法人を指します。',
            en: '"User" refers to any individual or entity that downloads or uses the Software.',
            zh: '"用户"指下载或使用本软件的任何个人或实体。'
        },
        'terms-definition-item3': {
            ja: '「当サイト」とは、28 Tools（https://28tools.com）を指します。',
            en: '"This site" refers to 28 Tools (https://28tools.com).',
            zh: '"本站"指28 Tools（https://28tools.com）。'
        },
        'terms-section-license': {
            ja: '第2条（利用許諾）',
            en: 'Article 2 (License)',
            zh: '第2条（使用许可）'
        },
        'terms-license-item1': {
            ja: '当サイトは、ユーザーに対し、本規約に従って本ソフトウェアを使用する非独占的かつ譲渡不能な権利を許諾します。',
            en: 'This site grants Users a non-exclusive, non-transferable right to use the Software in accordance with these Terms.',
            zh: '本站授予用户按照本条款使用本软件的非独占性、不可转让的权利。'
        },
        'terms-license-item2': {
            ja: '本ソフトウェアは、個人使用および商用使用の両方で利用することができます。',
            en: 'The Software may be used for both personal and commercial purposes.',
            zh: '本软件可用于个人和商业用途。'
        },
        'terms-license-item3': {
            ja: '本ソフトウェアの著作権は、当サイトに帰属します。',
            en: 'The copyright of the Software belongs to this site.',
            zh: '本软件的版权归本站所有。'
        },
        'terms-section-prohibited': {
            ja: '第3条（禁止事項）',
            en: 'Article 3 (Prohibited Acts)',
            zh: '第3条（禁止事项）'
        },
        'terms-prohibited-intro': {
            ja: 'ユーザーは、以下の行為を行ってはなりません：',
            en: 'Users shall not engage in the following acts:',
            zh: '用户不得从事以下行为：'
        },
        'terms-prohibited-item1': {
            ja: '本ソフトウェアの逆コンパイル、逆アセンブル、リバースエンジニアリング',
            en: 'Decompiling, disassembling, or reverse engineering the Software',
            zh: '反编译、反汇编或逆向工程本软件'
        },
        'terms-prohibited-item2': {
            ja: '本ソフトウェアの改変、二次的著作物の作成',
            en: 'Modifying the Software or creating derivative works',
            zh: '修改本软件或创建衍生作品'
        },
        'terms-prohibited-item3': {
            ja: '本ソフトウェアの再配布、転売、レンタル',
            en: 'Redistributing, reselling, or renting the Software',
            zh: '再分发、转售或出租本软件'
        },
        'terms-prohibited-item4': {
            ja: '本ソフトウェアを使用した違法行為',
            en: 'Using the Software for illegal activities',
            zh: '使用本软件进行非法活动'
        },
        'terms-prohibited-item5': {
            ja: '当サイトまたは第三者の知的財産権を侵害する行為',
            en: 'Infringing on the intellectual property rights of this site or third parties',
            zh: '侵犯本站或第三方的知识产权'
        },
        'terms-prohibited-item6': {
            ja: '本ソフトウェアのセキュリティ機能の回避または無効化',
            en: 'Circumventing or disabling security features of the Software',
            zh: '规避或禁用本软件的安全功能'
        },
        'terms-section-disclaimer': {
            ja: '第4条（免責事項）',
            en: 'Article 4 (Disclaimer)',
            zh: '第4条（免责声明）'
        },
        'terms-disclaimer-item1': {
            ja: '本ソフトウェアは「現状のまま」で提供されます。当サイトは、本ソフトウェアの品質、性能、特定目的への適合性について、明示または黙示を問わず、いかなる保証も行いません。',
            en: 'The Software is provided "as is." This site makes no warranties, express or implied, regarding the quality, performance, or fitness for a particular purpose of the Software.',
            zh: '本软件按"原样"提供。本站对本软件的质量、性能或特定用途的适用性不作任何明示或暗示的保证。'
        },
        'terms-disclaimer-item2': {
            ja: '本ソフトウェアの使用により生じた直接的、間接的、偶発的、特別、結果的な損害（データの損失、業務の中断、利益の損失を含むがこれに限定されない）について、当サイトは一切の責任を負いません。',
            en: 'This site shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use of the Software (including but not limited to data loss, business interruption, or loss of profits).',
            zh: '本站对因使用本软件而产生的任何直接、间接、偶然、特殊或后果性损害（包括但不限于数据丢失、业务中断或利润损失）不承担任何责任。'
        },
        'terms-disclaimer-item3': {
            ja: 'ユーザーは、本ソフトウェアを使用する前に、必ず重要なデータのバックアップを取ることを推奨します。',
            en: 'Users are strongly recommended to back up important data before using the Software.',
            zh: '强烈建议用户在使用本软件前备份重要数据。'
        },
        'terms-disclaimer-item4': {
            ja: '本ソフトウェアは Autodesk, Inc. とは関係がなく、Autodesk による承認を受けていません。',
            en: 'The Software is not affiliated with Autodesk, Inc. and is not endorsed by Autodesk.',
            zh: '本软件与Autodesk, Inc.无关，未获得Autodesk的认可。'
        },
        'terms-section-support': {
            ja: '第5条（サポート）',
            en: 'Article 5 (Support)',
            zh: '第5条（支持）'
        },
        'terms-support-item1': {
            ja: '当サイトは、本ソフトウェアに関するテクニカルサポートを提供する義務を負いません。',
            en: 'This site is not obligated to provide technical support for the Software.',
            zh: '本站没有义务为本软件提供技术支持。'
        },
        'terms-support-item2': {
            ja: 'ただし、可能な範囲でお問い合わせフォームを通じてサポートを提供する場合があります。',
            en: 'However, support may be provided through the contact form where possible.',
            zh: '但是，在可能的情况下，可能会通过联系表单提供支持。'
        },
        'terms-support-item3': {
            ja: 'サポートの内容、応答時間、品質について、当サイトは保証しません。',
            en: 'This site does not guarantee the content, response time, or quality of support.',
            zh: '本站不保证支持的内容、响应时间或质量。'
        },
        'terms-section-updates': {
            ja: '第6条（アップデート）',
            en: 'Article 6 (Updates)',
            zh: '第6条（更新）'
        },
        'terms-updates-item1': {
            ja: '当サイトは、本ソフトウェアのアップデートを提供することがありますが、その義務を負いません。',
            en: 'This site may provide updates to the Software but is not obligated to do so.',
            zh: '本站可能会提供本软件的更新，但没有义务这样做。'
        },
        'terms-updates-item2': {
            ja: 'アップデートにより、機能の追加、変更、削除が行われる場合があります。',
            en: 'Updates may add, modify, or remove features.',
            zh: '更新可能会添加、修改或删除功能。'
        },
        'terms-updates-item3': {
            ja: 'アップデート版にも本規約が適用されます。',
            en: 'These Terms also apply to updated versions.',
            zh: '本条款也适用于更新版本。'
        },
        'terms-section-ip': {
            ja: '第7条（知的財産権）',
            en: 'Article 7 (Intellectual Property)',
            zh: '第7条（知识产权）'
        },
        'terms-ip-item1': {
            ja: '本ソフトウェアに関するすべての知的財産権（著作権、商標権、特許権等）は、当サイトまたは正当な権利者に帰属します。',
            en: 'All intellectual property rights (copyrights, trademarks, patents, etc.) related to the Software belong to this site or the rightful owners.',
            zh: '与本软件相关的所有知识产权（版权、商标、专利等）归本站或合法权利人所有。'
        },
        'terms-ip-item2': {
            ja: '本規約は、ユーザーに本ソフトウェアの知的財産権を譲渡するものではありません。',
            en: 'These Terms do not transfer any intellectual property rights of the Software to Users.',
            zh: '本条款不向用户转让本软件的任何知识产权。'
        },
        'terms-ip-item3': {
            ja: '「Revit」および「Autodesk」は、Autodesk, Inc. の登録商標です。',
            en: '"Revit" and "Autodesk" are registered trademarks of Autodesk, Inc.',
            zh: '"Revit"和"Autodesk"是Autodesk, Inc.的注册商标。'
        },
        'terms-section-changes': {
            ja: '第8条（規約の変更）',
            en: 'Article 8 (Changes to Terms)',
            zh: '第8条（条款变更）'
        },
        'terms-changes-item1': {
            ja: '当サイトは、必要に応じて本規約を変更することがあります。',
            en: 'This site may change these Terms as necessary.',
            zh: '本站可能会根据需要更改本条款。'
        },
        'terms-changes-item2': {
            ja: '変更後の規約は、当サイトに掲載した時点で効力を生じます。',
            en: 'The revised Terms will take effect when posted on this site.',
            zh: '修订后的条款在本站发布时生效。'
        },
        'terms-changes-item3': {
            ja: '変更後も本ソフトウェアを継続して使用する場合、ユーザーは変更後の規約に同意したものとみなされます。',
            en: 'If Users continue to use the Software after changes, they will be deemed to have agreed to the revised Terms.',
            zh: '如果用户在更改后继续使用本软件，将被视为已同意修订后的条款。'
        },
        'terms-section-law': {
            ja: '第9条（準拠法・管轄）',
            en: 'Article 9 (Governing Law)',
            zh: '第9条（适用法律）'
        },
        'terms-law-item1': {
            ja: '本規約は、日本法に準拠し解釈されます。',
            en: 'These Terms shall be governed by and construed in accordance with the laws of Japan.',
            zh: '本条款受日本法律管辖并按其解释。'
        },
        'terms-law-item2': {
            ja: '本規約に関する紛争については、日本国の裁判所を第一審の専属的合意管轄裁判所とします。',
            en: 'Any disputes relating to these Terms shall be subject to the exclusive jurisdiction of the courts of Japan as the court of first instance.',
            zh: '与本条款相关的任何争议均应以日本法院作为一审专属管辖法院。'
        },
        'terms-section-contact': {
            ja: '第10条（お問い合わせ）',
            en: 'Article 10 (Contact)',
            zh: '第10条（联系方式）'
        },
        'terms-contact-text': {
            ja: '本規約に関するお問い合わせは、お問い合わせフォームよりご連絡ください。',
            en: 'For inquiries regarding these Terms, please contact us through the contact form.',
            zh: '有关本条款的咨询，请通过联系表单与我们联系。'
        },
        'terms-lastupdate': {
            ja: '最終更新日：2026年1月27日',
            en: 'Last updated: January 27, 2026',
            zh: '最后更新：2026年1月27日'
        }
    };

    // 全翻訳をマージ
    Object.assign(translations,
        translations.common,
        translations.sections,
        translations.indexPage,
        translations.installGuide,
        translations.uninstallGuide,
        translations.supportInfo,
        translations.gridBubble,
        translations.sheetCreation,
        translations.viewCopy,
        translations.sectionboxCopy,
        translations.viewportPosition,
        translations.cropboxCopy,
        translations.footerLinks,
        translations.privacyPage,
        translations.contactPage,
        translations.aboutPage,
        translations.termsPage
    );
    
    console.log('📚 Translations initialized (v7.3 - サポート情報・インストール手順の汎用化)');
}

// ========================================
// 6. コンテンツ更新
// ========================================

function updateAllContent() {
    console.log(`🔄 Updating content for language: ${currentLanguage}`);

    // data-lang-key属性を持つすべての要素を更新
    const elements = document.querySelectorAll('[data-lang-key]');
    elements.forEach(element => {
        const key = element.dataset.langKey;
        if (translations[key] && translations[key][currentLanguage]) {
            // strongタグの中身は翻訳しない場合の処理
            if (element.tagName === 'STRONG') {
                element.textContent = translations[key][currentLanguage];
            } else if (element.querySelector('strong')) {
                // strongタグを含むpタグの処理
                const strongKey = element.querySelector('strong').dataset.langKey;
                if (strongKey && translations[strongKey]) {
                    const strongText = translations[strongKey][currentLanguage];
                    const mainText = translations[key][currentLanguage];
                    element.innerHTML = `<strong>${strongText}</strong>${mainText.replace(translations[strongKey]['ja'], '')}`;
                } else {
                    element.textContent = translations[key][currentLanguage];
                }
            } else {
                element.textContent = translations[key][currentLanguage];
            }
        }
    });

    // data-lang-placeholder属性を持つ要素のplaceholderを更新
    const placeholderElements = document.querySelectorAll('[data-lang-placeholder]');
    placeholderElements.forEach(element => {
        const key = element.dataset.langPlaceholder;
        if (translations[key] && translations[key][currentLanguage]) {
            element.placeholder = translations[key][currentLanguage];
        }
    });

    console.log(`✅ Content updated: ${elements.length} elements, ${placeholderElements.length} placeholders`);
}

// ========================================
// 7. イベントリスナー初期化
// ========================================

function initEventListeners() {
    // モーダル関連のイベントリスナーは動的に設定
    console.log('🎯 Event listeners initialized');
}

// ========================================
// 8. ページ固有の初期化
// ========================================

function initPageSpecific() {
    // メインページの場合
    if (document.querySelector('.features-grid')) {
        console.log('📄 Main page detected');
        initMainPage();
    }
    
    // マニュアルページの場合
    if (document.body.classList.contains('manual-page')) {
        console.log('📖 Manual page detected');
        initManualPage();
    }
}

function initMainPage() {
    // バージョンタブの初期化
    initVersionTabs();
}

function initManualPage() {
    // マニュアルページ固有の初期化
    console.log('✅ Manual page initialized');
}

// ========================================
// 9. バージョンタブ機能
// ========================================

function initVersionTabs() {
    const versionTabs = document.querySelectorAll('.version-tab');
    if (versionTabs.length === 0) return;

    versionTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const version = this.dataset.version;
            const isCompleted = this.classList.contains('completed');
            
            if (isCompleted) {
                selectVersion(version, this);
            }
        });
    });
    
    console.log('✅ Version tabs initialized');
}

function selectVersion(version, tabElement) {
    // すべてのタブから選択状態を解除
    document.querySelectorAll('.version-tab').forEach(tab => {
        tab.classList.remove('selected');
    });
    
    // クリックされたタブを選択状態に
    tabElement.classList.add('selected');
    
    console.log(`✅ Version selected: ${version}`);
}

// ========================================
// 10. モーダル機能
// ========================================

function setupModalButtons() {
    // インストール手順ボタン
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal('install-modal');
        });
    }

    // アンインストールボタン
    const uninstallBtn = document.getElementById('uninstall-btn');
    if (uninstallBtn) {
        uninstallBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal('uninstall-modal');
        });
    }

    // サポート情報ボタン
    const supportBtn = document.getElementById('support-btn');
    if (supportBtn) {
        supportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openModal('support-modal');
        });
    }

    // モーダルの外をクリックすると閉じる
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    console.log('✅ Modal buttons initialized');
}

function openModal(modalId) {
    console.log(`🔔 Opening modal: ${modalId}`);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        // モーダル内のコンテンツも翻訳更新
        updateAllContent();
    }
}

function closeModal(modalId) {
    console.log(`🔔 Closing modal: ${modalId}`);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// グローバルに公開（onclick属性用）
window.closeModal = closeModal;

// ========================================
// 11. パスワード保護ダウンロード機能
// ========================================

// ダウンロードメッセージを取得
function getDownloadMessage(key) {
    return downloadConfig.messages[currentLanguage]?.[key] || downloadConfig.messages['ja'][key];
}

// パスワード保護ダウンロード関数
function downloadWithPassword(version) {
    console.log(`📥 Download requested: ${version}`);
    
    const url = downloadConfig.urls[version];
    
    // URLが設定されていない場合
    if (!url) {
        alert(getDownloadMessage('notAvailable'));
        return;
    }
    
    // パスワード入力ダイアログ
    const userPassword = prompt(getDownloadMessage('promptMessage'));
    
    // キャンセルされた場合
    if (userPassword === null) {
        console.log('📥 Download cancelled by user');
        return;
    }
    
    // パスワード検証
    if (userPassword === downloadConfig.password) {
        // 正しいパスワード → ダウンロード開始
        console.log(`✅ Password correct, starting download: ${version}`);
        window.location.href = url;
    } else {
        // 間違ったパスワード
        console.log('❌ Invalid password');
        alert(getDownloadMessage('invalidPassword'));
    }
}

// 準備中メッセージを表示する関数
function showNotAvailableMessage() {
    console.log('⏳ Version not available');
    alert(getDownloadMessage('notAvailable'));
}

// ダウンロードボタンの初期化
function setupDownloadButtons() {
    // すべてのバージョンタブにクリックイベントを追加
    const allVersionTabs = document.querySelectorAll('.version-tab[data-version]');
    
    allVersionTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const version = this.getAttribute('data-version');
            const isCompleted = this.classList.contains('completed');
            
            console.log(`🖱️ Version tab clicked: ${version}, completed: ${isCompleted}`);
            
            if (isCompleted && version) {
                // 完成済み → パスワードダウンロード
                downloadWithPassword(version);
            } else {
                // 準備中 → メッセージ表示
                showNotAvailableMessage();
            }
        });
    });
    
    console.log(`✅ Download buttons initialized: ${allVersionTabs.length} tabs (all versions)`);
}

// グローバルに公開（onclick属性用）
window.downloadWithPassword = downloadWithPassword;
window.showNotAvailableMessage = showNotAvailableMessage;

// ========================================
// 12. ユーティリティ関数
// ========================================

// エラーハンドリング
window.addEventListener('error', function(e) {
    console.error('❌ Global error:', e.error);
});

// デバッグ用
window.debug28Tools = {
    currentLanguage: () => currentLanguage,
    translations: () => translations,
    changeLanguage: (lang) => changeLanguage(lang),
    openModal: (id) => openModal(id),
    closeModal: (id) => closeModal(id),
    downloadConfig: () => downloadConfig,
    downloadWithPassword: (version) => downloadWithPassword(version)
};

console.log('✅ 28 Tools Download Center - JavaScript loaded successfully (v7.3 - サポート情報・インストール手順の汎用化)');
