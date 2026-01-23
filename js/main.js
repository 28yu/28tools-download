// ========================================
// 28 Tools Download Center - Main JavaScript
// Version: 6.6 (パスワード保護ダウンロード機能追加)
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
        'revit2024': '', // 将来追加
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
            ja: 'Revit アドイン配布センター',
            en: 'Revit Add-in Distribution Center',
            zh: 'Revit 插件分发中心'
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
            ja: '3Dビューの視点を他のビューにコピー&ペースト',
            en: 'Copy and paste 3D view orientation',
            zh: '将3D视图的视点复制并粘贴'
        },
        'feature-section-title': {
            ja: '切断ボックスコピペ',
            en: 'Section Box Copy & Paste',
            zh: '剖切框复制粘贴'
        },
        'feature-section-desc': {
            ja: '3Dビューの切断ボックス範囲をコピー&ペースト',
            en: 'Copy and paste section box range',
            zh: '复制并粘贴剖切框范围'
        },
        'feature-viewport-title': {
            ja: 'ビューポート位置コピペ',
            en: 'Viewport Position Copy & Paste',
            zh: '视口位置复制粘贴'
        },
        'feature-viewport-desc': {
            ja: 'シート上のビューポート位置をコピー&ペースト',
            en: 'Copy and paste viewport positions',
            zh: '复制并粘贴视口位置'
        },
        'feature-crop-title': {
            ja: 'トリミング領域コピペ',
            en: 'Crop Region Copy & Paste',
            zh: '裁剪区域复制粘贴'
        },
        'feature-crop-desc': {
            ja: 'ビューのトリミング領域をコピー&ペースト',
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
    // モーダル翻訳（インストール手順）
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
        'install-step1-site': {
            ja: 'サイト:',
            en: 'Site:',
            zh: '网站:'
        },
        'install-step1-button': {
            ja: 'ボタン:',
            en: 'Button:',
            zh: '按钮:'
        },
        'install-step1-download': {
            ja: 'Revit 2021 版 をダウンロード',
            en: 'Download Revit 2021 Version',
            zh: '下载 Revit 2021 版本'
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
        'install-step1-size': {
            ja: 'ファイルサイズ:',
            en: 'File Size:',
            zh: '文件大小:'
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
    // モーダル翻訳（サポート情報）
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
            ja: 'A: 各バージョンに対応したパッケージをそれぞれインストールしてください。\n例: Revit 2021 版と Revit 2022 版を同時にインストール可能です',
            en: 'A: Install the package for each version separately.\nExample: You can install both Revit 2021 and 2022 versions',
            zh: 'A: 为每个版本分别安装软件包。\n例如: 可以同时安装 Revit 2021 和 2022 版本'
        },
        'support-contact': {
            ja: 'ご不明な点',
            en: 'Questions',
            zh: '问题'
        },
        'support-contact-desc': {
            ja: 'ご質問やご不明な点がございましたら、以下にお問い合わせください:',
            en: 'If you have questions, please contact us at:',
            zh: '如有任何疑问，请通过以下方式与我们联系:'
        },
        'support-email': {
            ja: 'メール:',
            en: 'Email:',
            zh: '电子邮件:'
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
            zh: '稍后可编辑：'
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
            zh: '稍后可调整：'
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
        translations.cropboxCopy
    );
    
    console.log('📚 Translations initialized (v6.6 - パスワード保護ダウンロード機能追加)');
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
    
    console.log(`✅ Content updated: ${elements.length} elements`);
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

console.log('✅ 28 Tools Download Center - JavaScript loaded successfully (v6.6 - パスワード保護ダウンロード機能追加)');
