// ========================================
// 28 Tools Download Center - Main JavaScript
// Version: 7.3 (サポート情報・インストール手順の汎用化)
// ========================================

// グローバル変数
let currentLanguage = 'ja';
window.currentLanguage = currentLanguage; // news.jsから参照できるようにグローバル公開
const translations = {};

// ========================================
// パスワード保護ダウンロード設定
// ========================================

const downloadConfig = {
    // パスワード設定
    password: '28tools',
    
    // ダウンロードURL（GitHub APIから自動取得）
    urls: {},
    
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

// 最新リリースのダウンロードURLを自動取得
fetch('https://api.github.com/repos/28yu/28tools-download/releases/latest')
    .then(res => res.json())
    .then(release => {
        release.assets.forEach(asset => {
            const match = asset.name.match(/28Tools_Revit(\d{4})/);
            if (match) {
                downloadConfig.urls['revit' + match[1]] = asset.browser_download_url;
            }
        });
    })
    .catch(err => console.error('Failed to fetch download URLs:', err));

// ========================================
// 1. 初期化処理
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 28 Tools Download Center - Initializing...');

    // 共通ヘッダーの読み込み
    loadHeader();

    // 共通サイドバーの読み込み
    loadSidebar();

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

    // SNSシェアボタンの初期化
    initSocialShare();

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
// 2.5 共通サイドバー読み込み
// ========================================

async function loadSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) {
        console.warn('⚠️ Sidebar container not found');
        return;
    }

    try {
        // パス解決（マニュアルページ対応）
        const isManualPage = document.body.classList.contains('manual-page');
        const sidebarPath = isManualPage ? '../includes/sidebar.html' : 'includes/sidebar.html';

        console.log(`📄 Loading sidebar from: ${sidebarPath}`);

        const response = await fetch(sidebarPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const sidebarHTML = await response.text();
        sidebarContainer.innerHTML = sidebarHTML;

        console.log('✅ Sidebar loaded successfully');

        // 現在のページに対応するサイドバーアイテムにactiveクラスを追加
        setActiveSidebarItem();

        // サイドバー読み込み後の翻訳更新
        updateAllContent();

    } catch (error) {
        console.error('❌ Error loading sidebar:', error);
        sidebarContainer.innerHTML = '<p style="color: red;">サイドバーの読み込みに失敗しました</p>';
    }
}

function setActiveSidebarItem() {
    const currentPath = window.location.pathname;
    const sidebarItems = document.querySelectorAll('.sidebar-item');

    sidebarItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && currentPath.includes(href.replace('.html', ''))) {
            item.classList.add('active');
        }
    });
}

// ========================================
// 3. 言語設定管理
// ========================================

function loadLanguagePreference() {
    const savedLang = localStorage.getItem('28tools-language');
    if (savedLang && ['ja', 'en', 'zh'].includes(savedLang)) {
        currentLanguage = savedLang;
        window.currentLanguage = savedLang; // グローバル変数も更新
        console.log(`🌐 Language preference loaded: ${currentLanguage}`);
    } else {
        currentLanguage = 'ja';
        window.currentLanguage = 'ja'; // グローバル変数も更新
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

let languageSwitcherInitialized = false;

function initLanguageSwitcher() {
    const langBtn = document.getElementById('lang-btn');
    const langDropdown = document.getElementById('lang-dropdown');

    // 既に初期化済みの場合はスキップ（両方のフラグをチェック）
    if (languageSwitcherInitialized || (langBtn && langBtn._langInitialized)) {
        console.log('🔄 Language switcher already initialized, skipping');
        return;
    }

    if (!langBtn || !langDropdown) {
        console.warn('⚠️ Language switcher elements not found');
        return;
    }

    console.log('🌐 Initializing language switcher');

    // onclickを使用して既存のイベントリスナーを上書き
    langBtn.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('🔘 Language button clicked');
        langDropdown.classList.toggle('show');
    };

    // 言語選択
    const langOptions = langDropdown.querySelectorAll('.lang-option');
    langOptions.forEach(option => {
        option.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const selectedLang = this.dataset.lang;
            console.log('🌐 Language selected:', selectedLang);
            changeLanguage(selectedLang);
            langDropdown.classList.remove('show');
        };
    });

    // 外部クリックでドロップダウンを閉じる
    document.addEventListener('click', function(e) {
        if (!langBtn.contains(e.target) && !langDropdown.contains(e.target)) {
            langDropdown.classList.remove('show');
        }
    });

    // 現在の言語を表示
    updateLanguageButton();

    // 両方のフラグを設定
    languageSwitcherInitialized = true;
    langBtn._langInitialized = true;
    console.log('✅ Language switcher initialized successfully');
}

function updateLanguageButton() {
    const langBtn = document.getElementById('lang-btn');
    if (!langBtn) return;

    const langMap = {
        'ja': { text: 'JP', flag: '🇯🇵', icon: '/images/flags/jp.svg', alt: '日本' },
        'en': { text: 'US', flag: '🇺🇸', icon: '/images/flags/us.svg', alt: 'United States' },
        'zh': { text: 'CN', flag: '🇨🇳', icon: '/images/flags/cn.svg', alt: '中国' }
    };

    const lang = langMap[currentLanguage];

    // パス解決（マニュアルページ対応）
    const basePath = window.location.pathname.includes('/manual/') ? '..' : '.';
    const iconPath = window.location.pathname.includes('/manual/') ? lang.icon.replace('/', '../') : lang.icon;

    langBtn.innerHTML = `
        <span class="lang-text">${lang.text}</span>
        <img src="${iconPath}" alt="${lang.alt}" class="flag-icon">
        <span class="arrow">▼</span>
    `;
}

function changeLanguage(lang) {
    if (currentLanguage === lang) return;

    console.log(`🌐 Changing language: ${currentLanguage} → ${lang}`);
    currentLanguage = lang;
    window.currentLanguage = lang; // グローバル変数も更新
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
        },
        'breadcrumb-addins': {
            ja: 'アドイン',
            en: 'Add-ins',
            zh: '插件'
        },
        'addins-breadcrumb': {
            ja: 'Revit アドイン',
            en: 'Revit Add-ins',
            zh: 'Revit 插件'
        },
        'family-breadcrumb': {
            ja: 'Revitファミリライブラリ',
            en: 'Revit Family Library',
            zh: 'Revit族库'
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
        'section-key-features': {
            ja: '主な特徴',
            en: 'Key Features',
            zh: '主要特点'
        },
        'section-supported-views': {
            ja: '実行できるビュー',
            en: 'Supported Views',
            zh: '可执行的视图'
        },
        'section-preparation': {
            ja: '実行前の準備',
            en: 'Preparation',
            zh: '执行前的准备'
        },
        'table-col-view-type': {
            ja: 'ビュー種別',
            en: 'View Type',
            zh: '视图类型'
        },
        'table-col-supported': {
            ja: '対応',
            en: 'Support',
            zh: '支持'
        },
        'table-col-behavior': {
            ja: '動作',
            en: 'Behavior',
            zh: '行为'
        },
        'table-col-execution': {
            ja: '実行',
            en: 'Execution',
            zh: '执行'
        },
        'table-col-note': {
            ja: '備考',
            en: 'Note',
            zh: '备注'
        },
        'table-col-item': {
            ja: '項目',
            en: 'Item',
            zh: '项目'
        },
        'table-col-content': {
            ja: '内容',
            en: 'Content',
            zh: '内容'
        },
        'section-output': {
            ja: '出力結果',
            en: 'Output Results',
            zh: '输出结果'
        },
        'section-rerun': {
            ja: '再実行・上書きについて',
            en: 'Re-run and Overwrite',
            zh: '关于重新执行与覆盖'
        },
        'section-troubleshooting': {
            ja: 'トラブルシューティング',
            en: 'Troubleshooting',
            zh: '故障排除'
        },
        'section-related': {
            ja: '関連機能',
            en: 'Related Features',
            zh: '相关功能'
        },
        'section-deliverables': {
            ja: '出力される成果物',
            en: 'Deliverables',
            zh: '输出成果物'
        },
        'section-logic': {
            ja: '計算ロジック（参考）',
            en: 'Calculation Logic (Reference)',
            zh: '计算逻辑（参考）'
        },
        'section-faq': {
            ja: 'よくある質問',
            en: 'FAQ',
            zh: '常见问题'
        },
        'section-related-links': {
            ja: '関連リンク',
            en: 'Related Links',
            zh: '相关链接'
        },
        'table-col-symptom': {
            ja: '症状',
            en: 'Symptom',
            zh: '症状'
        },
        'table-col-action': {
            ja: '対処',
            en: 'Action',
            zh: '处理方法'
        },
        'table-col-member': {
            ja: '部位',
            en: 'Member',
            zh: '部位'
        },
        'table-col-revit-category': {
            ja: 'Revit カテゴリ',
            en: 'Revit Category',
            zh: 'Revit 类别'
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
        'feature-room-tag-title': {
            ja: '部屋タグ自動配置',
            en: 'Room Tag Auto Placement',
            zh: '房间标签自动放置'
        },
        'feature-room-tag-desc': {
            ja: 'ビューポートの部屋情報からタグを一括自動配置',
            en: 'Auto-place room tags from viewport room data',
            zh: '从视口房间信息自动批量放置标签'
        },
        'feature-beam-bottom-title': {
            ja: '梁下端色分け',
            en: 'Beam Bottom Level Coloring',
            zh: '梁底标高着色'
        },
        'feature-beam-bottom-desc': {
            ja: '梁の下端レベルを自動計算しパステルカラーで色分け',
            en: 'Auto-calculate beam bottom levels and color-code with pastels',
            zh: '自动计算梁底标高并用柔和颜色着色'
        },
        'feature-beam-top-title': {
            ja: '梁天端色分け',
            en: 'Beam Top Level Coloring',
            zh: '梁顶标高着色'
        },
        'feature-beam-top-desc': {
            ja: '梁の天端レベルをパステルカラーで色分け表示',
            en: 'Color-code beam top levels with pastel colors',
            zh: '用柔和颜色显示梁顶标高着色'
        },
        'feature-excel-export-title': {
            ja: 'Excelエクスポート',
            en: 'Excel Export',
            zh: 'Excel导出'
        },
        'feature-excel-export-desc': {
            ja: '要素パラメータをカテゴリ別にExcelへ書き出し',
            en: 'Export element parameters to Excel by category',
            zh: '按类别将元素参数导出到Excel'
        },
        'feature-excel-import-title': {
            ja: 'Excelインポート',
            en: 'Excel Import',
            zh: 'Excel导入'
        },
        'feature-excel-import-desc': {
            ja: 'Excelの編集内容をRevitモデルに書き戻し',
            en: 'Import Excel edits back into Revit model',
            zh: '将Excel编辑内容写回Revit模型'
        },
        'feature-filled-region-title': {
            ja: '塗潰し領域 分割・統合',
            en: 'Filled Region Split & Merge',
            zh: '填充区域 分割与合并'
        },
        'feature-filled-region-desc': {
            ja: '塗り潰し領域を個別に分割または1つに統合',
            en: 'Split or merge filled regions',
            zh: '将填充区域分割或合并'
        },
        'feature-fire-protection-title': {
            ja: '耐火被覆色分け',
            en: 'Fire Protection Coloring',
            zh: '防火覆盖着色'
        },
        'feature-fire-protection-desc': {
            ja: '梁・柱の耐火被覆を種類別に色分けし凡例も自動作成',
            en: 'Color-code beam/column fire protection by type with auto-generated legend',
            zh: '按类型为梁柱防火覆盖着色并自动生成图例'
        },
        'feature-formwork-title': {
            ja: '型枠数量算出',
            en: 'Formwork Quantity Calculation',
            zh: '模板数量计算'
        },
        'feature-formwork-desc': {
            ja: 'RC躯体から型枠面積を自動算出しExcel・集計表・3Dビューに出力',
            en: 'Auto-calculate formwork area from RC structures, output to Excel/schedules/3D views',
            zh: '从RC结构自动计算模板面积并输出到Excel、明细表和3D视图'
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
        'download-btn': {
            ja: 'ダウンロード',
            en: 'Download',
            zh: '下载'
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
        },
        // index.html ポータルページ用
        'index-subtitle': {
            ja: 'Revit 作図サポートツール',
            en: 'Revit Drafting Support Tools',
            zh: 'Revit 制图支持工具'
        },
        'index-tab-addins': {
            ja: 'アドイン',
            en: 'Add-ins',
            zh: '插件'
        },
        'index-tab-family': {
            ja: 'ファミリ',
            en: 'Family',
            zh: '族'
        },
        'index-tab-hatch': {
            ja: '塗潰し',
            en: 'Hatch',
            zh: '填充'
        },
        'index-tab-pdf-compare': {
            ja: 'PDF比較',
            en: 'PDF Compare',
            zh: 'PDF比较'
        },
        'index-tab-knowledge': {
            ja: 'BIMニュース',
            en: 'BIM News',
            zh: 'BIM新闻'
        },
        'index-addins-title': {
            ja: 'アドイン',
            en: 'Add-ins',
            zh: '插件'
        },
        'index-addins-badge': {
            ja: '6機能 利用可能',
            en: '6 Features Available',
            zh: '6个功能可用'
        },
        'index-addins-desc': {
            ja: 'Revit作業を効率化する無料アドインツール。',
            en: 'Free add-in tools to streamline your Revit workflow.',
            zh: '免费插件工具，提高Revit工作效率。'
        },
        'index-addins-action': {
            ja: '詳細・ダウンロード →',
            en: 'Details & Download →',
            zh: '详情与下载 →'
        },
        'index-family-title': {
            ja: 'ファミリ',
            en: 'Family',
            zh: '族'
        },
        'index-coming-soon': {
            ja: '準備中',
            en: 'Coming Soon',
            zh: '即将推出'
        },
        'index-hatch-title': {
            ja: '塗潰しパターン作成',
            en: 'Hatch Pattern Creator',
            zh: '填充图案创建'
        },
        'index-hatch-badge': {
            ja: '6パターン 利用可能',
            en: '6 Patterns Available',
            zh: '6种图案可用'
        },
        'index-hatch-desc': {
            ja: 'Revit / AutoCAD用のハッチングパターンファイル（.pat）を作成できます。',
            en: 'Create hatch pattern files (.pat) for Revit / AutoCAD.',
            zh: '为Revit/AutoCAD创建填充图案文件（.pat）。'
        },
        'index-hatch-f1': {
            ja: '斜線（角度・間隔・破線設定）',
            en: 'Diagonal (angle, spacing, dash settings)',
            zh: '斜线（角度、间距、虚线设置）'
        },
        'index-hatch-f2': {
            ja: '網掛け（クロスハッチ）',
            en: 'Crosshatch',
            zh: '交叉线'
        },
        'index-hatch-f3': {
            ja: 'ドット（間隔・サイズ）',
            en: 'Dot (spacing, size)',
            zh: '点（间距、大小）'
        },
        'index-hatch-f4': {
            ja: '芋目地（X/Y サイズ・目地幅）',
            en: 'Stack Bond (X/Y size, grout width)',
            zh: '堆叠砌（X/Y尺寸、灰缝宽度）'
        },
        'index-hatch-f5': {
            ja: '馬目地（1/2オフセット）',
            en: 'Running Bond (1/2 offset)',
            zh: '错缝砌（1/2偏移）'
        },
        'index-hatch-f6': {
            ja: 'RC（鉄筋コンクリート）',
            en: 'RC (Reinforced Concrete)',
            zh: 'RC（钢筋混凝土）'
        },
        'index-hatch-output': {
            ja: '<strong>出力形式:</strong> Revit（モデル/製図）・AutoCAD',
            en: '<strong>Output:</strong> Revit (Model/Drafting) / AutoCAD',
            zh: '<strong>输出格式:</strong> Revit（模型/制图）/ AutoCAD'
        },
        'index-hatch-action': {
            ja: 'パターン作成ツールへ →',
            en: 'Go to Pattern Creator →',
            zh: '前往图案创建工具 →'
        },
        'index-knowledge-title': {
            ja: 'BIMニュース',
            en: 'BIM News',
            zh: 'BIM新闻'
        },
        'index-knowledge-badge': {
            ja: 'BIM業界ニュース 利用可能',
            en: 'BIM Industry News Available',
            zh: 'BIM行业新闻可用'
        },
        'index-knowledge-desc': {
            ja: 'BIM・Revit・建築業界の最新ニュースを自動収集。毎日更新されます。',
            en: 'Auto-collected latest news from BIM, Revit & Architecture industry. Updated daily.',
            zh: '自动收集BIM、Revit和建筑行业的最新新闻。每天更新。'
        },
        'index-knowledge-action': {
            ja: 'ニュース一覧へ →',
            en: 'View News →',
            zh: '查看新闻 →'
        },
        'index-overview-title': {
            ja: '28 Tools について',
            en: 'About 28 Tools',
            zh: '关于 28 Tools'
        },
        'index-overview-desc-1': {
            ja: '28 Tools は、BIM・Revit を活用する建築実務者のための作業支援プラットフォームです。',
            en: '28 Tools is a work-support platform for architecture professionals who use BIM and Revit.',
            zh: '28 Tools 是面向使用 BIM 和 Revit 的建筑专业人员的工作支持平台。'
        },
        'index-overview-desc-2': {
            ja: 'Revit 2021〜2026 全バージョン対応の無料アドインを中心に、ハッチングパターン作成ツール、PDF 比較ツール、BIM・AI 業界ニュースなどを公開。現場で本当に必要な機能だけを、シンプルに使える形で提供します。',
            en: 'Centered on free add-ins compatible with all Revit versions (2021–2026), we also offer a hatching pattern creator, a PDF comparison tool, and BIM & AI industry news — delivering only what you truly need on site, in a simple, easy-to-use form.',
            zh: '以兼容 Revit 2021–2026 全版本的免费插件为核心，同时提供填充图案创建工具、PDF 比较工具以及 BIM 与 AI 行业新闻，以简洁易用的方式，只提供现场真正需要的功能。'
        },
        'index-category-addon-desc': {
            ja: 'Revit 2021-2026 対応の無料アドイン。6つの便利機能をインストール不要ですぐに利用できます。',
            en: 'Free add-ins compatible with Revit 2021-2026. 6 convenient features ready to use without installation.',
            zh: '兼容Revit 2021-2026的免费插件。6个便捷功能无需安装即可使用。'
        },
        'index-category-family-desc': {
            ja: '高品質なRevitファミリライブラリ。実務で使える豊富なファミリを無料でダウンロード。（準備中）',
            en: 'High-quality Revit family library. Download a rich collection of practical families for free. (Coming Soon)',
            zh: '高质量的Revit族库。免费下载丰富的实用族。（即将推出）'
        },
        'index-category-hatch-desc': {
            ja: 'Revit/AutoCAD用のハッチングパターンファイル（.pat）を簡単作成。6種類のパターンに対応。',
            en: 'Easily create hatching pattern files (.pat) for Revit/AutoCAD. Supports 6 pattern types.',
            zh: '轻松创建Revit/AutoCAD的填充图案文件（.pat）。支持6种图案类型。'
        },
        'index-category-pdf-compare-desc': {
            ja: '2つのPDFをブラウザ上で重ねて差分をカラー表示。サーバー送信なしで安全に比較。',
            en: 'Overlay two PDFs in the browser and highlight differences in color. Safe comparison without server upload.',
            zh: '在浏览器中叠加两个PDF并以彩色显示差异。无需上传服务器，安全比较。'
        },
        'index-category-news-desc': {
            ja: 'BIM・Revit・建築業界の最新ニュースを自動収集。業界トレンドを毎日チェック。（準備中）',
            en: 'Auto-collect the latest news from BIM, Revit, and architecture industries. Check industry trends daily. (Coming Soon)',
            zh: '自动收集BIM、Revit和建筑行业的最新新闻。每天查看行业趋势。（即将推出）'
        },
        'index-tab-ai-news': {
            ja: 'AIニュース',
            en: 'AI News',
            zh: 'AI新闻'
        },
        'index-category-ai-news-desc': {
            ja: 'AI・機械学習・LLMの最新ニュースを自動収集。AIトレンドを毎日チェック。',
            en: 'Auto-collect the latest AI, ML & LLM news. Check AI trends daily.',
            zh: '自动收集AI、机器学习和LLM的最新新闻。每天查看AI趋势。'
        },
        'index-news-title': {
            ja: '新着・おすすめ',
            en: 'News & Featured',
            zh: '最新动态'
        },
        'index-news-pdf-compare': {
            ja: 'PDF 比較ツール 公開 — ブラウザ上で2つのPDFの差分をカラー表示',
            en: 'PDF Compare Tool Released — Highlight differences between two PDFs in browser',
            zh: 'PDF比较工具发布 — 在浏览器中以彩色显示两个PDF的差异'
        },
        'index-news-ai-news': {
            ja: 'AIニュースページ 公開 — AI・LLMの最新トレンドを毎日配信',
            en: 'AI News Page Launched — Daily AI & LLM trend updates',
            zh: 'AI新闻页面上线 — 每日AI与LLM最新趋势'
        },
        'index-news-v2': {
            ja: '28 Tools v2.0 リリース - 新機能追加・Revit 2021~2026 対応',
            en: '28 Tools v2.0 Released - New Features, Revit 2021~2026 Supported',
            zh: '28 Tools v2.0 发布 - 新功能・Revit 2021~2026 全版本支持'
        },
        'index-news-1': {
            ja: '塗潰し（ハッチング）パターン自動作成ツール 公開',
            en: 'Hatch Pattern Creator Tool Released',
            zh: '填充图案自动创建工具发布'
        },
        'index-news-2': {
            ja: '28 Tools v1.0 - Revit 2021~2026 全バージョン対応リリース',
            en: '28 Tools v1.0 - All Versions (Revit 2021~2026) Released',
            zh: '28 Tools v1.0 - Revit 2021~2026 全版本发布'
        },
        'index-news-3': {
            ja: '28 Tools サイトオープン',
            en: '28 Tools Site Launched',
            zh: '28 Tools 网站上线'
        },
        'index-community-title': {
            ja: 'コミュニティ',
            en: 'Community',
            zh: '社区'
        },
        'index-community-ask': {
            ja: '質問する',
            en: 'Ask a Question',
            zh: '提问'
        },
        'index-community-request': {
            ja: '機能をリクエスト',
            en: 'Request Feature',
            zh: '功能请求'
        },
        'index-community-news': {
            ja: 'お知らせを見る',
            en: 'View Announcements',
            zh: '查看公告'
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
            ja: '全12機能が利用可能',
            en: 'All 12 features available',
            zh: '所有 12 个功能都可用'
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
        en: 'Grid/Level Bubble Toggle',
        zh: '轴网/标高符号显示切换'
    },
    'manual-grid-bubble-subtitle': {
        ja: '通り芯・レベルの符号表示を一括切り替え',
        en: 'Toggle grid and level bubble visibility in one click',
        zh: '一键切换轴网和标高符号的显示'
    },
    'manual-grid-bubble-overview': {
        ja: '通り芯（グリッド）とレベルの符号（バブル）表示を、ワンクリックで切り替える機能です。<strong>事前に通り芯・レベルを選択していればその要素のみ</strong>、選択していなければ<strong>ビュー内の全要素</strong>が対象になります。',
        en: 'Toggle the bubble (annotation) display of grids and levels with a single click. If grids/levels are <strong>pre-selected, only those elements</strong> are affected; otherwise <strong>all elements in the view</strong> are targeted.',
        zh: '一键切换轴网（网格）和标高符号（气泡）的显示。如果<strong>预先选择了轴网/标高，则仅对选中元素</strong>生效；否则将针对<strong>视图内的所有元素</strong>。'
    },
    'manual-grid-bubble-mode-intro': {
        ja: '3つのモードから選択できます：',
        en: 'Choose from three modes:',
        zh: '可从三种模式中选择：'
    },
    'manual-grid-bubble-btn-both-title': {
        ja: '<strong>両端表示</strong>',
        en: '<strong>Both Ends</strong>',
        zh: '<strong>两端显示</strong>'
    },
    'manual-grid-bubble-btn-both-desc': {
        ja: '通り芯・レベルの両端に符号を表示する',
        en: 'Show bubbles at both ends of grids and levels',
        zh: '在轴网和标高的两端显示符号'
    },
    'manual-grid-bubble-btn-left-title': {
        ja: '<strong>左/上のみ</strong>',
        en: '<strong>Left/Top Only</strong>',
        zh: '<strong>仅左/上端</strong>'
    },
    'manual-grid-bubble-btn-left-desc': {
        ja: '左端（縦通り芯）または上端（横通り芯・レベル）のみ符号を表示する',
        en: 'Show bubble only at the left end (vertical grids) or top end (horizontal grids/levels)',
        zh: '仅在左端（竖向轴网）或上端（横向轴网/标高）显示符号'
    },
    'manual-grid-bubble-btn-right-title': {
        ja: '<strong>右/下のみ</strong>',
        en: '<strong>Right/Bottom Only</strong>',
        zh: '<strong>仅右/下端</strong>'
    },
    'manual-grid-bubble-btn-right-desc': {
        ja: '右端（縦通り芯）または下端（横通り芯・レベル）のみ符号を表示する',
        en: 'Show bubble only at the right end (vertical grids) or bottom end (horizontal grids/levels)',
        zh: '仅在右端（竖向轴网）或下端（横向轴网/标高）显示符号'
    },
    'manual-grid-bubble-view-floor': {
        ja: '平面ビュー',
        en: 'Floor Plan',
        zh: '平面视图'
    },
    'manual-grid-bubble-view-ceiling': {
        ja: '天井伏図',
        en: 'Reflected Ceiling Plan',
        zh: '天花板平面图'
    },
    'manual-grid-bubble-view-structural': {
        ja: '構造伏図',
        en: 'Structural Plan',
        zh: '结构平面图'
    },
    'manual-grid-bubble-view-section': {
        ja: '断面図',
        en: 'Section',
        zh: '剖面图'
    },
    'manual-grid-bubble-view-elevation': {
        ja: '立面図',
        en: 'Elevation',
        zh: '立面图'
    },
    'manual-grid-bubble-view-3d': {
        ja: '3Dビュー',
        en: '3D View',
        zh: '三维视图'
    },
    'manual-grid-bubble-step1-title': {
        ja: '対象ビューを開く',
        en: 'Open the target view',
        zh: '打开目标视图'
    },
    'manual-grid-bubble-step1-desc': {
        ja: '符号表示を変更したいビューをアクティブにします。',
        en: 'Activate the view in which you want to change the bubble display.',
        zh: '激活要更改符号显示的视图。'
    },
    'manual-grid-bubble-step2-title': {
        ja: '（任意）対象を選択する',
        en: '(Optional) Select target elements',
        zh: '（可选）选择目标元素'
    },
    'manual-grid-bubble-step2-desc': {
        ja: '特定の通り芯・レベルのみ切り替えたい場合は、ビュー上で<strong>対象の通り芯・レベルを選択</strong>しておきます。',
        en: 'If you want to toggle only specific grids/levels, <strong>select the target grids/levels</strong> in the view beforehand.',
        zh: '如果只想切换特定轴网/标高，请在视图中<strong>预先选择目标轴网/标高</strong>。'
    },
    'manual-grid-bubble-step2-item1': {
        ja: '何も選択しない場合 → <strong>ビュー内のすべての通り芯・レベル</strong>が対象',
        en: 'Nothing selected → <strong>All grids and levels in the view</strong> are targeted',
        zh: '未选择任何元素 → 以<strong>视图内所有轴网和标高</strong>为对象'
    },
    'manual-grid-bubble-step2-item2': {
        ja: '通り芯・レベルを選択した場合 → <strong>選択したものだけ</strong>が対象',
        en: 'Grids/levels selected → <strong>Only the selected elements</strong> are targeted',
        zh: '已选择轴网/标高 → 仅以<strong>选中的元素</strong>为对象'
    },
    'manual-grid-bubble-step2-item3': {
        ja: '選択範囲に通り芯・レベル以外の要素（壁・梁等）が混ざっていても問題ありません。通り芯・レベルだけが処理対象になります',
        en: 'If the selection includes non-grid/level elements (walls, beams, etc.), they are ignored. Only grids and levels are processed.',
        zh: '即使选择范围内包含非轴网/标高元素（墙、梁等）也没有问题，仅处理轴网和标高。'
    },
    'manual-grid-bubble-step3-title': {
        ja: 'ボタンをクリック',
        en: 'Click the button',
        zh: '点击按钮'
    },
    'manual-grid-bubble-step3-desc': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>通り芯・レベル</strong>」パネルの3つのボタンから目的のものをクリックします。',
        en: 'In the Ribbon, go to the "<strong>28 Tools</strong>" tab → "<strong>Grid/Level</strong>" panel and click the desired button.',
        zh: '在功能区"<strong>28 Tools</strong>"选项卡 →"<strong>轴网/标高</strong>"面板中，点击所需按钮。'
    },
    'manual-grid-bubble-step3-item1': {
        ja: '<strong>両端表示</strong> — 通り芯・レベルの両端すべてに符号を表示',
        en: '<strong>Both Ends</strong> — Show bubbles at both ends of all grids and levels',
        zh: '<strong>两端显示</strong> — 在轴网和标高的两端均显示符号'
    },
    'manual-grid-bubble-step3-item2': {
        ja: '<strong>左/上のみ</strong> — 片側（左端・上端）のみ表示',
        en: '<strong>Left/Top Only</strong> — Show bubble on one side only (left/top)',
        zh: '<strong>仅左/上端</strong> — 仅在一侧（左端/上端）显示'
    },
    'manual-grid-bubble-step3-item3': {
        ja: '<strong>右/下のみ</strong> — 片側（右端・下端）のみ表示',
        en: '<strong>Right/Bottom Only</strong> — Show bubble on one side only (right/bottom)',
        zh: '<strong>仅右/下端</strong> — 仅在一侧（右端/下端）显示'
    },
    'manual-grid-bubble-step3-note': {
        ja: 'ダイアログは表示されません。クリックすると即座に反映されます。',
        en: 'No dialog is displayed. Changes are applied immediately upon clicking.',
        zh: '不会显示对话框，点击后立即生效。'
    },
    'manual-grid-bubble-trouble1-title': {
        ja: 'クリックしても変化がない',
        en: 'Nothing changes after clicking',
        zh: '点击后没有变化'
    },
    'manual-grid-bubble-trouble1-item1': {
        ja: 'ビュー内に通り芯・レベルが<strong>表示されているか</strong>確認してください（フィルタやビュー設定で非表示になっていませんか？）',
        en: 'Check that grids/levels are <strong>visible</strong> in the view (are they hidden by filters or view settings?)',
        zh: '请确认视图内的轴网/标高是否<strong>可见</strong>（是否被过滤器或视图设置隐藏？）'
    },
    'manual-grid-bubble-trouble1-item2': {
        ja: 'すでに指定したモードになっている場合、見た目は変わりません',
        en: 'If the elements are already in the specified mode, no visible change will occur',
        zh: '如果元素已处于指定模式，则外观不会发生变化'
    },
    'manual-grid-bubble-trouble2-title': {
        ja: 'リンクモデルの通り芯・レベルが変わらない',
        en: 'Grids/levels in linked models are not affected',
        zh: '链接模型中的轴网/标高未发生变化'
    },
    'manual-grid-bubble-trouble2-desc': {
        ja: 'リンクファイル内の通り芯・レベルは編集対象外です。ホストモデルの通り芯・レベルのみ変更されます',
        en: 'Grids and levels inside linked files cannot be edited. Only grids/levels in the host model are modified.',
        zh: '链接文件中的轴网和标高不在编辑范围内，仅修改主模型中的轴网/标高。'
    },
    'manual-grid-bubble-trouble3-title': {
        ja: '一部の通り芯・レベルだけ変更したい',
        en: 'Want to change only specific grids/levels',
        zh: '只想更改部分轴网/标高'
    },
    'manual-grid-bubble-trouble3-desc': {
        ja: 'ボタンをクリックする<strong>前に対象の通り芯・レベルを選択</strong>してから実行してください。選択した要素のみが切り替わります',
        en: '<strong>Select the target grids/levels before clicking</strong> the button. Only the selected elements will be toggled.',
        zh: '请在点击按钮<strong>前先选中目标轴网/标高</strong>再执行。仅选中的元素会被切换。'
    },
    'manual-grid-bubble-related-viewport': {
        ja: 'ビューポート位置 コピー＆ペースト — シート上のビューポート位置を他のシートに合わせる',
        en: 'Viewport Position Copy & Paste — Match viewport positions across sheets',
        zh: '视口位置 复制＆粘贴 — 将图纸上的视口位置与其他图纸对齐'
    }
};

    // ========================================
    // sheet-creation.html (シート一括作成)
    // ========================================
translations.sheetCreation = {
    'manual-sheet-creation-title': {
        ja: 'シート一括作成',
        en: 'Bulk Sheet Creation',
        zh: '批量创建图纸'
    },
    'manual-sheet-creation-subtitle': {
        ja: '図枠を指定して複数シートをまとめて作成',
        en: 'Create multiple sheets at once with a specified title block',
        zh: '指定图框并批量创建多个图纸'
    },
    'manual-sheet-creation-overview': {
        ja: 'シート番号と名前のリストを入力するだけで、複数のシートをまとめて作成できる機能です。',
        en: 'Create multiple sheets at once simply by entering a list of sheet numbers and names.',
        zh: '只需输入图纸编号和名称列表，即可批量创建多张图纸。'
    },
    'manual-sheet-creation-feature1': {
        ja: 'シート番号と名前を複数行入力して、<strong>一度にまとめてシートを作成</strong>します',
        en: 'Enter multiple rows of sheet numbers and names to <strong>create all sheets at once</strong>',
        zh: '输入多行图纸编号和名称，<strong>一次性批量创建图纸</strong>'
    },
    'manual-sheet-creation-feature2': {
        ja: 'タイトルブロックの種類を指定できます',
        en: 'You can specify the title block type',
        zh: '可以指定图框类型'
    },
    'manual-sheet-creation-feature3': {
        ja: 'Excelから番号・名前をコピー＆ペーストして、そのまま利用できます',
        en: 'You can copy and paste numbers and names directly from Excel',
        zh: '可以直接从Excel复制粘贴编号和名称使用'
    },
    'manual-sheet-creation-step1-title': {
        ja: 'コマンドの起動',
        en: 'Launch the command',
        zh: '启动命令'
    },
    'manual-sheet-creation-step1-desc': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>シート</strong>」パネル →「<strong>シート一括作成</strong>」ボタンをクリックします。',
        en: 'In the Ribbon, go to the "<strong>28 Tools</strong>" tab → "<strong>Sheet</strong>" panel → click the "<strong>Bulk Sheet Creation</strong>" button.',
        zh: '在功能区"<strong>28 Tools</strong>"选项卡 →"<strong>图纸</strong>"面板 → 点击"<strong>批量创建图纸</strong>"按钮。'
    },
    'manual-sheet-creation-step2-title': {
        ja: 'タイトルブロックを選択',
        en: 'Select a title block',
        zh: '选择图框'
    },
    'manual-sheet-creation-step2-desc': {
        ja: 'ダイアログが開いたら、<strong>タイトルブロック</strong>のドロップダウンから使用するタイトルブロックタイプを選択します。',
        en: 'When the dialog opens, select the title block type to use from the <strong>Title Block</strong> dropdown.',
        zh: '对话框打开后，从<strong>图框</strong>下拉菜单中选择要使用的图框类型。'
    },
    'manual-sheet-creation-step3-title': {
        ja: 'シートリストを入力',
        en: 'Enter the sheet list',
        zh: '输入图纸列表'
    },
    'manual-sheet-creation-step3-desc': {
        ja: 'テキストエリアにシート番号と名前を入力します。',
        en: 'Enter sheet numbers and names in the text area.',
        zh: '在文本区域中输入图纸编号和名称。'
    },
    'manual-sheet-creation-step3-format': {
        ja: '<strong>入力形式</strong>：<code>シート番号[Tab]シート名</code>（1行に1シート）',
        en: '<strong>Input format</strong>: <code>Sheet Number[Tab]Sheet Name</code> (one sheet per line)',
        zh: '<strong>输入格式</strong>：<code>图纸编号[Tab]图纸名称</code>（每行一张图纸）'
    },
    'manual-sheet-creation-step3-example-label': {
        ja: '入力例：',
        en: 'Example:',
        zh: '输入示例：'
    },
    'manual-sheet-creation-step3-tip': {
        ja: '💡 <strong>Excelからの貼り付けが便利です。</strong> Excelで「番号」列と「名前」列を選択してコピーし、テキストエリアにそのまま貼り付けることができます。列はタブ区切りで認識されます。',
        en: '💡 <strong>Pasting from Excel is convenient.</strong> Select the "Number" and "Name" columns in Excel, copy them, and paste directly into the text area. Columns are recognized as tab-separated.',
        zh: '💡 <strong>从Excel粘贴非常方便。</strong> 在Excel中选择"编号"列和"名称"列后复制，可以直接粘贴到文本区域。列之间以制表符分隔识别。'
    },
    'manual-sheet-creation-step4-title': {
        ja: '作成を実行',
        en: 'Execute creation',
        zh: '执行创建'
    },
    'manual-sheet-creation-step4-desc': {
        ja: '「<strong>作成</strong>」ボタンをクリックします。入力したリストのとおりにシートが作成され、プロジェクトブラウザに反映されます。',
        en: 'Click the "<strong>Create</strong>" button. Sheets are created according to the entered list and appear in the Project Browser.',
        zh: '点击"<strong>创建</strong>"按钮。图纸将按照输入的列表创建，并显示在项目浏览器中。'
    },
    'manual-sheet-creation-output1': {
        ja: '指定したタイトルブロックを使用したシートが一括作成されます',
        en: 'Sheets using the specified title block are created in bulk',
        zh: '使用指定图框的图纸将被批量创建'
    },
    'manual-sheet-creation-output2': {
        ja: '作成されたシートはプロジェクトブラウザの「シート」ツリーに追加されます',
        en: 'Created sheets are added to the "Sheets" tree in the Project Browser',
        zh: '创建的图纸将添加到项目浏览器的"图纸"树中'
    },
    'manual-sheet-creation-output3': {
        ja: '重複するシート番号が入力された場合は、そのシートをスキップして警告メッセージが表示されます',
        en: 'If a duplicate sheet number is entered, that sheet is skipped and a warning message is displayed',
        zh: '如果输入了重复的图纸编号，该图纸将被跳过并显示警告信息'
    },
    'manual-sheet-creation-trouble1-title': {
        ja: '「シート番号が重複しています」と表示される',
        en: '"Sheet number already exists" message appears',
        zh: '显示"图纸编号重复"提示'
    },
    'manual-sheet-creation-trouble1-item1': {
        ja: '入力したシート番号がすでにプロジェクト内に存在しています',
        en: 'The entered sheet number already exists in the project',
        zh: '输入的图纸编号在项目中已存在'
    },
    'manual-sheet-creation-trouble1-item2': {
        ja: 'プロジェクトブラウザでシート番号を確認し、重複しない番号を使用してください',
        en: 'Check the sheet numbers in the Project Browser and use a number that does not duplicate',
        zh: '请在项目浏览器中确认图纸编号，使用不重复的编号'
    },
    'manual-sheet-creation-trouble2-title': {
        ja: 'タイトルブロックが選択肢に表示されない',
        en: 'Title block does not appear in the dropdown',
        zh: '图框未显示在选项中'
    },
    'manual-sheet-creation-trouble2-item1': {
        ja: 'プロジェクトにタイトルブロックファミリが読み込まれていることを確認してください',
        en: 'Verify that a title block family is loaded into the project',
        zh: '请确认项目中已加载图框族'
    },
    'manual-sheet-creation-trouble2-item2': {
        ja: 'タイトルブロックがない場合は、「なし」を選択してシートのみ作成することもできます',
        en: 'If there is no title block, you can select "None" to create sheets without one',
        zh: '如果没有图框，也可以选择"无"仅创建图纸'
    },
    'manual-sheet-creation-trouble3-title': {
        ja: 'Excelから貼り付けたのに正しく認識されない',
        en: 'Pasted from Excel but not recognized correctly',
        zh: '从Excel粘贴后无法正确识别'
    },
    'manual-sheet-creation-trouble3-item1': {
        ja: '列の区切りが<strong>タブ</strong>になっているか確認してください',
        en: 'Check that the column separator is a <strong>tab</strong>',
        zh: '请确认列的分隔符是否为<strong>制表符（Tab）</strong>'
    },
    'manual-sheet-creation-trouble3-item2': {
        ja: '番号列と名前列の2列のみを選択してコピーしてください',
        en: 'Select and copy only the two columns: the number column and the name column',
        zh: '请仅选择编号列和名称列这两列进行复制'
    },
    'manual-sheet-creation-trouble3-item3': {
        ja: '余分な列（3列以上）が含まれている場合、3列目以降は無視されます',
        en: 'If extra columns (3 or more) are included, columns from the 3rd onward are ignored',
        zh: '如果包含多余的列（3列以上），第3列及之后的列将被忽略'
    },
    'manual-sheet-creation-related-viewport': {
        ja: 'ビューポート位置 コピー＆ペースト — 作成したシートのビューポート位置を他のシートに合わせる',
        en: 'Viewport Position Copy & Paste — Match viewport positions of created sheets to other sheets',
        zh: '视口位置 复制＆粘贴 — 将创建图纸的视口位置与其他图纸对齐'
    }
};

    // ========================================
    // view-copy.html (3D視点コピペ)
    // ========================================
translations.viewCopy = {
    'manual-view-copy-title': {
        ja: '3D視点コピペ',
        en: '3D View Point Copy & Paste',
        zh: '三维视点复制粘贴'
    },
    'manual-view-copy-subtitle': {
        ja: '3Dビューの視点を他のビューにコピー＆ペースト',
        en: 'Copy and paste the camera viewpoint between 3D views',
        zh: '将三维视图的视点复制粘贴到其他视图'
    },
    'manual-view-copy-overview': {
        ja: '3Dビューのカメラ位置・向きをコピーして、別の3Dビューに貼り付ける機能です。複数の3Dビューで視点を揃えたい場合に便利です。',
        en: 'Copy the camera position and orientation of a 3D view and paste it to another 3D view. Useful when you want to align viewpoints across multiple 3D views.',
        zh: '复制三维视图的相机位置和方向，并粘贴到另一个三维视图。在需要对齐多个三维视图的视点时非常方便。'
    },
    'manual-view-copy-feature1': {
        ja: 'ある3Dビューの<strong>視点（カメラ位置・注視点・上方向）</strong>を記録し、別の3Dビューにそのまま適用します',
        en: 'Records the <strong>viewpoint (camera position, target point, up direction)</strong> of a 3D view and applies it to another 3D view',
        zh: '记录某个三维视图的<strong>视点（相机位置、目标点、上方向）</strong>并直接应用到另一个三维视图'
    },
    'manual-view-copy-feature2': {
        ja: 'パースビュー・アイソメビュー問わず使用できます',
        en: 'Works with both perspective and isometric views',
        zh: '透视视图和等轴测视图均可使用'
    },
    'manual-view-copy-step1-title': {
        ja: '視点をコピー',
        en: 'Copy the viewpoint',
        zh: '复制视点'
    },
    'manual-view-copy-step1-item1': {
        ja: 'コピーしたい視点の<strong>3Dビューをアクティブ</strong>にする',
        en: '<strong>Activate the 3D view</strong> whose viewpoint you want to copy',
        zh: '<strong>激活</strong>要复制视点的<strong>三维视图</strong>'
    },
    'manual-view-copy-step1-item2': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>ビュー</strong>」パネル →「<strong>3Dビュー コピー</strong>」をクリック',
        en: 'In the Ribbon, go to "<strong>28 Tools</strong>" tab → "<strong>View</strong>" panel → click "<strong>3D View Copy</strong>"',
        zh: '在功能区"<strong>28 Tools</strong>"选项卡 →"<strong>视图</strong>"面板 → 点击"<strong>三维视图 复制</strong>"'
    },
    'manual-view-copy-step1-note': {
        ja: '視点情報がメモリに保存されます。',
        en: 'The viewpoint information is saved to memory.',
        zh: '视点信息将保存到内存中。'
    },
    'manual-view-copy-step2-title': {
        ja: '視点をペースト',
        en: 'Paste the viewpoint',
        zh: '粘贴视点'
    },
    'manual-view-copy-step2-item1': {
        ja: '視点を適用したい<strong>別の3Dビューをアクティブ</strong>にする',
        en: '<strong>Activate the other 3D view</strong> to which you want to apply the viewpoint',
        zh: '<strong>激活</strong>要应用视点的<strong>另一个三维视图</strong>'
    },
    'manual-view-copy-step2-item2': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>ビュー</strong>」パネル →「<strong>3Dビュー ペースト</strong>」をクリック',
        en: 'In the Ribbon, go to "<strong>28 Tools</strong>" tab → "<strong>View</strong>" panel → click "<strong>3D View Paste</strong>"',
        zh: '在功能区"<strong>28 Tools</strong>"选项卡 →"<strong>视图</strong>"面板 → 点击"<strong>三维视图 粘贴</strong>"'
    },
    'manual-view-copy-step2-note': {
        ja: 'コピーした視点が適用され、カメラが同じ位置・向きになります。',
        en: 'The copied viewpoint is applied, and the camera will be at the same position and orientation.',
        zh: '复制的视点将被应用，相机将处于相同的位置和方向。'
    },
    'manual-view-copy-step2-tip': {
        ja: '💡 コピー後にシートや別のビューを経由してから、目的の3Dビューを開いてペーストしても問題ありません（Revitを閉じない限り有効）。',
        en: '💡 After copying, you can navigate through sheets or other views before opening the target 3D view and pasting — it remains valid as long as Revit is open.',
        zh: '💡 复制后，即使经过图纸或其他视图，再打开目标三维视图进行粘贴也没有问题（只要不关闭Revit即有效）。'
    },
    'manual-view-copy-note1': {
        ja: '3Dビュー同士でのみ使用できます（平面図・断面図は不可）',
        en: 'Can only be used between 3D views (not applicable to floor plans or sections)',
        zh: '仅可在三维视图之间使用（平面图、剖面图不适用）'
    },
    'manual-view-copy-note2': {
        ja: 'コピーした情報は<strong>Revitを閉じると消えます</strong>（セッション内のみ有効）',
        en: 'The copied information is <strong>lost when Revit is closed</strong> (valid within the current session only)',
        zh: '复制的信息<strong>关闭Revit后将消失</strong>（仅在当前会话内有效）'
    },
    'manual-view-copy-note3': {
        ja: 'セクションボックスの範囲はコピーされません。範囲を合わせたい場合は「<strong>SBコピー / SBペースト</strong>」を使用してください',
        en: 'The section box range is not copied. To match the range, use "<strong>SB Copy / SB Paste</strong>"',
        zh: '切断框范围不会被复制。如需对齐范围，请使用"<strong>SB复制 / SB粘贴</strong>"'
    },
    'manual-view-copy-trouble1-title': {
        ja: 'ペーストしても視点が変わらない',
        en: 'Viewpoint does not change after pasting',
        zh: '粘贴后视点没有变化'
    },
    'manual-view-copy-trouble1-item1': {
        ja: '「<strong>3Dビュー コピー</strong>」を先に実行しているか確認してください',
        en: 'Make sure you have run "<strong>3D View Copy</strong>" first',
        zh: '请确认是否已先执行"<strong>三维视图 复制</strong>"'
    },
    'manual-view-copy-trouble1-item2': {
        ja: 'ペースト先がアクティブな<strong>3Dビュー</strong>になっているか確認してください',
        en: 'Check that the paste destination is an active <strong>3D view</strong>',
        zh: '请确认粘贴目标是否为活动的<strong>三维视图</strong>'
    },
    'manual-view-copy-related-sectionbox': {
        ja: '切断ボックス コピー＆ペースト — 3Dビューのセクションボックス範囲をコピー',
        en: 'Section Box Copy & Paste — Copy the section box range of a 3D view',
        zh: '切断框 复制＆粘贴 — 复制三维视图的切断框范围'
    },
    'manual-view-copy-related-cropbox': {
        ja: 'トリミング領域 コピー＆ペースト — 平面図・断面図などのトリミング領域をコピー',
        en: 'Crop Region Copy & Paste — Copy the crop region of floor plans, sections, etc.',
        zh: '裁剪区域 复制＆粘贴 — 复制平面图、剖面图等的裁剪区域'
    },
    'manual-view-copy-related-viewport': {
        ja: 'ビューポート位置 コピー＆ペースト — シート上のビューポート位置をコピー',
        en: 'Viewport Position Copy & Paste — Copy the viewport position on a sheet',
        zh: '视口位置 复制＆粘贴 — 复制图纸上的视口位置'
    }
};

    // ========================================
    // sectionbox-copy.html (切断ボックスコピペ)
    // ========================================
translations.sectionboxCopy = {
    'manual-sectionbox-copy-title': {
        ja: '切断ボックスコピペ',
        en: 'Section Box Copy & Paste',
        zh: '切断框复制粘贴'
    },
    'manual-sectionbox-copy-subtitle': {
        ja: '3Dビューの切断ボックス範囲をコピー＆ペースト',
        en: 'Copy and paste the section box range between 3D views',
        zh: '在三维视图之间复制粘贴切断框范围'
    },
    'manual-sectionbox-copy-overview': {
        ja: '3Dビューのセクションボックス（切断ボックス）の範囲をコピーして、別の3Dビューに貼り付ける機能です。同じ切り取り範囲を複数の3Dビューで共有したい場合に便利です。',
        en: 'Copy the section box range of a 3D view and paste it to another 3D view. Useful when you want to share the same clipping range across multiple 3D views.',
        zh: '复制三维视图的剖面框（切断框）范围并粘贴到另一个三维视图。在需要多个三维视图共享相同裁剪范围时非常方便。'
    },
    'manual-sectionbox-copy-feature1': {
        ja: 'ある3Dビューの<strong>セクションボックスの範囲</strong>を記録し、別の3Dビューに適用します',
        en: 'Records the <strong>section box range</strong> of a 3D view and applies it to another 3D view',
        zh: '记录某个三维视图的<strong>剖面框范围</strong>并应用到另一个三维视图'
    },
    'manual-sectionbox-copy-feature2': {
        ja: 'ペースト先でセクションボックスが無効になっている場合は、<strong>自動的に有効化</strong>してから範囲を適用します',
        en: 'If the section box is disabled in the destination view, it is <strong>automatically enabled</strong> before applying the range',
        zh: '如果目标视图的剖面框未启用，将<strong>自动启用</strong>后再应用范围'
    },
    'manual-sectionbox-copy-step1-title': {
        ja: '切断ボックスをコピー',
        en: 'Copy the section box',
        zh: '复制切断框'
    },
    'manual-sectionbox-copy-step1-item1': {
        ja: 'コピーしたいセクションボックスが設定された<strong>3Dビューをアクティブ</strong>にする',
        en: '<strong>Activate the 3D view</strong> that has the section box you want to copy',
        zh: '<strong>激活</strong>已设置了要复制的剖面框的<strong>三维视图</strong>'
    },
    'manual-sectionbox-copy-step1-item2': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>ビュー</strong>」パネル →「<strong>SBコピー</strong>」をクリック',
        en: 'In the Ribbon, go to "<strong>28 Tools</strong>" tab → "<strong>View</strong>" panel → click "<strong>SB Copy</strong>"',
        zh: '在功能区"<strong>28 Tools</strong>"选项卡 →"<strong>视图</strong>"面板 → 点击"<strong>SB复制</strong>"'
    },
    'manual-sectionbox-copy-step1-note': {
        ja: 'セクションボックスの範囲情報がメモリに保存されます。',
        en: 'The section box range information is saved to memory.',
        zh: '剖面框范围信息将保存到内存中。'
    },
    'manual-sectionbox-copy-step2-title': {
        ja: '切断ボックスをペースト',
        en: 'Paste the section box',
        zh: '粘贴切断框'
    },
    'manual-sectionbox-copy-step2-item1': {
        ja: '範囲を適用したい<strong>別の3Dビューをアクティブ</strong>にする',
        en: '<strong>Activate the other 3D view</strong> to which you want to apply the range',
        zh: '<strong>激活</strong>要应用范围的<strong>另一个三维视图</strong>'
    },
    'manual-sectionbox-copy-step2-item2': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>ビュー</strong>」パネル →「<strong>SBペースト</strong>」をクリック',
        en: 'In the Ribbon, go to "<strong>28 Tools</strong>" tab → "<strong>View</strong>" panel → click "<strong>SB Paste</strong>"',
        zh: '在功能区"<strong>28 Tools</strong>"选项卡 →"<strong>视图</strong>"面板 → 点击"<strong>SB粘贴</strong>"'
    },
    'manual-sectionbox-copy-step2-note': {
        ja: 'コピーしたセクションボックスの範囲が適用されます。',
        en: 'The copied section box range is applied.',
        zh: '复制的剖面框范围将被应用。'
    },
    'manual-sectionbox-copy-step2-tip': {
        ja: '💡 セクションボックスが無効な3Dビューにペーストしても、自動的に有効化されます。',
        en: '💡 Even if the section box is disabled in the destination 3D view, it will be automatically enabled.',
        zh: '💡 即使在剖面框未启用的三维视图中粘贴，也会自动启用。'
    },
    'manual-sectionbox-copy-note1': {
        ja: '3Dビュー同士でのみ使用できます',
        en: 'Can only be used between 3D views',
        zh: '仅可在三维视图之间使用'
    },
    'manual-sectionbox-copy-note2': {
        ja: 'コピー元のビューで<strong>セクションボックスが有効</strong>になっていないとコピーできません',
        en: 'The <strong>section box must be enabled</strong> in the source view in order to copy',
        zh: '复制源视图中必须<strong>启用了剖面框</strong>才能复制'
    },
    'manual-sectionbox-copy-note3': {
        ja: 'コピーした情報は<strong>Revitを閉じると消えます</strong>（セッション内のみ有効）',
        en: 'The copied information is <strong>lost when Revit is closed</strong> (valid within the current session only)',
        zh: '复制的信息<strong>关闭Revit后将消失</strong>（仅在当前会话内有效）'
    },
    'manual-sectionbox-copy-trouble1-title': {
        ja: 'コピーしたのに範囲が適用されない',
        en: 'Range is not applied even after copying',
        zh: '已复制但范围未被应用'
    },
    'manual-sectionbox-copy-trouble1-item1': {
        ja: 'コピー元のビューでセクションボックスが<strong>有効</strong>になっているか確認してください',
        en: 'Check that the section box is <strong>enabled</strong> in the source view',
        zh: '请确认复制源视图中的剖面框是否<strong>已启用</strong>'
    },
    'manual-sectionbox-copy-trouble1-item2': {
        ja: 'ペースト先が<strong>3Dビュー</strong>になっているか確認してください',
        en: 'Check that the paste destination is a <strong>3D view</strong>',
        zh: '请确认粘贴目标是否为<strong>三维视图</strong>'
    },
    'manual-sectionbox-copy-trouble2-title': {
        ja: 'ペースト後にモデルが見えなくなった',
        en: 'Model becomes invisible after pasting',
        zh: '粘贴后模型不可见'
    },
    'manual-sectionbox-copy-trouble2-item1': {
        ja: 'セクションボックスの範囲外にモデルがある場合、見えなくなります',
        en: 'If the model is outside the section box range, it will become invisible',
        zh: '如果模型位于剖面框范围外，将变得不可见'
    },
    'manual-sectionbox-copy-trouble2-item2': {
        ja: '「セクションボックス」チェックをオフにして範囲を確認・調整してください',
        en: 'Turn off the "Section Box" checkbox to check and adjust the range',
        zh: '请关闭"剖面框"复选框以确认和调整范围'
    },
    'manual-sectionbox-copy-related-viewcopy': {
        ja: '3Dビュー視点 コピー＆ペースト — 3Dビューのカメラ位置・向きをコピー',
        en: '3D View Point Copy & Paste — Copy the camera position and orientation of a 3D view',
        zh: '三维视点 复制＆粘贴 — 复制三维视图的相机位置和方向'
    },
    'manual-sectionbox-copy-related-cropbox': {
        ja: 'トリミング領域 コピー＆ペースト — 平面図・断面図などのトリミング領域をコピー',
        en: 'Crop Region Copy & Paste — Copy the crop region of floor plans, sections, etc.',
        zh: '裁剪区域 复制＆粘贴 — 复制平面图、剖面图等的裁剪区域'
    },
    'manual-sectionbox-copy-related-viewport': {
        ja: 'ビューポート位置 コピー＆ペースト — シート上のビューポート位置をコピー',
        en: 'Viewport Position Copy & Paste — Copy the viewport position on a sheet',
        zh: '视口位置 复制＆粘贴 — 复制图纸上的视口位置'
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
    'manual-viewport-pos-subtitle': {
        ja: 'シート上のビューポート位置をコピー＆ペースト',
        en: 'Copy & paste viewport positions on sheets',
        zh: '复制并粘贴图纸上的视口位置'
    },
    'manual-viewport-pos-overview': {
        ja: 'シート上のビューポート位置をコピーして、他のシートの同名ビューポートに自動的に貼り付ける機能です。複数のシートで同じビュー（例: 各階の平面図）を同じ位置に揃えたいときに便利です。',
        en: 'This feature copies the position of a viewport on a sheet and automatically pastes it onto viewports with the same name on other sheets. It is useful when you want to align the same view (e.g., floor plans of each level) to the same position across multiple sheets.',
        zh: '此功能可复制图纸上的视口位置，并自动粘贴到其他图纸上同名视口。当需要在多张图纸上将相同视图（如各楼层平面图）对齐到相同位置时非常方便。'
    },
    'manual-viewport-pos-feature1': {
        ja: 'シート上のビューポートの位置を記録し、<strong>ビュー名が一致するビューポート</strong>を他のシートで同じ位置に配置します',
        en: 'Records the position of a viewport on a sheet and places <strong>viewports with matching view names</strong> at the same position on other sheets',
        zh: '记录图纸上视口的位置，并将<strong>视图名称匹配的视口</strong>放置在其他图纸的相同位置'
    },
    'manual-viewport-pos-feature2': {
        ja: '複数のシートに続けてペーストするだけで、全シートのビューポート位置を一括で揃えられます',
        en: 'Simply paste to multiple sheets in sequence to align viewport positions across all sheets at once',
        zh: '只需依次粘贴到多张图纸，即可一次性对齐所有图纸的视口位置'
    },
    'section-usecases': {
        ja: '使用シーン',
        en: 'Use Cases',
        zh: '使用场景'
    },
    'manual-viewport-pos-col-scene': {
        ja: 'シーン',
        en: 'Scene',
        zh: '场景'
    },
    'manual-viewport-pos-col-operation': {
        ja: '操作',
        en: 'Operation',
        zh: '操作'
    },
    'manual-viewport-pos-scene1': {
        ja: '各階の平面図を同じ位置に揃えたい',
        en: 'Align floor plans of each level to the same position',
        zh: '将各楼层平面图对齐到相同位置'
    },
    'manual-viewport-pos-scene1-op': {
        ja: '1F平面図のVP位置をコピーし、2F・3F…のシートに順番にペースト',
        en: 'Copy the VP position of the 1F floor plan and paste sequentially to 2F, 3F… sheets',
        zh: '复制1F平面图的VP位置，依次粘贴到2F、3F…的图纸上'
    },
    'manual-viewport-pos-scene2': {
        ja: '改訂でシートを作り直した',
        en: 'Recreated sheets during revision',
        zh: '修订时重新创建了图纸'
    },
    'manual-viewport-pos-scene2-op': {
        ja: '元シートからVP位置をコピーして新シートに貼り付け',
        en: 'Copy VP position from the original sheet and paste to the new sheet',
        zh: '从原图纸复制VP位置并粘贴到新图纸'
    },
    'section-usage': {
        ja: '使い方',
        en: 'How to Use',
        zh: '使用方法'
    },
    'manual-viewport-pos-step1-title': {
        ja: 'ビューポート位置をコピー',
        en: 'Copy Viewport Position',
        zh: '复制视口位置'
    },
    'manual-viewport-pos-step1-sub1': {
        ja: '基準となるビューポートが配置された<strong>シートを開く</strong>',
        en: '<strong>Open the sheet</strong> where the reference viewport is placed',
        zh: '<strong>打开</strong>放置了基准视口的<strong>图纸</strong>'
    },
    'manual-viewport-pos-step1-sub2': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>ビュー</strong>」パネル →「<strong>VP位置コピー</strong>」をクリック',
        en: 'Ribbon「<strong>28 Tools</strong>」tab → 「<strong>View</strong>」panel → click「<strong>VP Position Copy</strong>」',
        zh: '功能区「<strong>28 Tools</strong>」选项卡 →「<strong>视图</strong>」面板 → 点击「<strong>VP位置复制</strong>」'
    },
    'manual-viewport-pos-step1-sub3': {
        ja: 'シート上の<strong>基準ビューポートをクリック</strong>して選択',
        en: '<strong>Click the reference viewport</strong> on the sheet to select it',
        zh: '点击图纸上的<strong>基准视口</strong>以选择它'
    },
    'manual-viewport-pos-step1-desc': {
        ja: 'ビューポートの位置情報（ビュー名と座標）がメモリに保存されます。',
        en: 'The viewport position information (view name and coordinates) is saved in memory.',
        zh: '视口位置信息（视图名称和坐标）将保存到内存中。'
    },
    'manual-viewport-pos-step2-title': {
        ja: 'ビューポート位置をペースト',
        en: 'Paste Viewport Position',
        zh: '粘贴视口位置'
    },
    'manual-viewport-pos-step2-sub1': {
        ja: '位置を合わせたい<strong>別のシートを開く</strong>',
        en: '<strong>Open another sheet</strong> where you want to align the position',
        zh: '<strong>打开另一张图纸</strong>（您希望对齐位置的图纸）'
    },
    'manual-viewport-pos-step2-sub2': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>ビュー</strong>」パネル →「<strong>VP位置ペースト</strong>」をクリック',
        en: 'Ribbon「<strong>28 Tools</strong>」tab → 「<strong>View</strong>」panel → click「<strong>VP Position Paste</strong>」',
        zh: '功能区「<strong>28 Tools</strong>」选项卡 →「<strong>视图</strong>」面板 → 点击「<strong>VP位置粘贴</strong>」'
    },
    'manual-viewport-pos-step2-desc': {
        ja: 'コピーしたビューポートと<strong>ビュー名が一致するビューポート</strong>が自動的に同じ位置に移動します。',
        en: '<strong>Viewports with matching view names</strong> are automatically moved to the same position as the copied viewport.',
        zh: '与复制的视口<strong>视图名称匹配的视口</strong>将自动移动到相同位置。'
    },
    'manual-viewport-pos-step2-tip': {
        ja: '💡 ペーストは何度でも繰り返せます。シートを切り替えながらペーストするだけで、全シートを揃えられます。',
        en: '💡 You can paste as many times as needed. Just switch sheets and paste to align all sheets.',
        zh: '💡 可以多次重复粘贴。只需切换图纸并粘贴，即可对齐所有图纸。'
    },
    'image-placeholder-text': {
        ja: '📷 スクリーンショット画像をここに追加予定',
        en: '📷 Screenshot image will be added here',
        zh: '📷 截图将在此处添加'
    },
    'section-notes': {
        ja: '注意事項',
        en: 'Notes',
        zh: '注意事项'
    },
    'manual-viewport-pos-note1': {
        ja: 'ビューポートの<strong>サイズ・スケールは変更されません</strong>。位置のみコピーされます',
        en: 'The viewport <strong>size and scale are not changed</strong>. Only the position is copied',
        zh: '视口的<strong>大小和比例不会更改</strong>。仅复制位置'
    },
    'manual-viewport-pos-note2': {
        ja: 'ビュー名が<strong>完全一致</strong>するビューポートのみが移動対象です',
        en: 'Only viewports with <strong>exactly matching</strong> view names are moved',
        zh: '仅移动视图名称<strong>完全匹配</strong>的视口'
    },
    'manual-viewport-pos-note3': {
        ja: 'コピーした情報は<strong>Revitを閉じると消えます</strong>（セッション内のみ有効）',
        en: 'The copied information <strong>is lost when Revit is closed</strong> (valid only within the session)',
        zh: '<strong>关闭Revit后复制的信息将消失</strong>（仅在会话内有效）'
    },
    'section-troubleshooting': {
        ja: 'トラブルシューティング',
        en: 'Troubleshooting',
        zh: '故障排除'
    },
    'manual-viewport-pos-trouble1-title': {
        ja: 'ペーストしてもビューポートが動かない',
        en: 'Viewport does not move after pasting',
        zh: '粘贴后视口未移动'
    },
    'manual-viewport-pos-trouble1-item1': {
        ja: 'コピー時に選択したビューポートの<strong>ビュー名</strong>と、ペースト先シートのビューポートのビュー名が一致しているか確認してください',
        en: 'Check that the <strong>view name</strong> of the viewport selected during copy matches the view name of the viewport on the destination sheet',
        zh: '请确认复制时选择的视口的<strong>视图名称</strong>与目标图纸上视口的视图名称是否一致'
    },
    'manual-viewport-pos-trouble1-item2': {
        ja: '「<strong>VP位置コピー</strong>」を先に実行しているか確認してください',
        en: 'Check that 「<strong>VP Position Copy</strong>」 has been executed first',
        zh: '请确认是否已先执行「<strong>VP位置复制</strong>」'
    },
    'section-related': {
        ja: '関連機能',
        en: 'Related Features',
        zh: '相关功能'
    },
    'manual-viewport-pos-related1': {
        ja: '3Dビュー視点 コピー＆ペースト',
        en: '3D View Camera Copy & Paste',
        zh: '3D视图视角复制粘贴'
    },
    'manual-viewport-pos-related1-desc': {
        ja: '3Dビューのカメラ位置・向きをコピー',
        en: 'Copy camera position and direction of 3D views',
        zh: '复制3D视图的摄像机位置和方向'
    },
    'manual-viewport-pos-related2': {
        ja: '切断ボックス コピー＆ペースト',
        en: 'Section Box Copy & Paste',
        zh: '剖面框复制粘贴'
    },
    'manual-viewport-pos-related2-desc': {
        ja: '3Dビューのセクションボックス範囲をコピー',
        en: 'Copy section box range of 3D views',
        zh: '复制3D视图的剖面框范围'
    },
    'manual-viewport-pos-related3': {
        ja: 'トリミング領域 コピー＆ペースト',
        en: 'Crop Region Copy & Paste',
        zh: '裁剪区域复制粘贴'
    },
    'manual-viewport-pos-related3-desc': {
        ja: 'ビューのトリミング領域をコピー',
        en: 'Copy the crop region of views',
        zh: '复制视图的裁剪区域'
    },
    'manual-viewport-pos-related4': {
        ja: 'シート一括作成',
        en: 'Batch Sheet Creation',
        zh: '批量创建图纸'
    },
    'manual-viewport-pos-related4-desc': {
        ja: '複数シートをまとめて作成',
        en: 'Create multiple sheets at once',
        zh: '批量创建多张图纸'
    },
    'breadcrumb-home': {
        ja: 'ホーム',
        en: 'Home',
        zh: '首页'
    },
    'breadcrumb-addins': {
        ja: 'アドイン',
        en: 'Add-ins',
        zh: '插件'
    },
    'back-to-home': {
        ja: '← ホームに戻る',
        en: '← Back to Home',
        zh: '← 返回首页'
    },
    'section-overview': {
        ja: '機能概要',
        en: 'Overview',
        zh: '功能概述'
    },
    'footer-share': {
        ja: 'このページをシェア：',
        en: 'Share this page:',
        zh: '分享此页面：'
    },
    'footer-about': {
        ja: '運営者情報',
        en: 'About',
        zh: '运营信息'
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
        en: 'Terms of Use',
        zh: '使用条款'
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
        en: 'Copy & paste view crop regions',
        zh: '复制并粘贴视图的裁剪区域'
    },
    'section-overview': {
        ja: '機能概要',
        en: 'Overview',
        zh: '功能概述'
    },
    'manual-cropbox-copy-overview': {
        ja: 'ビューのトリミング領域（クロップボックス）をコピーして、別のビューに貼り付ける機能です。同じ表示範囲を複数のビューで揃えるのに便利です。',
        en: 'This feature copies the crop region (crop box) of a view and pastes it onto another view. It is useful for aligning the same display range across multiple views.',
        zh: '此功能可复制视图的裁剪区域（裁剪框）并粘贴到另一个视图。非常适合在多个视图中统一相同的显示范围。'
    },
    'manual-cropbox-copy-feature1': {
        ja: 'ビューのトリミング領域（範囲・形状）を記録し、別のビューに適用します',
        en: 'Records the crop region (range and shape) of a view and applies it to another view',
        zh: '记录视图的裁剪区域（范围和形状）并将其应用于另一个视图'
    },
    'manual-cropbox-copy-feature2': {
        ja: 'ペースト先でトリミングが無効になっている場合は、<strong>自動的に有効化</strong>してから適用します',
        en: 'If cropping is disabled in the destination view, it is <strong>automatically enabled</strong> before applying',
        zh: '如果目标视图中的裁剪功能已禁用，将<strong>自动启用</strong>后再应用'
    },
    'section-usage': {
        ja: '使い方',
        en: 'How to Use',
        zh: '使用方法'
    },
    'manual-cropbox-copy-step1-title': {
        ja: 'トリミング領域をコピー',
        en: 'Copy Crop Region',
        zh: '复制裁剪区域'
    },
    'manual-cropbox-copy-step1-sub1': {
        ja: 'コピーしたいトリミング領域が設定された<strong>ビューをアクティブ</strong>にする',
        en: '<strong>Activate the view</strong> that has the crop region you want to copy',
        zh: '<strong>激活</strong>设置了要复制的裁剪区域的<strong>视图</strong>'
    },
    'manual-cropbox-copy-step1-sub2': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>ビュー</strong>」パネル →「<strong>トリミングコピー</strong>」をクリック',
        en: 'Ribbon「<strong>28 Tools</strong>」tab → 「<strong>View</strong>」panel → click「<strong>Crop Copy</strong>」',
        zh: '功能区「<strong>28 Tools</strong>」选项卡 →「<strong>视图</strong>」面板 → 点击「<strong>裁剪复制</strong>」'
    },
    'manual-cropbox-copy-step1-desc': {
        ja: 'トリミング領域の情報がメモリに保存されます。',
        en: 'The crop region information is saved in memory.',
        zh: '裁剪区域信息将保存到内存中。'
    },
    'manual-cropbox-copy-step2-title': {
        ja: 'トリミング領域をペースト',
        en: 'Paste Crop Region',
        zh: '粘贴裁剪区域'
    },
    'manual-cropbox-copy-step2-sub1': {
        ja: '同じトリミング範囲を適用したい<strong>別のビューをアクティブ</strong>にする',
        en: '<strong>Activate another view</strong> where you want to apply the same crop range',
        zh: '<strong>激活另一个视图</strong>（您希望应用相同裁剪范围的视图）'
    },
    'manual-cropbox-copy-step2-sub2': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>ビュー</strong>」パネル →「<strong>トリミングペースト</strong>」をクリック',
        en: 'Ribbon「<strong>28 Tools</strong>」tab → 「<strong>View</strong>」panel → click「<strong>Crop Paste</strong>」',
        zh: '功能区「<strong>28 Tools</strong>」选项卡 →「<strong>视图</strong>」面板 → 点击「<strong>裁剪粘贴</strong>」'
    },
    'manual-cropbox-copy-step2-desc': {
        ja: 'コピーしたトリミング領域が適用されます。',
        en: 'The copied crop region is applied.',
        zh: '复制的裁剪区域将被应用。'
    },
    'manual-cropbox-copy-step2-tip': {
        ja: '💡 トリミングが無効なビューにペーストしても、自動的に有効化されます。',
        en: '💡 Even if you paste to a view with cropping disabled, it will be automatically enabled.',
        zh: '💡 即使粘贴到裁剪功能已禁用的视图，也会自动启用。'
    },
    'image-placeholder-text': {
        ja: '📷 スクリーンショット画像をここに追加予定',
        en: '📷 Screenshot image will be added here',
        zh: '📷 截图将在此处添加'
    },
    'section-notes': {
        ja: '注意事項',
        en: 'Notes',
        zh: '注意事项'
    },
    'manual-cropbox-copy-note1': {
        ja: '<strong>同じスケール・同じ参照レベル</strong>のビュー間でコピーすると最も正確に一致します',
        en: 'The most accurate match is achieved when copying between views with <strong>the same scale and the same reference level</strong>',
        zh: '在<strong>相同比例和相同参照标高</strong>的视图之间复制时匹配最准确'
    },
    'manual-cropbox-copy-note2': {
        ja: 'スケールや参照レベルが異なるビュー間では、表示範囲がずれる場合があります',
        en: 'Between views with different scales or reference levels, the display range may be offset',
        zh: '在比例或参照标高不同的视图之间，显示范围可能会偏移'
    },
    'manual-cropbox-copy-note3': {
        ja: 'コピーした情報は<strong>Revitを閉じると消えます</strong>（セッション内のみ有効）',
        en: 'The copied information <strong>is lost when Revit is closed</strong> (valid only within the session)',
        zh: '<strong>关闭Revit后复制的信息将消失</strong>（仅在会话内有效）'
    },
    'manual-cropbox-copy-note4': {
        ja: '3Dビューのセクションボックスのコピーは「<strong>SBコピー / SBペースト</strong>」を使用してください',
        en: 'For copying section boxes in 3D views, use 「<strong>SB Copy / SB Paste</strong>」',
        zh: '复制3D视图的剖面框请使用「<strong>SB复制 / SB粘贴</strong>」'
    },
    'section-troubleshooting': {
        ja: 'トラブルシューティング',
        en: 'Troubleshooting',
        zh: '故障排除'
    },
    'manual-cropbox-copy-trouble1-title': {
        ja: 'ペースト後に表示範囲がずれている',
        en: 'Display range is offset after pasting',
        zh: '粘贴后显示范围发生偏移'
    },
    'manual-cropbox-copy-trouble1-item1': {
        ja: 'コピー元とペースト先のビューが<strong>同じスケールと参照レベル</strong>を持つか確認してください',
        en: 'Check that the source and destination views have <strong>the same scale and reference level</strong>',
        zh: '请确认源视图和目标视图是否具有<strong>相同的比例和参照标高</strong>'
    },
    'manual-cropbox-copy-trouble1-item2': {
        ja: '断面図・立面図など向きが異なるビュー間では意図した通りにならない場合があります',
        en: 'Between views with different orientations such as sections and elevations, results may not be as intended',
        zh: '在剖面图、立面图等方向不同的视图之间，结果可能与预期不符'
    },
    'manual-cropbox-copy-trouble2-title': {
        ja: 'ペーストしても変化がない',
        en: 'No change after pasting',
        zh: '粘贴后无变化'
    },
    'manual-cropbox-copy-trouble2-item1': {
        ja: '「<strong>トリミングコピー</strong>」を先に実行しているか確認してください',
        en: 'Check that 「<strong>Crop Copy</strong>」 has been executed first',
        zh: '请确认是否已先执行「<strong>裁剪复制</strong>」'
    },
    'manual-cropbox-copy-trouble2-item2': {
        ja: 'ビューテンプレートで制御されているビューでは変更できない場合があります',
        en: 'Views controlled by view templates may not be modifiable',
        zh: '由视图样板控制的视图可能无法修改'
    },
    'section-related': {
        ja: '関連機能',
        en: 'Related Features',
        zh: '相关功能'
    },
    'manual-cropbox-copy-related1': {
        ja: '3Dビュー視点 コピー＆ペースト',
        en: '3D View Camera Copy & Paste',
        zh: '3D视图视角复制粘贴'
    },
    'manual-cropbox-copy-related1-desc': {
        ja: '3Dビューのカメラ位置・向きをコピー',
        en: 'Copy camera position and direction of 3D views',
        zh: '复制3D视图的摄像机位置和方向'
    },
    'manual-cropbox-copy-related2': {
        ja: '切断ボックス コピー＆ペースト',
        en: 'Section Box Copy & Paste',
        zh: '剖面框复制粘贴'
    },
    'manual-cropbox-copy-related2-desc': {
        ja: '3Dビューのセクションボックス範囲をコピー',
        en: 'Copy section box range of 3D views',
        zh: '复制3D视图的剖面框范围'
    },
    'manual-cropbox-copy-related3': {
        ja: 'ビューポート位置 コピー＆ペースト',
        en: 'Viewport Position Copy & Paste',
        zh: '视口位置复制粘贴'
    },
    'manual-cropbox-copy-related3-desc': {
        ja: 'シート上のビューポート位置をコピー',
        en: 'Copy viewport positions on sheets',
        zh: '复制图纸上的视口位置'
    },
    'breadcrumb-home': {
        ja: 'ホーム',
        en: 'Home',
        zh: '首页'
    },
    'breadcrumb-addins': {
        ja: 'アドイン',
        en: 'Add-ins',
        zh: '插件'
    },
    'back-to-home': {
        ja: '← ホームに戻る',
        en: '← Back to Home',
        zh: '← 返回首页'
    },
    'footer-share': {
        ja: 'このページをシェア：',
        en: 'Share this page:',
        zh: '分享此页面：'
    },
    'footer-about': {
        ja: '運営者情報',
        en: 'About',
        zh: '运营信息'
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
        en: 'Terms of Use',
        zh: '使用条款'
    }
};

    // ========================================
    // room-tag.html (部屋タグ自動配置)
    // ========================================
translations.roomTag = {
    'manual-room-tag-title': {
        ja: '部屋タグ自動配置',
        en: 'Room Tag Auto Placement',
        zh: '房间标记自动放置'
    },
    'manual-room-tag-subtitle': {
        ja: '平面ビュー上のすべての部屋にルームタグを一括自動配置',
        en: 'Automatically place room tags on all rooms in a floor plan view at once',
        zh: '在平面视图中自动批量放置所有房间标记'
    },
    'section-overview': {
        ja: '機能概要',
        en: 'Overview',
        zh: '功能概述'
    },
    'manual-room-tag-overview': {
        ja: '平面ビュー上に配置されているすべての部屋（Room）に、ルームタグを一括で自動配置する機能です。部屋数が多いビューでも手作業なしにタグを揃えられます。使用するタグファミリ（タグタイプ）を選択でき、既にタグが配置されている部屋はスキップするか上書きするかを設定できます。',
        en: 'This feature automatically places room tags on all rooms (Room elements) in a floor plan view at once. Even in views with many rooms, tags can be placed without manual work. You can select the tag family (tag type) to use, and configure whether to skip or overwrite rooms that already have tags.',
        zh: '此功能可在平面视图中自动批量放置房间标记到所有房间（Room元素）。即使视图中有大量房间，也无需手动操作即可放置标记。可以选择要使用的标记族（标记类型），并设置是跳过还是覆盖已有标记的房间。'
    },
    'section-supported-views': {
        ja: '実行できるビュー',
        en: 'Supported Views',
        zh: '支持的视图'
    },
    'table-col-view-type': {
        ja: 'ビュー種別',
        en: 'View Type',
        zh: '视图类型'
    },
    'table-col-supported': {
        ja: '対応',
        en: 'Supported',
        zh: '支持'
    },
    'manual-room-tag-view-row1': {
        ja: '平面ビュー（FloorPlan）',
        en: 'Floor Plan',
        zh: '平面视图（FloorPlan）'
    },
    'manual-room-tag-view-row2': {
        ja: '天井伏図',
        en: 'Reflected Ceiling Plan',
        zh: '天花板平面图'
    },
    'manual-room-tag-view-row2-status': {
        ja: '△（部屋要素が表示されている場合）',
        en: '△ (when room elements are visible)',
        zh: '△（当房间元素显示时）'
    },
    'manual-room-tag-view-row3': {
        ja: '断面図・立面図・3Dビュー',
        en: 'Section / Elevation / 3D View',
        zh: '剖面图・立面图・3D视图'
    },
    'section-preparation': {
        ja: '実行前の準備',
        en: 'Preparation',
        zh: '执行前的准备'
    },
    'manual-room-tag-prep1-title': {
        ja: '部屋が配置されていることを確認する',
        en: 'Confirm that rooms are placed',
        zh: '确认已放置房间'
    },
    'manual-room-tag-prep1-item1': {
        ja: 'ビュー上に<strong>部屋（Room）が配置</strong>されていることを確認してください',
        en: 'Confirm that <strong>Room elements are placed</strong> in the view',
        zh: '请确认视图中已<strong>放置房间（Room）元素</strong>'
    },
    'manual-room-tag-prep1-item2': {
        ja: '部屋区画線（Room Separation Line）のみで部屋が作成されていない場合、タグは配置されません',
        en: 'If rooms are created only with Room Separation Lines without actual Room elements, tags will not be placed',
        zh: '如果仅使用房间分隔线（Room Separation Line）而没有实际的房间元素，标记将不会被放置'
    },
    'manual-room-tag-prep1-item3': {
        ja: 'ビューの「部屋」カテゴリが表示状態になっているか確認してください',
        en: 'Check that the "Rooms" category is set to visible in the view',
        zh: '请确认视图中的「房间」类别处于显示状态'
    },
    'manual-room-tag-prep2-title': {
        ja: 'タグファミリが読み込まれていることを確認する',
        en: 'Confirm that the tag family is loaded',
        zh: '确认已加载标记族'
    },
    'manual-room-tag-prep2-item1': {
        ja: 'プロジェクトにルームタグファミリが読み込まれている必要があります',
        en: 'A room tag family must be loaded into the project',
        zh: '项目中必须已加载房间标记族'
    },
    'manual-room-tag-prep2-item2': {
        ja: '読み込まれていない場合は、事前に「ファミリを読み込む」でルームタグファミリを追加してください',
        en: 'If not loaded, add a room tag family in advance using "Load Family"',
        zh: '如果未加载，请提前通过「载入族」添加房间标记族'
    },
    'section-usage': {
        ja: '使い方',
        en: 'How to Use',
        zh: '使用方法'
    },
    'manual-room-tag-step1-title': {
        ja: 'コマンドの起動',
        en: 'Launch the Command',
        zh: '启动命令'
    },
    'manual-room-tag-step1-desc': {
        ja: '部屋タグを配置したい平面ビューを<strong>アクティブ</strong>にしてから、リボン「<strong>28 Tools</strong>」タブ →「<strong>注釈・詳細</strong>」パネル →「<strong>部屋タグ自動配置</strong>」ボタンをクリックします。',
        en: '<strong>Activate</strong> the floor plan view where you want to place room tags, then click the Ribbon「<strong>28 Tools</strong>」tab → 「<strong>Annotation & Detail</strong>」panel → 「<strong>Room Tag Auto Placement</strong>」button.',
        zh: '先<strong>激活</strong>要放置房间标记的平面视图，然后点击功能区「<strong>28 Tools</strong>」选项卡 →「<strong>注释・详图</strong>」面板 →「<strong>房间标记自动放置</strong>」按钮。'
    },
    'manual-room-tag-step2-title': {
        ja: 'ダイアログで設定',
        en: 'Configure in the Dialog',
        zh: '在对话框中设置'
    },
    'manual-room-tag-step2-intro': {
        ja: 'ダイアログが開きます。以下の項目を設定してください。',
        en: 'A dialog opens. Configure the following settings.',
        zh: '对话框将打开。请配置以下设置。'
    },
    'table-col-item': {
        ja: '項目',
        en: 'Item',
        zh: '项目'
    },
    'table-col-content': {
        ja: '内容',
        en: 'Content',
        zh: '内容'
    },
    'manual-room-tag-dialog-row1-item': {
        ja: 'タグタイプ',
        en: 'Tag Type',
        zh: '标记类型'
    },
    'manual-room-tag-dialog-row1-content': {
        ja: '使用するルームタグファミリをドロップダウンから選択',
        en: 'Select the room tag family to use from the dropdown',
        zh: '从下拉菜单中选择要使用的房间标记族'
    },
    'manual-room-tag-dialog-row2-item': {
        ja: '配置オフセット',
        en: 'Placement Offset',
        zh: '放置偏移'
    },
    'manual-room-tag-dialog-row2-content': {
        ja: '部屋中心からのタグのオフセット量',
        en: 'Offset amount of the tag from the room center',
        zh: '标记相对于房间中心的偏移量'
    },
    'manual-room-tag-dialog-row3-item': {
        ja: '回転オプション',
        en: 'Rotation Option',
        zh: '旋转选项'
    },
    'manual-room-tag-dialog-row3-content': {
        ja: 'タグの向き（水平固定 / 部屋形状に合わせる）',
        en: 'Tag orientation (fixed horizontal / match room shape)',
        zh: '标记方向（水平固定 / 匹配房间形状）'
    },
    'manual-room-tag-step3-title': {
        ja: '配置を実行',
        en: 'Execute Placement',
        zh: '执行放置'
    },
    'manual-room-tag-step3-desc': {
        ja: '「<strong>配置</strong>」ボタンをクリックすると、ビュー上のすべての部屋にタグが配置されます。処理完了後、配置されたタグ数がメッセージで表示されます。',
        en: 'Click the 「<strong>Place</strong>」 button to place tags on all rooms in the view. After processing is complete, the number of tags placed is displayed in a message.',
        zh: '点击「<strong>放置</strong>」按钮，视图中所有房间将被放置标记。处理完成后，将通过消息显示已放置的标记数量。'
    },
    'image-placeholder-text': {
        ja: '📷 スクリーンショット画像をここに追加予定',
        en: '📷 Screenshot image will be added here',
        zh: '📷 截图将在此处添加'
    },
    'section-output': {
        ja: '出力結果',
        en: 'Output',
        zh: '输出结果'
    },
    'manual-room-tag-output1': {
        ja: 'ビュー上の各部屋の<strong>中心付近</strong>にルームタグが配置されます',
        en: 'Room tags are placed <strong>near the center</strong> of each room in the view',
        zh: '房间标记将被放置在视图中每个房间的<strong>中心附近</strong>'
    },
    'manual-room-tag-output2': {
        ja: '配置されたタグは通常のルームタグと同様に選択・移動・編集できます',
        en: 'Placed tags can be selected, moved, and edited just like regular room tags',
        zh: '放置的标记可以像普通房间标记一样进行选择、移动和编辑'
    },
    'section-usecases': {
        ja: '活用シーン',
        en: 'Use Cases',
        zh: '使用场景'
    },
    'manual-room-tag-usecase1-title': {
        ja: '部屋一覧の注釈作成',
        en: 'Creating Room Annotations',
        zh: '创建房间注释'
    },
    'manual-room-tag-usecase1-desc': {
        ja: '多数の部屋が配置された平面ビューでも、ボタン一つで全部屋にタグを配置できます。',
        en: 'Even in floor plan views with many rooms, you can place tags on all rooms with a single button.',
        zh: '即使在有大量房间的平面视图中，也可以通过一个按钮为所有房间放置标记。'
    },
    'manual-room-tag-usecase2-title': {
        ja: 'タグ種類の一括切り替え',
        en: 'Batch Tag Type Switching',
        zh: '批量切换标记类型'
    },
    'manual-room-tag-usecase2-desc': {
        ja: '使用するタグファミリを選んで実行するだけで、すべての部屋タグを統一できます。',
        en: 'Simply select the tag family and execute to unify all room tags.',
        zh: '只需选择标记族并执行，即可统一所有房间标记。'
    },
    'manual-room-tag-usecase3-title': {
        ja: '作業時間の短縮',
        en: 'Time Saving',
        zh: '节省工作时间'
    },
    'manual-room-tag-usecase3-desc': {
        ja: '手動でタグを1つずつ配置する手間を省き、大幅に時間を短縮できます。',
        en: 'Eliminate the need to place tags one by one manually, significantly reducing work time.',
        zh: '省去逐个手动放置标记的麻烦，大幅节省时间。'
    },
    'section-tips': {
        ja: 'Tips',
        en: 'Tips',
        zh: '提示'
    },
    'manual-room-tag-tip1': {
        ja: '<strong>タグが部屋の外に出る場合：</strong>部屋の形状が複雑（L字形・細長い形状など）な場合、中心位置がずれることがあります。配置後にRevit上でタグを手動で移動してください。',
        en: '<strong>If the tag ends up outside the room:</strong> When a room has a complex shape (L-shaped, elongated, etc.), the center position may be offset. Manually move the tag in Revit after placement.',
        zh: '<strong>如果标记出现在房间外部：</strong>当房间形状复杂（L形、细长形等）时，中心位置可能会偏移。放置后请在Revit中手动移动标记。'
    },
    'manual-room-tag-tip2': {
        ja: '<strong>タグが重なる場合：</strong>小さな部屋が隣接している場合、タグが重なることがあります。Revit上で手動でタグの位置を調整してください。',
        en: '<strong>If tags overlap:</strong> When small rooms are adjacent, tags may overlap. Manually adjust tag positions in Revit.',
        zh: '<strong>如果标记重叠：</strong>当小房间相邻时，标记可能会重叠。请在Revit中手动调整标记位置。'
    },
    'section-notes': {
        ja: '注意事項',
        en: 'Notes',
        zh: '注意事项'
    },
    'manual-room-tag-note1': {
        ja: '平面ビューに部屋要素が配置されていない場合は使用できません。',
        en: 'Cannot be used if no room elements are placed in the floor plan view.',
        zh: '如果平面视图中没有放置房间元素，则无法使用。'
    },
    'manual-room-tag-note2': {
        ja: '部屋区画線（Room Separation Line）だけでは部屋になりません。「建築」タブ →「部屋」で部屋を配置してください。',
        en: 'Room Separation Lines alone do not create rooms. Place rooms using the "Architecture" tab → "Room".',
        zh: '仅使用房间分隔线（Room Separation Line）不能创建房间。请通过「建筑」选项卡 →「房间」放置房间。'
    },
    'manual-room-tag-note3': {
        ja: 'プロジェクトにルームタグファミリが読み込まれていない場合、タグタイプの選択肢が表示されません。事前にファミリを読み込んでください。',
        en: 'If no room tag family is loaded in the project, no tag type options will be displayed. Load the family in advance.',
        zh: '如果项目中没有加载房间标记族，则不会显示标记类型选项。请提前加载族。'
    },
    'section-troubleshooting': {
        ja: 'トラブルシューティング',
        en: 'Troubleshooting',
        zh: '故障排除'
    },
    'manual-room-tag-trouble1-title': {
        ja: '「ビュー内に部屋が見つかりません」と表示される',
        en: '"No rooms found in view" message is displayed',
        zh: '显示「视图中未找到房间」'
    },
    'manual-room-tag-trouble1-item1': {
        ja: '平面ビューに<strong>部屋要素</strong>が配置されているか確認してください',
        en: 'Check that <strong>Room elements</strong> are placed in the floor plan view',
        zh: '请确认平面视图中是否已放置<strong>房间元素</strong>'
    },
    'manual-room-tag-trouble1-item2': {
        ja: '部屋区画線（Room Separation Line）だけでは部屋になりません。「建築」タブ →「部屋」で部屋を配置してください',
        en: 'Room Separation Lines alone do not create rooms. Place rooms using "Architecture" tab → "Room"',
        zh: '仅使用房间分隔线（Room Separation Line）不能创建房间。请通过「建筑」选项卡 →「房间」放置房间'
    },
    'manual-room-tag-trouble1-item3': {
        ja: 'ビューフィルタや「部屋」カテゴリの表示設定を確認してください',
        en: 'Check the view filter and visibility settings for the "Rooms" category',
        zh: '请检查视图过滤器和「房间」类别的显示设置'
    },
    'manual-room-tag-trouble2-title': {
        ja: 'タグが部屋の外に配置される',
        en: 'Tags are placed outside the room',
        zh: '标记被放置在房间外部'
    },
    'manual-room-tag-trouble2-item1': {
        ja: '部屋の形状が複雑（L字形・細長い形状など）な場合、中心位置がずれることがあります',
        en: 'When a room has a complex shape (L-shaped, elongated, etc.), the center position may be offset',
        zh: '当房间形状复杂（L形、细长形等）时，中心位置可能会偏移'
    },
    'manual-room-tag-trouble2-item2': {
        ja: '配置後にRevit上でタグを手動で移動してください',
        en: 'Manually move the tag in Revit after placement',
        zh: '放置后请在Revit中手动移动标记'
    },
    'manual-room-tag-trouble3-title': {
        ja: 'タグが重なって表示される',
        en: 'Tags are displayed overlapping',
        zh: '标记重叠显示'
    },
    'manual-room-tag-trouble3-item1': {
        ja: '小さな部屋が隣接している場合、タグが重なることがあります',
        en: 'When small rooms are adjacent, tags may overlap',
        zh: '当小房间相邻时，标记可能会重叠'
    },
    'manual-room-tag-trouble3-item2': {
        ja: 'Revit上で手動でタグの位置を調整してください',
        en: 'Manually adjust tag positions in Revit',
        zh: '请在Revit中手动调整标记位置'
    },
    'manual-room-tag-trouble4-title': {
        ja: '使いたいタグタイプが選択肢に表示されない',
        en: 'The desired tag type is not shown in the options',
        zh: '想使用的标记类型未显示在选项中'
    },
    'manual-room-tag-trouble4-item1': {
        ja: 'プロジェクトに対象のルームタグファミリが読み込まれているか確認してください',
        en: 'Check that the target room tag family is loaded in the project',
        zh: '请确认项目中是否已加载目标房间标记族'
    },
    'manual-room-tag-trouble4-item2': {
        ja: '「挿入」タブ →「ファミリを読み込む」でタグファミリを追加してください',
        en: 'Add the tag family using "Insert" tab → "Load Family"',
        zh: '请通过「插入」选项卡 →「载入族」添加标记族'
    },
    'section-related': {
        ja: '関連機能',
        en: 'Related Features',
        zh: '相关功能'
    },
    'manual-room-tag-related1': {
        ja: 'シート一括作成',
        en: 'Batch Sheet Creation',
        zh: '批量创建图纸'
    },
    'manual-room-tag-related1-desc': {
        ja: ' — 複数シートをまとめて作成',
        en: ' — Create multiple sheets at once',
        zh: ' — 批量创建多张图纸'
    },
    'manual-room-tag-related2': {
        ja: '塗潰し領域 分割/統合',
        en: 'Filled Region Split/Merge',
        zh: '填充区域 分割/合并'
    },
    'manual-room-tag-related2-desc': {
        ja: ' — 塗潰し領域の分割・統合',
        en: ' — Split and merge filled regions',
        zh: ' — 填充区域的分割与合并'
    },
    'breadcrumb-home': {
        ja: 'ホーム',
        en: 'Home',
        zh: '首页'
    },
    'breadcrumb-addins': {
        ja: 'アドイン',
        en: 'Add-ins',
        zh: '插件'
    },
    'back-to-home': {
        ja: '← ホームに戻る',
        en: '← Back to Home',
        zh: '← 返回首页'
    },
    'footer-share': {
        ja: 'このページをシェア：',
        en: 'Share this page:',
        zh: '分享此页面：'
    },
    'footer-about': {
        ja: '運営者情報',
        en: 'About',
        zh: '运营信息'
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
        en: 'Terms of Use',
        zh: '使用条款'
    }
};

    // ========================================
    // beam-bottom-color.html (梁下端色分け)
    // ========================================
    translations.beamBottomColor = {
        'manual-beam-bottom-title': {
            ja: '梁下端色分け',
            en: 'Beam Bottom Level Coloring',
            zh: '梁底标高着色'
        },
        'manual-beam-bottom-subtitle': {
            ja: '梁の下端レベルを自動計算しパステルカラーで色分け',
            en: 'Auto-calculate beam bottom levels and color-code with pastel colors',
            zh: '自动计算梁底标高并用柔和颜色着色'
        },
        'manual-beam-bottom-overview': {
            ja: '天井伏図上の梁について、梁の下端レベル（＝階高＋天端オフセット−梁高さ）を自動計算し、レベル値ごとにパステルカラーで色分け表示する機能です。フィルタの自動作成、梁上へのラベル表示、凡例ビューの生成までを一括で行います。',
            en: 'This feature automatically calculates the beam bottom level (= story height + top offset - beam height) for beams in ceiling plans, and color-codes them by level value using pastel colors. It handles filter creation, label placement on beams, and legend view generation all at once.',
            zh: '此功能自动计算天花板平面图中梁的底部标高（=层高+顶部偏移-梁高），并按标高值用柔和颜色着色。一次性完成过滤器创建、梁上标签放置和图例视图生成。'
        },
        'manual-beam-bottom-feature1': {
            ja: '天井伏図専用の梁下端レベル自動計算',
            en: 'Automatic beam bottom level calculation for ceiling plans',
            zh: '天花板平面图专用梁底标高自动计算'
        },
        'manual-beam-bottom-feature2': {
            ja: 'ファミリ毎に異なるパラメータを選択可能（梁高さ・天端レベル）',
            en: 'Selectable parameters per family (beam height, top level)',
            zh: '每个族可选择不同的参数（梁高·顶部标高）'
        },
        'manual-beam-bottom-feature3': {
            ja: 'パラメータ候補を自動検出（検出数表示）',
            en: 'Auto-detect parameter candidates (with count display)',
            zh: '自动检测参数候选项（显示检测数量）'
        },
        'manual-beam-bottom-feature4': {
            ja: '10色パステルカラーによる色分けフィルタ自動生成',
            en: 'Auto-generate color-coding filters with 10 pastel colors',
            zh: '使用10种柔和颜色自动生成着色过滤器'
        },
        'manual-beam-bottom-feature5': {
            ja: '梁上に下端レベル値のラベル（TextNote）を自動配置',
            en: 'Auto-place bottom level labels (TextNote) on beams',
            zh: '在梁上自动放置底部标高标签（TextNote）'
        },
        'manual-beam-bottom-feature6': {
            ja: '凡例（製図ビュー）を自動生成',
            en: 'Auto-generate legend (drafting view)',
            zh: '自动生成图例（制图视图）'
        },
        'manual-beam-bottom-feature7': {
            ja: 'エラー梁は赤色で表示',
            en: 'Error beams displayed in red',
            zh: '错误梁显示为红色'
        },
        'manual-beam-bottom-step1-title': {
            ja: '天井伏図を開く',
            en: 'Open Ceiling Plan',
            zh: '打开天花板平面图'
        },
        'manual-beam-bottom-step1-desc': {
            ja: '梁が表示されている天井伏図をアクティブにします。',
            en: 'Activate the ceiling plan where beams are displayed.',
            zh: '激活显示梁的天花板平面图。'
        },
        'manual-beam-bottom-step2-title': {
            ja: 'ボタンをクリック',
            en: 'Click Button',
            zh: '点击按钮'
        },
        'manual-beam-bottom-step2-desc': {
            ja: 'リボンの「構造」パネルから「梁下端 色分け」をクリックします。',
            en: 'Click "Beam Bottom Coloring" from the "Structure" panel on the ribbon.',
            zh: '从功能区的"结构"面板中点击"梁底 着色"。'
        },
        'manual-beam-bottom-step3-title': {
            ja: 'ステップ1：レベル設定',
            en: 'Step 1: Level Settings',
            zh: '步骤1：标高设置'
        },
        'manual-beam-bottom-step3-desc': {
            ja: '参照レベル（自動取得）を確認し、上位レベルを選択、文字タイプを選択します。',
            en: 'Confirm the reference level (auto-detected), select the upper level, and choose text type.',
            zh: '确认参照标高（自动获取），选择上层标高，选择文字类型。'
        },
        'manual-beam-bottom-step4-title': {
            ja: 'ステップ2：梁高さパラメータ選択',
            en: 'Step 2: Beam Height Parameter Selection',
            zh: '步骤2：梁高参数选择'
        },
        'manual-beam-bottom-step4-desc': {
            ja: 'ファミリ毎に梁の高さパラメータを選択します。候補はラジオボタン、その他はComboBoxから選択できます。',
            en: 'Select beam height parameter for each family. Candidates are shown as radio buttons, others via ComboBox.',
            zh: '为每个族选择梁高参数。候选项显示为单选按钮，其他通过ComboBox选择。'
        },
        'manual-beam-bottom-step5-title': {
            ja: 'ステップ3：天端レベルパラメータ選択',
            en: 'Step 3: Top Level Parameter Selection',
            zh: '步骤3：顶部标高参数选择'
        },
        'manual-beam-bottom-step5-desc': {
            ja: 'ファミリ毎に天端レベルパラメータを選択します。',
            en: 'Select top level parameter for each family.',
            zh: '为每个族选择顶部标高参数。'
        },
        'manual-beam-bottom-step6-title': {
            ja: 'ステップ4：処理確認・実行',
            en: 'Step 4: Confirm and Execute',
            zh: '步骤4：确认处理并执行'
        },
        'manual-beam-bottom-step6-desc': {
            ja: '処理内容を確認し、「実行」をクリックします。梁が色分けされ、ラベルと凡例ビューが生成されます。',
            en: 'Confirm the processing details and click "Execute". Beams will be color-coded, and labels and legend view will be generated.',
            zh: '确认处理内容并点击"执行"。梁将被着色，并生成标签和图例视图。'
        },
        'manual-beam-bottom-usecase1-title': {
            ja: '天井高さの確認',
            en: 'Ceiling Height Verification',
            zh: '天花板高度确认'
        },
        'manual-beam-bottom-usecase1-desc': {
            ja: '梁下端のレベルを視覚的に確認し、天井高さの干渉チェックに活用できます。',
            en: 'Visually check beam bottom levels to verify ceiling height clearances.',
            zh: '通过可视化确认梁底标高，用于天花板高度干涉检查。'
        },
        'manual-beam-bottom-usecase2-title': {
            ja: '設備調整',
            en: 'MEP Coordination',
            zh: '设备协调'
        },
        'manual-beam-bottom-usecase2-desc': {
            ja: '空調・電気・衛生設備のルーティング計画時に、梁下端の位置を把握できます。',
            en: 'Understand beam bottom positions when planning HVAC, electrical, and plumbing routes.',
            zh: '在规划暖通、电气、卫生设备路由时，可以了解梁底位置。'
        },
        'manual-beam-bottom-usecase3-title': {
            ja: '図面レビュー',
            en: 'Drawing Review',
            zh: '图纸审查'
        },
        'manual-beam-bottom-usecase3-desc': {
            ja: '色分けにより、梁レベルの異常値を素早く発見できます。',
            en: 'Quickly identify abnormal beam level values through color-coding.',
            zh: '通过颜色区分，快速发现梁标高异常值。'
        },
        'manual-beam-bottom-tip1': {
            ja: '梁ファミリのパラメータを自動で検出し、候補を表示します。検出数も確認できます。',
            en: 'Beam family parameters are auto-detected and displayed as candidates. Detection counts are also shown.',
            zh: '自动检测梁族参数并显示候选项。还可以确认检测数量。'
        },
        'manual-beam-bottom-tip1-strong': {
            ja: 'パラメータ自動検出：',
            en: 'Auto Parameter Detection:',
            zh: '参数自动检测：'
        },
        'manual-beam-bottom-tip2': {
            ja: '自動生成された凡例ビューをシートに配置することで、色分けの意味を明確にできます。',
            en: 'Place the auto-generated legend view on sheets to clarify the meaning of color-coding.',
            zh: '将自动生成的图例视图放置在图纸上，明确着色的含义。'
        },
        'manual-beam-bottom-tip2-strong': {
            ja: '凡例の活用：',
            en: 'Use Legend:',
            zh: '使用图例：'
        },
        'manual-beam-bottom-tip3': {
            ja: '赤色で表示される梁はパラメータの取得に失敗した梁です。パラメータ設定を確認してください。',
            en: 'Beams displayed in red failed to retrieve parameters. Please check the parameter settings.',
            zh: '显示为红色的梁是参数获取失败的梁。请检查参数设置。'
        },
        'manual-beam-bottom-tip3-strong': {
            ja: 'エラー梁の確認：',
            en: 'Check Error Beams:',
            zh: '检查错误梁：'
        },
        'manual-beam-bottom-note1': {
            ja: '天井伏図でのみ使用できます。平面図では「梁天端色分け」をご利用ください。',
            en: 'Can only be used in ceiling plans. For floor plans, use "Beam Top Level Coloring".',
            zh: '仅可在天花板平面图中使用。平面图请使用"梁顶标高着色"。'
        },
        'manual-beam-bottom-note2': {
            ja: 'ビューフィルタが自動作成されます。既存のフィルタと名前が重複する場合は上書きされます。',
            en: 'View filters are automatically created. If names conflict with existing filters, they will be overwritten.',
            zh: '会自动创建视图过滤器。如果与现有过滤器名称重复，将被覆盖。'
        },
        'manual-beam-bottom-note3': {
            ja: '梁ファミリに適切なパラメータ（梁高さ・天端レベル）が設定されている必要があります。',
            en: 'Beam families must have appropriate parameters (beam height, top level) configured.',
            zh: '梁族必须设置适当的参数（梁高·顶部标高）。'
        }
    };

    // ========================================
    // beam-top-color.html (梁天端色分け)
    // ========================================
    translations.beamTopColor = {
        'manual-beam-top-title': {
            ja: '梁天端色分け',
            en: 'Beam Top Level Coloring',
            zh: '梁顶标高着色'
        },
        'manual-beam-top-subtitle': {
            ja: '梁の天端レベルをパステルカラーで色分け表示',
            en: 'Color-code beam top levels with pastel colors',
            zh: '用柔和颜色显示梁顶标高着色'
        },
        'manual-beam-top-overview': {
            ja: '平面ビューまたは構造伏図上の梁について、天端レベルパラメータの値をそのまま取得し、レベル値ごとにパステルカラーで色分け表示する機能です。梁下端色分けの簡略版で、計算式不要でパラメータ値を直接使用します。',
            en: 'This feature retrieves the top level parameter value directly for beams in plan views or structural framing plans, and color-codes them by level value using pastel colors. It is a simplified version of Beam Bottom Coloring that uses parameter values directly without calculations.',
            zh: '此功能直接获取平面视图或结构伏图中梁的顶部标高参数值，并按标高值用柔和颜色着色。这是梁底着色的简化版，无需计算直接使用参数值。'
        },
        'manual-beam-top-feature1': {
            ja: '平面ビュー・構造伏図対応',
            en: 'Supports plan views and structural framing plans',
            zh: '支持平面视图和结构伏图'
        },
        'manual-beam-top-feature2': {
            ja: 'パラメータ値を直接取得（複雑な計算不要）',
            en: 'Direct parameter value retrieval (no complex calculations needed)',
            zh: '直接获取参数值（无需复杂计算）'
        },
        'manual-beam-top-feature3': {
            ja: 'ファミリ毎に天端レベルパラメータを選択可能',
            en: 'Selectable top level parameter per family',
            zh: '每个族可选择顶部标高参数'
        },
        'manual-beam-top-feature4': {
            ja: 'パラメータ候補を自動検出（検出数表示）',
            en: 'Auto-detect parameter candidates (with count display)',
            zh: '自动检测参数候选项（显示检测数量）'
        },
        'manual-beam-top-feature5': {
            ja: '10色パステルカラーによる色分けフィルタ自動生成',
            en: 'Auto-generate color-coding filters with 10 pastel colors',
            zh: '使用10种柔和颜色自动生成着色过滤器'
        },
        'manual-beam-top-feature6': {
            ja: '梁上に天端レベル値のラベル（TextNote）を自動配置',
            en: 'Auto-place top level labels (TextNote) on beams',
            zh: '在梁上自动放置顶部标高标签（TextNote）'
        },
        'manual-beam-top-feature7': {
            ja: '凡例（製図ビュー）を自動生成',
            en: 'Auto-generate legend (drafting view)',
            zh: '自动生成图例（制图视图）'
        },
        'manual-beam-top-feature8': {
            ja: 'エラー梁は赤色で表示',
            en: 'Error beams displayed in red',
            zh: '错误梁显示为红色'
        },
        'manual-beam-top-step1-title': {
            ja: '平面ビューまたは構造伏図を開く',
            en: 'Open Plan View or Structural Plan',
            zh: '打开平面视图或结构伏图'
        },
        'manual-beam-top-step1-desc': {
            ja: '梁が表示されているビューをアクティブにします。',
            en: 'Activate the view where beams are displayed.',
            zh: '激活显示梁的视图。'
        },
        'manual-beam-top-step2-title': {
            ja: 'ボタンをクリック',
            en: 'Click Button',
            zh: '点击按钮'
        },
        'manual-beam-top-step2-desc': {
            ja: 'リボンの「構造」パネルから「梁天端 色分け」をクリックします。',
            en: 'Click "Beam Top Coloring" from the "Structure" panel on the ribbon.',
            zh: '从功能区的"结构"面板中点击"梁顶 着色"。'
        },
        'manual-beam-top-step3-title': {
            ja: 'ステップ1：基本設定',
            en: 'Step 1: Basic Settings',
            zh: '步骤1：基本设置'
        },
        'manual-beam-top-step3-desc': {
            ja: 'ビュー情報・参照レベル（自動取得）を確認し、文字タイプを選択します。',
            en: 'Confirm view information and reference level (auto-detected), and select text type.',
            zh: '确认视图信息和参照标高（自动获取），选择文字类型。'
        },
        'manual-beam-top-step4-title': {
            ja: 'ステップ2：天端レベルパラメータ選択',
            en: 'Step 2: Top Level Parameter Selection',
            zh: '步骤2：顶部标高参数选择'
        },
        'manual-beam-top-step4-desc': {
            ja: 'ファミリ毎に天端レベルパラメータを選択します。候補はラジオボタン、その他はComboBoxから選択できます。',
            en: 'Select top level parameter for each family. Candidates are shown as radio buttons, others via ComboBox.',
            zh: '为每个族选择顶部标高参数。候选项显示为单选按钮，其他通过ComboBox选择。'
        },
        'manual-beam-top-step5-title': {
            ja: 'ステップ3：処理確認・実行',
            en: 'Step 3: Confirm and Execute',
            zh: '步骤3：确认处理并执行'
        },
        'manual-beam-top-step5-desc': {
            ja: '処理内容を確認し、「実行」をクリックします。梁が色分けされ、ラベルと凡例ビューが生成されます。',
            en: 'Confirm the processing details and click "Execute". Beams will be color-coded, and labels and legend view will be generated.',
            zh: '确认处理内容并点击"执行"。梁将被着色，并生成标签和图例视图。'
        },
        'manual-beam-top-usecase1-title': {
            ja: '構造レベルの確認',
            en: 'Structural Level Verification',
            zh: '结构标高确认'
        },
        'manual-beam-top-usecase1-desc': {
            ja: '梁天端のレベルを色分けで視覚的に確認し、構造計画の整合性をチェックできます。',
            en: 'Visually check beam top levels through color-coding to verify structural plan consistency.',
            zh: '通过颜色区分可视化确认梁顶标高，检查结构计划的一致性。'
        },
        'manual-beam-top-usecase2-title': {
            ja: '設計レビュー',
            en: 'Design Review',
            zh: '设计审查'
        },
        'manual-beam-top-usecase2-desc': {
            ja: '梁天端の高さを一目で把握でき、設計レビュー時の確認作業を効率化します。',
            en: 'Quickly grasp beam top heights at a glance, streamlining verification during design reviews.',
            zh: '一目了然地把握梁顶高度，提高设计审查时的确认工作效率。'
        },
        'manual-beam-top-usecase3-title': {
            ja: '異常値の発見',
            en: 'Anomaly Detection',
            zh: '异常值发现'
        },
        'manual-beam-top-usecase3-desc': {
            ja: '色分けにより、意図しないレベル値の梁を素早く発見できます。',
            en: 'Quickly find beams with unintended level values through color-coding.',
            zh: '通过颜色区分，快速发现具有非预期标高值的梁。'
        },
        'manual-beam-top-tip1': {
            ja: '天井伏図の場合は「梁下端色分け」、平面図・構造伏図の場合は「梁天端色分け」をご利用ください。',
            en: 'Use "Beam Bottom Coloring" for ceiling plans, and "Beam Top Coloring" for floor plans and structural plans.',
            zh: '天花板平面图请使用"梁底着色"，平面图·结构伏图请使用"梁顶着色"。'
        },
        'manual-beam-top-tip1-strong': {
            ja: '梁下端との使い分け：',
            en: 'Choose the Right Tool:',
            zh: '与梁底的区分使用：'
        },
        'manual-beam-top-tip2': {
            ja: '梁下端色分けと比べてステップが少なく、パラメータ値を直接使用するため操作がシンプルです。',
            en: 'Fewer steps compared to Beam Bottom Coloring, with simpler operation using direct parameter values.',
            zh: '与梁底着色相比步骤更少，直接使用参数值操作更简单。'
        },
        'manual-beam-top-tip2-strong': {
            ja: 'シンプルな操作：',
            en: 'Simple Operation:',
            zh: '简单操作：'
        },
        'manual-beam-top-tip3': {
            ja: '自動生成された凡例ビューをシートに配置して、色分けの意味を明示できます。',
            en: 'Place the auto-generated legend view on sheets to clarify the meaning of color-coding.',
            zh: '将自动生成的图例视图放置在图纸上，明确着色的含义。'
        },
        'manual-beam-top-tip3-strong': {
            ja: '凡例の活用：',
            en: 'Use Legend:',
            zh: '使用图例：'
        },
        'manual-beam-top-note1': {
            ja: '平面ビューまたは構造伏図でのみ使用できます。天井伏図では「梁下端色分け」をご利用ください。',
            en: 'Can only be used in plan views or structural plans. For ceiling plans, use "Beam Bottom Level Coloring".',
            zh: '仅可在平面视图或结构伏图中使用。天花板平面图请使用"梁底标高着色"。'
        },
        'manual-beam-top-note2': {
            ja: 'ビューフィルタが自動作成されます。既存のフィルタと名前が重複する場合は上書きされます。',
            en: 'View filters are automatically created. If names conflict with existing filters, they will be overwritten.',
            zh: '会自动创建视图过滤器。如果与现有过滤器名称重复，将被覆盖。'
        },
        'manual-beam-top-note3': {
            ja: '梁ファミリに天端レベルのパラメータが設定されている必要があります。',
            en: 'Beam families must have a top level parameter configured.',
            zh: '梁族必须设置顶部标高参数。'
        }
    };

    // ========================================
    // beam-level-color.html (梁レベル色分け)
    // ========================================
    translations.beamLevelColor = {
    'manual-beam-level-title': {
        ja: '梁レベル色分け',
        en: 'Beam Level Coloring',
        zh: '梁标高颜色标注'
    },
    'manual-beam-level-subtitle': {
        ja: '梁の天端・下端レベルをパステルカラーで色分け表示',
        en: 'Color-code beam top and bottom levels with pastel colors',
        zh: '用柔和色彩标注梁的顶部和底部标高'
    },
    'manual-beam-level-overview': {
        ja: '梁を天端レベルまたは下端レベルの値ごとに色分け表示する機能です。ビュー上でレベルの異なる梁を視覚的にすばやく把握できます。どちらの機能も、色分けされた塗潰し領域・梁ラベル（TextNote）・凡例ビューを自動作成します。',
        en: 'A feature that color-codes beams by their top or bottom level values. Quickly visualize beams at different levels in the view. Both features automatically create color-coded filled regions, beam labels (TextNote), and a legend view.',
        zh: '按梁的顶部或底部标高值进行颜色标注的功能。可在视图中快速直观地识别不同标高的梁。两种功能都会自动创建颜色标注的填充区域、梁标签（TextNote）和图例视图。'
    },
    'manual-beam-level-ribbon': {
        ja: 'リボン: 「<strong>28 Tools</strong>」タブ →「<strong>構造</strong>」パネル',
        en: 'Ribbon: "<strong>28 Tools</strong>" tab → "<strong>Structure</strong>" panel',
        zh: '功能区：「<strong>28 Tools</strong>」选项卡 →「<strong>结构</strong>」面板'
    },
    'manual-beam-level-diff-title': {
        ja: '機能の違い',
        en: 'Feature Differences',
        zh: '功能区别'
    },
    'manual-beam-level-diff-col-feature': {
        ja: '機能',
        en: 'Feature',
        zh: '功能'
    },
    'manual-beam-level-diff-col-button': {
        ja: 'ボタン名',
        en: 'Button Name',
        zh: '按钮名称'
    },
    'manual-beam-level-diff-col-basis': {
        ja: '色分けの基準',
        en: 'Color-coding Basis',
        zh: '颜色标注依据'
    },
    'manual-beam-level-diff-col-steps': {
        ja: 'ステップ数',
        en: 'Steps',
        zh: '步骤数'
    },
    'manual-beam-level-diff-row1-feature': {
        ja: '<strong>梁天端色分け</strong>',
        en: '<strong>Beam Top Coloring</strong>',
        zh: '<strong>梁顶端颜色标注</strong>'
    },
    'manual-beam-level-diff-row1-button': {
        ja: '梁天端色分け',
        en: 'Beam Top Coloring',
        zh: '梁顶端颜色标注'
    },
    'manual-beam-level-diff-row1-view': {
        ja: '平面ビュー・構造伏図',
        en: 'Floor Plan / Engineering Plan',
        zh: '平面视图·结构平面图'
    },
    'manual-beam-level-diff-row1-basis': {
        ja: '天端レベルオフセット値をそのまま使用',
        en: 'Uses the top level offset value as-is',
        zh: '直接使用顶端标高偏移值'
    },
    'manual-beam-level-diff-row2-feature': {
        ja: '<strong>梁下端色分け</strong>',
        en: '<strong>Beam Bottom Coloring</strong>',
        zh: '<strong>梁底端颜色标注</strong>'
    },
    'manual-beam-level-diff-row2-button': {
        ja: '梁下端色分け',
        en: 'Beam Bottom Coloring',
        zh: '梁底端颜色标注'
    },
    'manual-beam-level-diff-row2-view': {
        ja: '天井伏図',
        en: 'Ceiling Plan',
        zh: '天花板平面图'
    },
    'manual-beam-level-diff-row2-basis': {
        ja: '階高 + 天端オフセット − 梁高さ で計算',
        en: 'Calculated as: Story Height + Top Offset − Beam Height',
        zh: '计算公式：层高 + 顶端偏移 − 梁高'
    },
    'manual-beam-level-top-section-title': {
        ja: '梁天端色分け',
        en: 'Beam Top Level Coloring',
        zh: '梁顶端颜色标注'
    },
    'manual-beam-level-top-view-row1-name': {
        ja: '<strong>平面ビュー（FloorPlan）</strong>',
        en: '<strong>Floor Plan (FloorPlan)</strong>',
        zh: '<strong>平面视图（FloorPlan）</strong>'
    },
    'manual-beam-level-top-view-row1-behavior': {
        ja: '天端レベルオフセット値で色分け。参照レベルはビューの GenLevel から自動取得',
        en: 'Color-coded by top level offset value. Reference level is automatically obtained from the view\'s GenLevel.',
        zh: '按顶端标高偏移值颜色标注。参考标高从视图的GenLevel自动获取。'
    },
    'manual-beam-level-top-view-row2-name': {
        ja: '<strong>構造伏図（EngineeringPlan）</strong>',
        en: '<strong>Engineering Plan (EngineeringPlan)</strong>',
        zh: '<strong>结构平面图（EngineeringPlan）</strong>'
    },
    'manual-beam-level-top-view-row2-behavior': {
        ja: '天端レベルオフセット値で色分け。参照レベルはビューの GenLevel から自動取得',
        en: 'Color-coded by top level offset value. Reference level is automatically obtained from the view\'s GenLevel.',
        zh: '按顶端标高偏移值颜色标注。参考标高从视图的GenLevel自动获取。'
    },
    'manual-beam-level-view-other': {
        ja: 'その他',
        en: 'Other',
        zh: '其他'
    },
    'manual-beam-level-view-na': {
        ja: '実行不可',
        en: 'Not supported',
        zh: '不支持'
    },
    'manual-beam-level-bottom-section-title': {
        ja: '梁下端色分け',
        en: 'Beam Bottom Level Coloring',
        zh: '梁底端颜色标注'
    },
    'manual-beam-level-bottom-view-row1-name': {
        ja: '<strong>天井伏図（CeilingPlan）</strong>',
        en: '<strong>Ceiling Plan (CeilingPlan)</strong>',
        zh: '<strong>天花板平面图（CeilingPlan）</strong>'
    },
    'manual-beam-level-bottom-view-row1-behavior': {
        ja: '計算した下端レベル値で色分け',
        en: 'Color-coded by calculated bottom level value',
        zh: '按计算的底端标高值颜色标注'
    },
    'manual-beam-level-top-step1-title': {
        ja: 'コマンド起動',
        en: 'Launch Command',
        zh: '启动命令'
    },
    'manual-beam-level-top-step1-desc': {
        ja: '平面ビューまたは構造伏図をアクティブにして「<strong>梁天端色分け</strong>」をクリックします。',
        en: 'Activate a floor plan or engineering plan view and click "<strong>Beam Top Coloring</strong>".',
        zh: '激活平面视图或结构平面图，然后点击「<strong>梁顶端颜色标注</strong>」。'
    },
    'manual-beam-level-top-step2-title': {
        ja: 'STEP 1 — 基本設定',
        en: 'STEP 1 — Basic Settings',
        zh: 'STEP 1 — 基本设置'
    },
    'manual-beam-level-top-setting-row1-name': {
        ja: '<strong>参照レベル</strong>',
        en: '<strong>Reference Level</strong>',
        zh: '<strong>参考标高</strong>'
    },
    'manual-beam-level-top-setting-row1-desc': {
        ja: 'ビューの GenLevel（自動取得・変更不可）',
        en: 'View\'s GenLevel (auto-obtained, cannot be changed)',
        zh: '视图的GenLevel（自动获取，不可更改）'
    },
    'manual-beam-level-top-setting-row2-name': {
        ja: '<strong>文字タイプ</strong>',
        en: '<strong>Text Type</strong>',
        zh: '<strong>文字类型</strong>'
    },
    'manual-beam-level-top-setting-row2-desc': {
        ja: 'ラベルに使用するテキストタイプを選択',
        en: 'Select the text type to use for labels',
        zh: '选择用于标签的文字类型'
    },
    'manual-beam-level-top-step3-title': {
        ja: 'STEP 2 — 天端パラメータ選択',
        en: 'STEP 2 — Select Top Parameter',
        zh: 'STEP 2 — 选择顶端参数'
    },
    'manual-beam-level-top-step3-desc': {
        ja: 'ファミリごとに天端レベルオフセットを格納したパラメータを選択します。自動検出された候補がラジオボタンで表示されます（カッコ内は検出件数）。候補にない場合は「<strong>その他</strong>」ドロップダウンから選択。',
        en: 'Select the parameter storing the top level offset for each family. Automatically detected candidates are shown as radio buttons (count in parentheses). If not in the candidates, select from the "<strong>Other</strong>" dropdown.',
        zh: '为每个族选择存储顶端标高偏移的参数。自动检测到的候选项以单选按钮显示（括号内为检测数量）。如果不在候选项中，从「<strong>其他</strong>」下拉菜单选择。'
    },
    'manual-beam-level-top-step4-title': {
        ja: 'STEP 3 — 確認と実行',
        en: 'STEP 3 — Confirm and Execute',
        zh: 'STEP 3 — 确认并执行'
    },
    'manual-beam-level-top-step4-desc': {
        ja: '処理対象の梁数を確認し、「<strong>実行</strong>」をクリック。再実行する場合は <strong>「既存の『梁天端_』塗潰領域・凡例を上書き」</strong> にチェックしてください。',
        en: 'Confirm the number of beams to process and click "<strong>Execute</strong>". When re-running, check <strong>"Overwrite existing \'Beam Top_\' filled regions and legend"</strong>.',
        zh: '确认要处理的梁数量，然后点击「<strong>执行</strong>」。重新执行时，请勾选<strong>「覆盖现有的"梁顶端_"填充区域和图例」</strong>。'
    },
    'manual-beam-level-bottom-intro': {
        ja: '天井伏図の梁を、計算した下端レベル値ごとに色分けします。',
        en: 'Color-codes beams in a ceiling plan by their calculated bottom level values.',
        zh: '按计算的底端标高值对天花板平面图中的梁进行颜色标注。'
    },
    'manual-beam-level-formula-label': {
        ja: '下端レベルの計算式：',
        en: 'Bottom level calculation formula:',
        zh: '底端标高计算公式：'
    },
    'manual-beam-level-formula-item1': {
        ja: '<strong>階高</strong> = 上位レベル標高 − 参照レベル標高（例: 3000mm）',
        en: '<strong>Story Height</strong> = Upper Level Elevation − Reference Level Elevation (e.g., 3000mm)',
        zh: '<strong>层高</strong> = 上层标高 − 参考标高（例：3000mm）'
    },
    'manual-beam-level-formula-item2': {
        ja: '<strong>天端オフセット</strong> = 梁の天端パラメータ値（上位レベルからの下がりは負値。例: −300mm）',
        en: '<strong>Top Offset</strong> = Beam top parameter value (drops from upper level are negative. e.g., −300mm)',
        zh: '<strong>顶端偏移</strong> = 梁的顶端参数值（从上层标高向下为负值，例：−300mm）'
    },
    'manual-beam-level-formula-item3': {
        ja: '<strong>梁高さ</strong> = 梁高さパラメータ値（例: 600mm）',
        en: '<strong>Beam Height</strong> = Beam height parameter value (e.g., 600mm)',
        zh: '<strong>梁高</strong> = 梁高参数值（例：600mm）'
    },
    'manual-beam-level-formula-item4': {
        ja: '結果は参照レベル基準で表示（例: +2100 → 参照レベルから2100mm上）',
        en: 'Result displayed relative to reference level (e.g., +2100 → 2100mm above reference level)',
        zh: '结果相对于参考标高显示（例：+2100 → 参考标高以上2100mm）'
    },
    'manual-beam-level-bottom-step1-title': {
        ja: 'コマンド起動',
        en: 'Launch Command',
        zh: '启动命令'
    },
    'manual-beam-level-bottom-step1-desc': {
        ja: '天井伏図をアクティブにして「<strong>梁下端色分け</strong>」をクリックします。',
        en: 'Activate a ceiling plan view and click "<strong>Beam Bottom Coloring</strong>".',
        zh: '激活天花板平面图视图，然后点击「<strong>梁底端颜色标注</strong>」。'
    },
    'manual-beam-level-bottom-step2-title': {
        ja: 'STEP 1 — レベル設定',
        en: 'STEP 1 — Level Settings',
        zh: 'STEP 1 — 标高设置'
    },
    'manual-beam-level-bottom-setting-row1-name': {
        ja: '<strong>参照レベル</strong>',
        en: '<strong>Reference Level</strong>',
        zh: '<strong>参考标高</strong>'
    },
    'manual-beam-level-bottom-setting-row1-desc': {
        ja: 'ビューの GenLevel（自動取得・変更不可）',
        en: 'View\'s GenLevel (auto-obtained, cannot be changed)',
        zh: '视图的GenLevel（自动获取，不可更改）'
    },
    'manual-beam-level-bottom-setting-row2-name': {
        ja: '<strong>上位レベル</strong>',
        en: '<strong>Upper Level</strong>',
        zh: '<strong>上层标高</strong>'
    },
    'manual-beam-level-bottom-setting-row2-desc': {
        ja: '梁が配置されているレベルを選択（参照レベルより上のみ表示）',
        en: 'Select the level where beams are placed (only levels above the reference level are shown)',
        zh: '选择放置梁的标高（仅显示参考标高以上的标高）'
    },
    'manual-beam-level-bottom-setting-row3-name': {
        ja: '<strong>階高</strong>',
        en: '<strong>Story Height</strong>',
        zh: '<strong>层高</strong>'
    },
    'manual-beam-level-bottom-setting-row3-desc': {
        ja: '選択後に自動表示',
        en: 'Automatically displayed after selection',
        zh: '选择后自动显示'
    },
    'manual-beam-level-bottom-step3-title': {
        ja: 'STEP 2 — 梁高さパラメータ選択',
        en: 'STEP 2 — Select Beam Height Parameter',
        zh: 'STEP 2 — 选择梁高参数'
    },
    'manual-beam-level-bottom-step3-desc': {
        ja: 'ファミリごとに梁高さ（断面高さ）を格納したパラメータを選択します。',
        en: 'Select the parameter storing the beam height (cross-section height) for each family.',
        zh: '为每个族选择存储梁高（截面高度）的参数。'
    },
    'manual-beam-level-bottom-step4-title': {
        ja: 'STEP 3 — 天端パラメータ選択',
        en: 'STEP 3 — Select Top Parameter',
        zh: 'STEP 3 — 选择顶端参数'
    },
    'manual-beam-level-bottom-step4-desc': {
        ja: 'ファミリごとに天端レベルオフセットを格納したパラメータを選択します。',
        en: 'Select the parameter storing the top level offset for each family.',
        zh: '为每个族选择存储顶端标高偏移的参数。'
    },
    'manual-beam-level-bottom-step5-title': {
        ja: 'STEP 4 — 確認と実行',
        en: 'STEP 4 — Confirm and Execute',
        zh: 'STEP 4 — 确认并执行'
    },
    'manual-beam-level-bottom-step5-desc': {
        ja: '処理対象の梁数を確認し、「<strong>実行</strong>」をクリック。再実行する場合は <strong>「既存の『梁下_』塗潰領域・凡例を上書き」</strong> にチェックしてください。',
        en: 'Confirm the number of beams to process and click "<strong>Execute</strong>". When re-running, check <strong>"Overwrite existing \'Beam Bottom_\' filled regions and legend"</strong>.',
        zh: '确认要处理的梁数量，然后点击「<strong>执行</strong>」。重新执行时，请勾选<strong>「覆盖现有的"梁底端_"填充区域和图例」</strong>。'
    },
    'manual-beam-level-output-intro': {
        ja: '実行後、以下が自動作成されます（梁天端・梁下端共通）。',
        en: 'After execution, the following are automatically created (common to both beam top and bottom).',
        zh: '执行后，以下内容将自动创建（梁顶端和梁底端通用）。'
    },
    'manual-beam-level-output-col-item': {
        ja: '出力物',
        en: 'Output',
        zh: '输出物'
    },
    'manual-beam-level-output-col-content': {
        ja: '内容',
        en: 'Description',
        zh: '内容'
    },
    'manual-beam-level-output-row1-name': {
        ja: '<strong>塗潰し領域</strong>',
        en: '<strong>Filled Regions</strong>',
        zh: '<strong>填充区域</strong>'
    },
    'manual-beam-level-output-row1-desc': {
        ja: '梁ごとにレベル値の色で塗潰し。フィルタ名: <code>梁天端_{レベル名}{±値}</code> / <code>梁下_{レベル名}{±値}</code>',
        en: 'Each beam filled with the color of its level value. Filter name: <code>BeamTop_{LevelName}{±Value}</code> / <code>BeamBottom_{LevelName}{±Value}</code>',
        zh: '每根梁用其标高值的颜色填充。过滤器名称：<code>梁天端_{标高名}{±值}</code> / <code>梁下_{标高名}{±值}</code>'
    },
    'manual-beam-level-output-row2-name': {
        ja: '<strong>梁ラベル</strong>',
        en: '<strong>Beam Labels</strong>',
        zh: '<strong>梁标签</strong>'
    },
    'manual-beam-level-output-row2-desc': {
        ja: '梁の中央にレベル値を TextNote で配置。梁の方向に合わせて回転',
        en: 'Level value placed as TextNote at the center of each beam. Rotated to match beam direction.',
        zh: '在每根梁的中心以TextNote放置标高值，按梁的方向旋转。'
    },
    'manual-beam-level-output-row3-name': {
        ja: '<strong>凡例ビュー</strong>',
        en: '<strong>Legend View</strong>',
        zh: '<strong>图例视图</strong>'
    },
    'manual-beam-level-output-row3-desc': {
        ja: '<code>梁天端色分け凡例</code> / <code>梁下端色分け凡例</code>（プロジェクトブラウザの製図ビューに表示）',
        en: '<code>Beam Top Color Legend</code> / <code>Beam Bottom Color Legend</code> (shown in drafting views in Project Browser)',
        zh: '<code>梁天端色分け凡例</code> / <code>梁下端色分け凡例</code>（在项目浏览器的绘图视图中显示）'
    },
    'manual-beam-level-output-row4-name': {
        ja: '<strong>共有パラメータ</strong>',
        en: '<strong>Shared Parameters</strong>',
        zh: '<strong>共享参数</strong>'
    },
    'manual-beam-level-output-row4-desc': {
        ja: '<code>梁天端_基準レベル</code>・<code>梁天端_レベル差</code> など（梁要素に自動付与）',
        en: '<code>BeamTop_RefLevel</code>, <code>BeamTop_LevelDiff</code>, etc. (automatically assigned to beam elements)',
        zh: '<code>梁天端_基准标高</code>、<code>梁天端_标高差</code>等（自动分配给梁图元）'
    },
    'manual-beam-level-trouble-row1-symptom': {
        ja: 'ビュー内に梁が見つからない',
        en: 'No beams found in the view',
        zh: '视图中找不到梁'
    },
    'manual-beam-level-trouble-row1-action': {
        ja: '梁（構造フレーム）がビュー上で表示されているか確認。フィルタや非表示設定を確認',
        en: 'Check if beams (structural frames) are visible in the view. Check filters and hidden settings.',
        zh: '确认梁（结构框架）在视图中是否可见。检查过滤器和隐藏设置。'
    },
    'manual-beam-level-trouble-row2-symptom': {
        ja: 'パラメータが候補に表示されない',
        en: 'Parameter does not appear in candidates',
        zh: '参数未出现在候选项中'
    },
    'manual-beam-level-trouble-row2-action': {
        ja: '「その他」ドロップダウンを開いて手動選択。それでも見つからない場合はファミリのパラメータ定義を確認',
        en: 'Open the "Other" dropdown and select manually. If still not found, check the family\'s parameter definitions.',
        zh: '打开"其他"下拉菜单手动选择。如果仍然找不到，请检查族的参数定义。'
    },
    'manual-beam-level-trouble-row3-symptom': {
        ja: '上位レベルが選択肢にない（梁下端）',
        en: 'Upper level not in the options (beam bottom)',
        zh: '上层标高不在选项中（梁底端）'
    },
    'manual-beam-level-trouble-row3-action': {
        ja: '参照レベルより上のレベルがプロジェクトに定義されているか確認',
        en: 'Check if levels above the reference level are defined in the project',
        zh: '确认项目中是否定义了参考标高以上的标高'
    },
    'manual-beam-level-trouble-row4-symptom': {
        ja: '計算結果が予想と異なる（梁下端）',
        en: 'Calculation result differs from expectation (beam bottom)',
        zh: '计算结果与预期不同（梁底端）'
    },
    'manual-beam-level-trouble-row4-action': {
        ja: '上位レベルの選択が正しいか、天端オフセットの符号（正/負）を確認',
        en: 'Check if the upper level selection is correct and verify the sign (positive/negative) of the top offset',
        zh: '检查上层标高选择是否正确，验证顶端偏移的符号（正/负）'
    },
    'manual-beam-level-trouble-row5-symptom': {
        ja: '色が似ていて見分けにくい',
        en: 'Colors are similar and hard to distinguish',
        zh: '颜色相似难以区分'
    },
    'manual-beam-level-trouble-row5-action': {
        ja: 'ビュー → フィルタから色を手動変更できます',
        en: 'You can manually change colors from View → Filters',
        zh: '可以从视图 → 过滤器手动更改颜色'
    },
    'manual-beam-level-trouble-row6-symptom': {
        ja: '再実行しても古い色分けが残る',
        en: 'Old color-coding remains even after re-running',
        zh: '重新执行后旧的颜色标注仍然存在'
    },
    'manual-beam-level-trouble-row6-action': {
        ja: 'STEP 3/4 の「上書き」チェックをONにして再実行',
        en: 'Enable the "Overwrite" checkbox in STEP 3/4 and re-run',
        zh: '在STEP 3/4中启用"覆盖"复选框后重新执行'
    },
    'manual-beam-level-related-fire': {
        ja: '耐火被覆色分け',
        en: 'Fire Protection Coloring',
        zh: '耐火覆盖颜色标注'
    },
    'manual-beam-level-related-fire-desc': {
        ja: ' — 梁・柱の耐火被覆範囲を色分け表示',
        en: ' — Color-code fire protection range of beams and columns',
        zh: ' — 颜色标注梁和柱的耐火覆盖范围'
    },
    'manual-beam-level-related-formwork': {
        ja: '型枠数量算出',
        en: 'Formwork Calculator',
        zh: '模板数量计算'
    },
    'manual-beam-level-related-formwork-desc': {
        ja: ' — 梁・柱を含むRC躯体の型枠面積を算出',
        en: ' — Calculate formwork area of RC structure including beams and columns',
        zh: ' — 计算包含梁和柱的RC结构的模板面积'
    }
};

    // ========================================
    // excel-export.html (Excelエクスポート)
    // ========================================
translations.excelExport = {
    'manual-excel-export-title': {
        ja: 'Excelエクスポート',
        en: 'Excel Export',
        zh: 'Excel导出'
    },
    'manual-excel-export-subtitle': {
        ja: '要素パラメータをカテゴリ別にExcelへ書き出し',
        en: 'Export element parameters to Excel by category',
        zh: '按类别将元素参数导出到Excel'
    },
    'manual-excel-export-overview': {
        ja: 'Revit要素のパラメータ値をExcelファイル（.xlsx）に書き出す機能です。パラメータの一括確認・納品用の数量書き出しに活用できます。エクスポート範囲を<strong>プロジェクト全体 / アクティブビュー / 選択要素</strong>から選べ、インスタンスパラメータ・タイプパラメータの両方に対応しています。通り芯・レベル・シートなどの注釈カテゴリにも対応し、前回の設定（カテゴリ・パラメータ選択）を自動復元します。',
        en: 'Exports Revit element parameter values to an Excel file (.xlsx). Useful for bulk parameter review or quantity takeoffs for deliverables. You can choose the export scope from <strong>Entire Project / Active View / Selected Elements</strong>, and it supports both instance and type parameters. Annotation categories such as grids, levels, and sheets are also supported. Previous settings (category and parameter selection) are automatically restored.',
        zh: '将Revit元素的参数值导出到Excel文件（.xlsx）。可用于批量确认参数或导出交付用数量表。导出范围可从<strong>整个项目 / 活动视图 / 选定图元</strong>中选择，同时支持实例参数和类型参数。轴网、标高、图纸等注释类别也受支持，并自动恢复上次的设置（类别和参数选择）。'
    },
    'manual-excel-export-feature1': {
        ja: 'カテゴリ別にシート分割して出力',
        en: 'Output split into sheets by category',
        zh: '按类别分工作表输出'
    },
    'manual-excel-export-feature2': {
        ja: 'インスタンスパラメータ（I-）/ タイプパラメータ（T-）を区別',
        en: 'Distinguishes instance parameters (I-) from type parameters (T-)',
        zh: '区分实例参数（I-）和类型参数（T-）'
    },
    'manual-excel-export-feature3': {
        ja: '出力パラメータと列順をドラッグ＆ドロップ感覚で選択・並替え',
        en: 'Select and reorder output parameters and column order by drag and drop',
        zh: '通过拖放选择和重新排列输出参数和列顺序'
    },
    'manual-excel-export-feature4': {
        ja: 'カテゴリ・パラメータの検索フィルタ',
        en: 'Search filter for categories and parameters',
        zh: '类别和参数的搜索过滤器'
    },
    'manual-excel-export-feature5': {
        ja: '設定の保存・読込・リセット（JSON形式）',
        en: 'Save, load, and reset settings (JSON format)',
        zh: '保存、加载和重置设置（JSON格式）'
    },
    'manual-excel-export-feature6': {
        ja: '数値は数値型で書き込み（Excel警告なし）',
        en: 'Numbers written as numeric type (no Excel warnings)',
        zh: '数值以数值类型写入（无Excel警告）'
    },
    'manual-excel-export-feature7': {
        ja: 'ヘッダー行に緑背景＋白文字＋オートフィルタ自動設定',
        en: 'Header row with green background + white text + auto filter automatically applied',
        zh: '标题行自动设置绿色背景＋白色文字＋自动筛选'
    },
    'manual-excel-export-feature8': {
        ja: 'エクスポート後に自動でExcelファイルを開く',
        en: 'Automatically opens the Excel file after export',
        zh: '导出后自动打开Excel文件'
    },
    'manual-excel-export-step1-title': {
        ja: 'コマンドの起動',
        en: 'Launch the Command',
        zh: '启动命令'
    },
    'manual-excel-export-step1-desc': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>データ</strong>」パネル →「<strong>EXCELエクスポート</strong>」ボタンをクリックします。',
        en: 'Click the "<strong>EXCEL Export</strong>" button in the "<strong>Data</strong>" panel under the "<strong>28 Tools</strong>" ribbon tab.',
        zh: '点击功能区「<strong>28 Tools</strong>」选项卡 →「<strong>数据</strong>」面板 →「<strong>EXCEL导出</strong>」按钮。'
    },
    'manual-excel-export-step2-title': {
        ja: 'エクスポート範囲の選択',
        en: 'Select Export Scope',
        zh: '选择导出范围'
    },
    'manual-excel-export-step2-desc': {
        ja: 'スコープ選択ダイアログが表示されます。',
        en: 'The scope selection dialog will appear.',
        zh: '将显示范围选择对话框。'
    },
    'manual-excel-export-scope-row1-name': {
        ja: '<strong>プロジェクト全体</strong>',
        en: '<strong>Entire Project</strong>',
        zh: '<strong>整个项目</strong>'
    },
    'manual-excel-export-scope-row1-desc': {
        ja: 'プロジェクト内のすべての要素',
        en: 'All elements in the project',
        zh: '项目中的所有图元'
    },
    'manual-excel-export-scope-row2-name': {
        ja: '<strong>アクティブビュー</strong>',
        en: '<strong>Active View</strong>',
        zh: '<strong>活动视图</strong>'
    },
    'manual-excel-export-scope-row2-desc': {
        ja: '現在表示中のビューに存在する要素のみ',
        en: 'Only elements present in the currently active view',
        zh: '仅活动视图中存在的图元'
    },
    'manual-excel-export-scope-row3-name': {
        ja: '<strong>選択要素</strong>',
        en: '<strong>Selected Elements</strong>',
        zh: '<strong>选定图元</strong>'
    },
    'manual-excel-export-scope-row3-desc': {
        ja: '事前に選択しておいた要素のみ',
        en: 'Only elements selected in advance',
        zh: '仅预先选定的图元'
    },
    'manual-excel-export-step3-title': {
        ja: 'カテゴリとパラメータの選択',
        en: 'Select Categories and Parameters',
        zh: '选择类别和参数'
    },
    'manual-excel-export-step3-desc': {
        ja: '設定ダイアログが開きます。',
        en: 'The settings dialog will open.',
        zh: '设置对话框将打开。'
    },
    'manual-excel-export-setting-row1-name': {
        ja: '<strong>カテゴリ一覧</strong>',
        en: '<strong>Category List</strong>',
        zh: '<strong>类别列表</strong>'
    },
    'manual-excel-export-setting-row1-desc': {
        ja: 'エクスポートしたいカテゴリにチェックを入れる（検索ボックスで絞り込み可）',
        en: 'Check the categories to export (can be filtered using the search box)',
        zh: '勾选要导出的类别（可通过搜索框筛选）'
    },
    'manual-excel-export-setting-row2-name': {
        ja: '<strong>パラメータ一覧</strong>',
        en: '<strong>Parameter List</strong>',
        zh: '<strong>参数列表</strong>'
    },
    'manual-excel-export-setting-row2-desc': {
        ja: '各カテゴリでエクスポートするパラメータを選択',
        en: 'Select the parameters to export for each category',
        zh: '为每个类别选择要导出的参数'
    },
    'manual-excel-export-setting-row3-name': {
        ja: '<strong>カテゴリ別シート</strong>',
        en: '<strong>Sheet per Category</strong>',
        zh: '<strong>按类别分工作表</strong>'
    },
    'manual-excel-export-setting-row3-desc': {
        ja: 'カテゴリごとに別シートへ出力（デフォルト）',
        en: 'Output each category to a separate sheet (default)',
        zh: '每个类别输出到独立工作表（默认）'
    },
    'manual-excel-export-setting-row4-name': {
        ja: '<strong>シート統合</strong>',
        en: '<strong>Merged Sheet</strong>',
        zh: '<strong>合并工作表</strong>'
    },
    'manual-excel-export-setting-row4-desc': {
        ja: '全カテゴリを1枚の「データ」シートにまとめて出力',
        en: 'Output all categories into a single "Data" sheet',
        zh: '将所有类别合并输出到一个"数据"工作表'
    },
    'manual-excel-export-step3-tip': {
        ja: '💡 前回の設定は自動的に復元されます。毎回同じ設定で出力する場合は2回目以降の操作が省略できます。',
        en: '💡 Previous settings are automatically restored. If you always use the same settings, you can skip the configuration from the second run onward.',
        zh: '💡 上次的设置将自动恢复。如果每次使用相同设置，第二次起可省略配置步骤。'
    },
    'manual-excel-export-step4-title': {
        ja: 'ファイルを保存',
        en: 'Save the File',
        zh: '保存文件'
    },
    'manual-excel-export-step4-desc': {
        ja: '「<strong>エクスポート</strong>」ボタンをクリックし、保存先とファイル名を指定します。',
        en: 'Click the "<strong>Export</strong>" button and specify the destination folder and file name.',
        zh: '点击「<strong>导出</strong>」按钮，指定保存位置和文件名。'
    },
    'manual-excel-export-output-row1-name': {
        ja: '<strong>シート構成</strong>',
        en: '<strong>Sheet Structure</strong>',
        zh: '<strong>工作表结构</strong>'
    },
    'manual-excel-export-output-row1-desc': {
        ja: 'カテゴリ別シート（デフォルト）、またはシート統合モードで1シート',
        en: 'Per-category sheets (default), or a single sheet in merged mode',
        zh: '按类别分工作表（默认），或合并模式下的单一工作表'
    },
    'manual-excel-export-output-row2-name': {
        ja: '<strong>ヘッダー行</strong>',
        en: '<strong>Header Row</strong>',
        zh: '<strong>标题行</strong>'
    },
    'manual-excel-export-output-row2-desc': {
        ja: '要素ID | カテゴリ | パラメータ名...',
        en: 'Element ID | Category | Parameter Name...',
        zh: '图元ID | 类别 | 参数名...'
    },
    'manual-excel-export-output-row3-name': {
        ja: '<strong>パラメータ接頭辞</strong>',
        en: '<strong>Parameter Prefix</strong>',
        zh: '<strong>参数前缀</strong>'
    },
    'manual-excel-export-output-row3-desc': {
        ja: '<code>I-</code>（インスタンスパラメータ）/ <code>T-</code>（タイプパラメータ）',
        en: '<code>I-</code> (Instance Parameter) / <code>T-</code> (Type Parameter)',
        zh: '<code>I-</code>（实例参数）/ <code>T-</code>（类型参数）'
    },
    'manual-excel-export-output-row4-name': {
        ja: '<strong>ヘッダー色</strong>',
        en: '<strong>Header Color</strong>',
        zh: '<strong>标题颜色</strong>'
    },
    'manual-excel-export-output-row4-desc': {
        ja: '緑（RGB: 155, 187, 89）＋白文字',
        en: 'Green (RGB: 155, 187, 89) + white text',
        zh: '绿色（RGB: 155, 187, 89）＋白色文字'
    },
    'manual-excel-export-output-row5-name': {
        ja: '<strong>フォント</strong>',
        en: '<strong>Font</strong>',
        zh: '<strong>字体</strong>'
    },
    'manual-excel-export-output-row5-desc': {
        ja: 'ＭＳ 明朝',
        en: 'MS Mincho',
        zh: 'MS明朝'
    },
    'manual-excel-export-output-row6-name': {
        ja: '<strong>数値</strong>',
        en: '<strong>Numbers</strong>',
        zh: '<strong>数值</strong>'
    },
    'manual-excel-export-output-row6-desc': {
        ja: '数値型で保存（文字列ではない）',
        en: 'Saved as numeric type (not string)',
        zh: '以数值类型保存（非字符串）'
    },
    'manual-excel-export-output-row7-name': {
        ja: '<strong>オートフィルタ</strong>',
        en: '<strong>Auto Filter</strong>',
        zh: '<strong>自动筛选</strong>'
    },
    'manual-excel-export-output-row7-desc': {
        ja: '自動設定済み',
        en: 'Automatically applied',
        zh: '已自动设置'
    },
    'manual-excel-export-usecase1-title': {
        ja: '数量集計・見積もり',
        en: 'Quantity Takeoff & Estimation',
        zh: '数量统计与估算'
    },
    'manual-excel-export-usecase1-desc': {
        ja: '要素のパラメータをExcelに書き出して、数量集計や見積作業に活用できます。',
        en: 'Export element parameters to Excel for quantity takeoffs and estimation work.',
        zh: '将图元参数导出到Excel，用于数量统计和估算工作。'
    },
    'manual-excel-export-usecase2-title': {
        ja: 'パラメータの一括確認',
        en: 'Bulk Parameter Review',
        zh: '批量参数审查'
    },
    'manual-excel-export-usecase2-desc': {
        ja: 'モデル全体のパラメータ値をExcelで俯瞰でき、入力ミスや抜け漏れを発見しやすくなります。',
        en: 'Get an overview of all parameter values in the model via Excel, making it easier to spot input errors or missing data.',
        zh: '通过Excel全面查看模型中的参数值，便于发现输入错误或遗漏。'
    },
    'manual-excel-export-usecase3-title': {
        ja: 'Excelインポートとの連携',
        en: 'Round-trip with Excel Import',
        zh: '与Excel导入联动'
    },
    'manual-excel-export-usecase3-desc': {
        ja: 'エクスポートしたファイルをExcelで編集し、「Excelインポート」で書き戻す双方向ワークフローを実現できます。',
        en: 'Edit the exported file in Excel and write it back using "Excel Import" to achieve a bidirectional workflow.',
        zh: '在Excel中编辑导出的文件，然后通过"Excel导入"写回，实现双向工作流程。'
    },
    'manual-excel-export-tip1': {
        ja: '<strong>設定の保存：</strong>よく使うカテゴリ・パラメータの組み合わせを設定ファイル（JSON）として保存し、次回から読み込めます。',
        en: '<strong>Save Settings:</strong> Save frequently used category and parameter combinations as a settings file (JSON) and reload them next time.',
        zh: '<strong>保存设置：</strong>将常用的类别和参数组合保存为设置文件（JSON），下次可直接加载。'
    },
    'manual-excel-export-tip2': {
        ja: '<strong>パラメータの区別：</strong><code>I-</code>（インスタンス）と<code>T-</code>（タイプ）の接頭辞でパラメータの種類を区別できます。',
        en: '<strong>Parameter Distinction:</strong> Use the <code>I-</code> (instance) and <code>T-</code> (type) prefixes to distinguish parameter types.',
        zh: '<strong>参数区分：</strong>通过<code>I-</code>（实例）和<code>T-</code>（类型）前缀区分参数类型。'
    },
    'manual-excel-export-tip3': {
        ja: '<strong>注釈カテゴリも対象：</strong>アクティブビューに通り芯・レベルが表示されている状態でエクスポートすると、注釈カテゴリも一覧に表示されます。プロジェクト全体スコープでも対応しています。',
        en: '<strong>Annotation Categories Included:</strong> If grids and levels are visible in the active view when exporting, annotation categories will also appear in the list. The entire project scope also supports this.',
        zh: '<strong>包含注释类别：</strong>在活动视图中显示轴网和标高时导出，注释类别也会出现在列表中。整个项目范围也支持此功能。'
    },
    'manual-excel-export-note1': {
        ja: '大量の要素をエクスポートする場合、処理に時間がかかることがあります。',
        en: 'Exporting a large number of elements may take some time to process.',
        zh: '导出大量图元时，处理可能需要一些时间。'
    },
    'manual-excel-export-note2': {
        ja: '出力先のExcelファイルが開いている場合はエクスポートできません。先にファイルを閉じてください。',
        en: 'If the target Excel file is open, export will fail. Please close the file first.',
        zh: '如果目标Excel文件已打开，则无法导出。请先关闭该文件。'
    },
    'manual-excel-export-note3': {
        ja: 'エクスポート対象はモデル内の要素のみです。リンクモデルの要素は含まれません。',
        en: 'Only elements within the current model are exported. Elements from linked models are not included.',
        zh: '仅导出当前模型中的图元，不包括链接模型中的图元。'
    },
    'manual-excel-export-trouble1-title': {
        ja: 'カテゴリが一覧に表示されない',
        en: 'Category does not appear in the list',
        zh: '类别未出现在列表中'
    },
    'manual-excel-export-trouble1-item1': {
        ja: 'アクティブビューやスコープに要素が存在しない場合、そのカテゴリは表示されません',
        en: 'If no elements exist in the active view or scope, that category will not appear',
        zh: '如果活动视图或范围内不存在图元，则该类别不会显示'
    },
    'manual-excel-export-trouble1-item2': {
        ja: '<strong>プロジェクト全体</strong>スコープで実行するとより多くのカテゴリが表示されます',
        en: 'Running with the <strong>Entire Project</strong> scope will show more categories',
        zh: '使用<strong>整个项目</strong>范围运行将显示更多类别'
    },
    'manual-excel-export-trouble2-title': {
        ja: '通り芯・レベルなどの注釈要素が表示されない',
        en: 'Annotation elements such as grids and levels do not appear',
        zh: '轴网、标高等注释图元未显示'
    },
    'manual-excel-export-trouble2-item1': {
        ja: 'アクティブビューに通り芯・レベルが表示されている状態でエクスポートすると一覧に表示されます',
        en: 'Export when grids and levels are visible in the active view, and they will appear in the list',
        zh: '在活动视图中显示轴网和标高时导出，它们将出现在列表中'
    },
    'manual-excel-export-trouble2-item2': {
        ja: 'プロジェクト全体スコープでも対応しています',
        en: 'The entire project scope also supports annotation categories',
        zh: '整个项目范围也支持注释类别'
    },
    'manual-excel-export-related-import': {
        ja: 'Excelインポート',
        en: 'Excel Import',
        zh: 'Excel导入'
    },
    'manual-excel-export-related-import-desc': {
        ja: ' — エクスポートしたファイルをRevitに一括反映',
        en: ' — Write exported file back to Revit in bulk',
        zh: ' — 将导出的文件批量写回Revit'
    },
    'manual-excel-export-related-formwork': {
        ja: '型枠数量算出',
        en: 'Formwork Calculator',
        zh: '模板数量计算'
    },
    'manual-excel-export-related-formwork-desc': {
        ja: ' — 構造要素の型枠面積を自動算出してExcelに出力',
        en: ' — Automatically calculates formwork area of structural elements and outputs to Excel',
        zh: ' — 自动计算结构构件的模板面积并输出到Excel'
    }
};

    // ========================================
    // excel-import.html (Excelインポート)
    // ========================================
translations.excelImport = {
    'manual-excel-import-title': {
        ja: 'Excelインポート',
        en: 'Excel Import',
        zh: 'Excel导入'
    },
    'manual-excel-import-subtitle': {
        ja: 'Excelの編集内容をRevitモデルに一括反映',
        en: 'Batch write Excel edits back to Revit model',
        zh: '将Excel编辑内容批量写回Revit模型'
    },
    'manual-excel-import-overview': {
        ja: 'Excelで編集したパラメータ値をRevitに一括反映する機能です。EXCELエクスポートで書き出したファイルをそのまま使用できます。インポート前に<strong>変更内容をプレビュー</strong>で確認でき、インポート後に<strong>成功・失敗をExcelのセルに色付き</strong>でフィードバックします。開いているExcelファイルを<strong>自動検出</strong>してリスト表示します。',
        en: 'Batch-applies parameter values edited in Excel back to Revit. You can use files exported by Excel Export as-is. You can <strong>preview changes</strong> before importing, and get <strong>color-coded success/failure feedback on Excel cells</strong> after importing. Automatically <strong>detects open Excel files</strong> and lists them.',
        zh: '将在Excel中编辑的参数值批量写回Revit。可直接使用Excel导出的文件。导入前可<strong>预览变更内容</strong>，导入后在Excel单元格上以<strong>颜色标注成功/失败</strong>。自动<strong>检测已打开的Excel文件</strong>并列出。'
    },
    'manual-excel-import-feature1': {
        ja: '開いているExcelファイルの自動検出',
        en: 'Automatic detection of open Excel files',
        zh: '自动检测已打开的Excel文件'
    },
    'manual-excel-import-feature2': {
        ja: '変更プレビュー（変更前の値と変更後の値を並べて確認）',
        en: 'Change preview (view old and new values side by side)',
        zh: '变更预览（并排查看变更前后的值）'
    },
    'manual-excel-import-feature3': {
        ja: '読み取り専用パラメータは自動スキップ（サマリーに件数表示）',
        en: 'Read-only parameters automatically skipped (count shown in summary)',
        zh: '只读参数自动跳过（在摘要中显示数量）'
    },
    'manual-excel-import-feature4': {
        ja: 'インポート後、変更セルをExcel上で色付きフィードバック',
        en: 'Color-coded feedback on changed cells in Excel after import',
        zh: '导入后在Excel中对变更单元格进行颜色标注反馈'
    },
    'manual-excel-import-feature5': {
        ja: 'トランザクションによる安全な更新（失敗時はロールバック）',
        en: 'Safe updates via transactions (rollback on failure)',
        zh: '通过事务安全更新（失败时回滚）'
    },
    'manual-excel-import-feature6': {
        ja: 'エラー・警告の詳細表示',
        en: 'Detailed display of errors and warnings',
        zh: '详细显示错误和警告'
    },
    'manual-excel-import-step1-title': {
        ja: 'コマンドの起動',
        en: 'Launch the Command',
        zh: '启动命令'
    },
    'manual-excel-import-step1-desc': {
        ja: 'リボン「<strong>28 Tools</strong>」タブ →「<strong>データ</strong>」パネル →「<strong>EXCELインポート</strong>」ボタンをクリックします。',
        en: 'Click the "<strong>EXCEL Import</strong>" button in the "<strong>Data</strong>" panel under the "<strong>28 Tools</strong>" ribbon tab.',
        zh: '点击功能区「<strong>28 Tools</strong>」选项卡 →「<strong>数据</strong>」面板 →「<strong>EXCEL导入</strong>」按钮。'
    },
    'manual-excel-import-step2-title': {
        ja: 'Excelファイルの選択',
        en: 'Select an Excel File',
        zh: '选择Excel文件'
    },
    'manual-excel-import-file-row1-name': {
        ja: '<strong>開いているファイルから選ぶ</strong>',
        en: '<strong>Choose from Open Files</strong>',
        zh: '<strong>从已打开的文件中选择</strong>'
    },
    'manual-excel-import-file-row1-desc': {
        ja: '現在開いているExcelファイルが自動検出されてリスト表示される',
        en: 'Currently open Excel files are automatically detected and listed',
        zh: '当前已打开的Excel文件会被自动检测并列出'
    },
    'manual-excel-import-file-row2-name': {
        ja: '<strong>ファイルを参照</strong>',
        en: '<strong>Browse for File</strong>',
        zh: '<strong>浏览文件</strong>'
    },
    'manual-excel-import-file-row2-desc': {
        ja: '「参照」ボタンからファイルダイアログでファイルを選ぶ',
        en: 'Select a file from the file dialog via the "Browse" button',
        zh: '通过"浏览"按钮在文件对话框中选择文件'
    },
    'manual-excel-import-file-row3-name': {
        ja: '<strong>ドラッグ＆ドロップ</strong>',
        en: '<strong>Drag & Drop</strong>',
        zh: '<strong>拖放</strong>'
    },
    'manual-excel-import-file-row3-desc': {
        ja: 'ダイアログ上にExcelファイルをドラッグする',
        en: 'Drag an Excel file onto the dialog',
        zh: '将Excel文件拖到对话框上'
    },
    'manual-excel-import-step3-title': {
        ja: '変更内容のプレビュー確認',
        en: 'Review Changes in Preview',
        zh: '预览确认变更内容'
    },
    'manual-excel-import-step3-desc': {
        ja: 'プレビューダイアログに<strong>変更が発生する行のみ</strong>が一覧表示されます。読み取り専用パラメータ（Revitが自動計算する値）は非表示。変更前の値と変更後の値を並べて確認できます。',
        en: 'The preview dialog lists <strong>only rows with changes</strong>. Read-only parameters (values auto-calculated by Revit) are hidden. You can view old and new values side by side.',
        zh: '预览对话框中仅列出<strong>发生变更的行</strong>。只读参数（Revit自动计算的值）被隐藏。可并排查看变更前后的值。'
    },
    'manual-excel-import-step3-tip': {
        ja: '💡 <strong>空セルはスキップされます。</strong>ExcelのセルをDeleteキーで消しても、その値がRevitから削除されることはありません。',
        en: '💡 <strong>Empty cells are skipped.</strong> Deleting a cell value in Excel with the Delete key will not remove that value from Revit.',
        zh: '💡 <strong>空单元格会被跳过。</strong>在Excel中用Delete键清除单元格值不会从Revit中删除该值。'
    },
    'manual-excel-import-step4-title': {
        ja: 'インポート実行',
        en: 'Execute Import',
        zh: '执行导入'
    },
    'manual-excel-import-step4-desc': {
        ja: '「<strong>インポート実行</strong>」ボタンをクリックします。処理完了後、Revitに変更が反映されます。',
        en: 'Click the "<strong>Execute Import</strong>" button. After processing, changes will be reflected in Revit.',
        zh: '点击「<strong>执行导入</strong>」按钮。处理完成后，变更将反映到Revit中。'
    },
    'manual-excel-import-feedback-intro': {
        ja: 'インポートが完了すると、Excelファイルの該当セルに色付きフィードバックが追加されます。',
        en: 'After import is complete, color-coded feedback is added to the relevant cells in the Excel file.',
        zh: '导入完成后，Excel文件中的相关单元格会添加颜色标注反馈。'
    },
    'manual-excel-import-feedback-row1-name': {
        ja: '<strong>インポート成功</strong>',
        en: '<strong>Import Success</strong>',
        zh: '<strong>导入成功</strong>'
    },
    'manual-excel-import-feedback-row1-desc': {
        ja: 'セルのテキストが<strong>青字・太字</strong>',
        en: 'Cell text turns <strong>blue and bold</strong>',
        zh: '单元格文字变为<strong>蓝色粗体</strong>'
    },
    'manual-excel-import-feedback-row2-name': {
        ja: '<strong>インポート失敗</strong>',
        en: '<strong>Import Failed</strong>',
        zh: '<strong>导入失败</strong>'
    },
    'manual-excel-import-feedback-row2-desc': {
        ja: 'セルのテキストが<strong>赤字・太字</strong>',
        en: 'Cell text turns <strong>red and bold</strong>',
        zh: '单元格文字变为<strong>红色粗体</strong>'
    },
    'manual-excel-import-feedback-legend': {
        ja: '各シートの末尾列に凡例が自動追記されます（<code>*青字はインポート成功、赤字はインポート失敗</code>）。',
        en: 'A legend is automatically added to the last column of each sheet (<code>*Blue = import success, Red = import failure</code>).',
        zh: '每个工作表的最后一列会自动追加图例（<code>*蓝色=导入成功，红色=导入失败</code>）。'
    },
    'manual-excel-import-feedback-com': {
        ja: '💡 ExcelがRevitと同時に開いている場合はExcel COM経由でセル書式が直接反映されます。Excelが閉じている場合はファイルに直接書き込まれます。',
        en: '💡 If Excel is open alongside Revit, cell formatting is applied directly via Excel COM. If Excel is closed, it is written directly to the file.',
        zh: '💡 如果Excel与Revit同时打开，单元格格式通过Excel COM直接应用。如果Excel已关闭，则直接写入文件。'
    },
    'manual-excel-import-usecase1-title': {
        ja: '一括パラメータ更新',
        en: 'Bulk Parameter Update',
        zh: '批量参数更新'
    },
    'manual-excel-import-usecase1-desc': {
        ja: 'Excelで大量のパラメータを編集し、一括でRevitモデルに反映できます。',
        en: 'Edit a large number of parameters in Excel and apply them to the Revit model all at once.',
        zh: '在Excel中编辑大量参数，一次性反映到Revit模型中。'
    },
    'manual-excel-import-usecase2-title': {
        ja: '外部データの取り込み',
        en: 'Import External Data',
        zh: '导入外部数据'
    },
    'manual-excel-import-usecase2-desc': {
        ja: '他のシステムから出力されたExcelデータをRevitモデルに反映できます。',
        en: 'Apply Excel data exported from other systems into the Revit model.',
        zh: '将从其他系统导出的Excel数据反映到Revit模型中。'
    },
    'manual-excel-import-usecase3-title': {
        ja: '修正作業の効率化',
        en: 'Efficient Correction Work',
        zh: '提高修正工作效率'
    },
    'manual-excel-import-usecase3-desc': {
        ja: 'Revit上で1つずつ修正するよりExcelで一括編集した方が効率的な場合に活用できます。',
        en: 'Useful when bulk editing in Excel is more efficient than making corrections one by one in Revit.',
        zh: '当在Excel中批量编辑比在Revit中逐一修正更高效时非常有用。'
    },
    'manual-excel-import-tip1': {
        ja: '<strong>変更プレビューを活用：</strong>インポート前に変更内容を確認できるので、意図しない変更を防げます。変更行のみが表示されるためレビューが容易です。',
        en: '<strong>Use the Change Preview:</strong> You can review changes before importing to prevent unintended modifications. Only changed rows are shown, making review easy.',
        zh: '<strong>利用变更预览：</strong>导入前可确认变更内容，防止意外修改。仅显示变更行，便于审查。'
    },
    'manual-excel-import-tip2': {
        ja: '<strong>色付きフィードバック：</strong>インポート後にExcel上で成功セルが青字・失敗セルが赤字になるので、どの値が更新されたか確認できます。',
        en: '<strong>Color-coded Feedback:</strong> After import, successful cells turn blue and failed cells turn red in Excel, so you can confirm which values were updated.',
        zh: '<strong>颜色标注反馈：</strong>导入后，Excel中成功的单元格变为蓝色，失败的变为红色，便于确认哪些值已更新。'
    },
    'manual-excel-import-tip3': {
        ja: '<strong>安全なロールバック：</strong>トランザクション機能により、エラーが発生した場合は変更が自動的に取り消されます。',
        en: '<strong>Safe Rollback:</strong> The transaction feature automatically reverts changes if an error occurs.',
        zh: '<strong>安全回滚：</strong>事务功能在发生错误时自动撤销变更。'
    },
    'manual-excel-import-note1': {
        ja: '<strong>空セル（空欄）はスキップ</strong>されます。値を消したい場合は空欄ではなく明示的な値を入力してください。',
        en: '<strong>Empty cells are skipped.</strong> To clear a value, enter an explicit value rather than leaving the cell blank.',
        zh: '<strong>空单元格（空白）会被跳过。</strong>要清除值，请输入明确的值，而不是留空。'
    },
    'manual-excel-import-note2': {
        ja: '<strong>読み取り専用パラメータ</strong>（長さ・面積などRevitが自動計算するパラメータ）はインポートできません。',
        en: '<strong>Read-only parameters</strong> (such as length and area, auto-calculated by Revit) cannot be imported.',
        zh: '<strong>只读参数</strong>（如长度、面积等Revit自动计算的参数）无法导入。'
    },
    'manual-excel-import-note3': {
        ja: '<strong>要素IDが一致しない</strong>場合は反映されません（異なるプロジェクトで書き出したファイルを使用しないでください）。',
        en: 'If the <strong>element ID does not match</strong>, the change will not be applied (do not use files exported from a different project).',
        zh: '如果<strong>图元ID不匹配</strong>，则不会应用变更（请勿使用从不同项目导出的文件）。'
    },
    'manual-excel-import-note4': {
        ja: 'シート統合モードでエクスポートしたファイルでは、対象カテゴリに存在しないパラメータの列が空欄になりますが、インポート時は空欄セルをスキップするため問題ありません。',
        en: 'In a file exported in merged sheet mode, columns for parameters not present in a category will be blank, but this is not a problem as empty cells are skipped during import.',
        zh: '在合并工作表模式导出的文件中，目标类别中不存在的参数列将为空，但导入时会跳过空单元格，因此没有问题。'
    },
    'manual-excel-import-trouble1-title': {
        ja: '「ファイルが開けません」と表示される',
        en: '"File cannot be opened" message appears',
        zh: '显示"文件无法打开"'
    },
    'manual-excel-import-trouble1-item1': {
        ja: 'ExcelがそのファイルをExclusiveロックで開いている場合があります',
        en: 'Excel may have the file open with an exclusive lock',
        zh: 'Excel可能以独占锁的方式打开了该文件'
    },
    'manual-excel-import-trouble1-item2': {
        ja: 'ExcelでファイルをTrustedとして開き直すか、Excelをいったん閉じてから試みてください',
        en: 'Try reopening the file as Trusted in Excel, or close Excel and try again',
        zh: '尝试在Excel中将文件重新以受信任方式打开，或关闭Excel后重试'
    },
    'manual-excel-import-trouble2-title': {
        ja: '「インポートできないパラメータがあります」と表示される',
        en: '"There are parameters that cannot be imported" message appears',
        zh: '显示"存在无法导入的参数"'
    },
    'manual-excel-import-trouble2-item1': {
        ja: '長さ・面積などRevitが自動計算するパラメータは読み取り専用のためインポートできません',
        en: 'Parameters auto-calculated by Revit such as length and area are read-only and cannot be imported',
        zh: 'Revit自动计算的参数（如长度、面积等）为只读，无法导入'
    },
    'manual-excel-import-trouble2-item2': {
        ja: 'プレビュー画面では読み取り専用パラメータは非表示になっています',
        en: 'Read-only parameters are hidden in the preview screen',
        zh: '预览界面中只读参数被隐藏'
    },
    'manual-excel-import-trouble3-title': {
        ja: 'プレビューに変更行が表示されない',
        en: 'No changed rows appear in the preview',
        zh: '预览中未显示变更行'
    },
    'manual-excel-import-trouble3-item1': {
        ja: 'ExcelとRevit上の現在値が同じ場合、変更なしと判定されプレビューに表示されません',
        en: 'If the current values in Excel and Revit are the same, it is judged as no change and will not appear in the preview',
        zh: '如果Excel和Revit中的当前值相同，则被判定为无变更，不会在预览中显示'
    },
    'manual-excel-import-trouble3-item2': {
        ja: '値を変更してから再度インポートを実行してください',
        en: 'Make changes to the values and then run the import again',
        zh: '修改值后再次执行导入'
    },
    'manual-excel-import-related-export': {
        ja: 'Excelエクスポート',
        en: 'Excel Export',
        zh: 'Excel导出'
    },
    'manual-excel-import-related-export-desc': {
        ja: ' — Revitのパラメータ値をExcelに書き出す',
        en: ' — Export Revit parameter values to Excel',
        zh: ' — 将Revit参数值导出到Excel'
    },
    'manual-excel-import-related-formwork': {
        ja: '型枠数量算出',
        en: 'Formwork Calculator',
        zh: '模板数量计算'
    },
    'manual-excel-import-related-formwork-desc': {
        ja: ' — 構造要素の型枠面積を自動算出してExcelに出力',
        en: ' — Automatically calculates formwork area of structural elements and outputs to Excel',
        zh: ' — 自动计算结构构件的模板面积并输出到Excel'
    }
};

    // ========================================
    // filled-region.html (塗潰し領域 分割・統合)
    // ========================================
translations.filledRegion = {
    'manual-filled-region-title': {
        ja: '塗潰し領域 分割・統合',
        en: 'Filled Region Split / Merge',
        zh: '填充区域 分割/合并'
    },
    'manual-filled-region-subtitle': {
        ja: '塗潰し領域を個別に分割または1つに統合',
        en: 'Split filled regions individually or merge them into one',
        zh: '将填充区域单独分割或合并为一个'
    },
    'manual-filled-region-overview': {
        ja: '複数エリアを持つ塗潰し領域を個別の領域に分割したり、複数の塗潰し領域を1つにまとめたりする機能です。',
        en: 'A feature that splits filled regions with multiple areas into individual regions, or merges multiple filled regions into one.',
        zh: '将包含多个区域的填充区域分割为独立区域，或将多个填充区域合并为一个的功能。'
    },
    'manual-filled-region-overview-split': {
        ja: '<strong>分割：</strong>2つ以上のエリア（境界ループ）を持つ塗潰し領域を、エリアごとに独立した領域へ分割します',
        en: '<strong>Split:</strong> Splits a filled region with two or more areas (boundary loops) into independent regions per area.',
        zh: '<strong>分割：</strong>将具有两个或更多区域（边界环）的填充区域按区域分割为独立的区域。'
    },
    'manual-filled-region-overview-merge': {
        ja: '<strong>統合：</strong>複数の塗潰し領域を1つの領域にまとめます。重なり合っている領域も、ブーリアン和算で正しく統合されます',
        en: '<strong>Merge:</strong> Merges multiple filled regions into one. Overlapping regions are correctly merged using Boolean union.',
        zh: '<strong>合并：</strong>将多个填充区域合并为一个。重叠区域也会通过布尔并集运算正确合并。'
    },
    'manual-filled-region-overview-views': {
        ja: '平面図・断面図・立面図・製図ビューなど、塗潰し領域を作成できるすべてのビューで使用できます。',
        en: 'Can be used in any view where filled regions can be created, including floor plans, sections, elevations, and drafting views.',
        zh: '可在所有可创建填充区域的视图中使用，包括平面图、剖面图、立面图和绘图视图。'
    },
    'manual-filled-region-feature1': {
        ja: '選択した領域の状態に応じて分割/統合の可否を自動判定',
        en: 'Automatically determines whether split/merge is possible based on the selected region state',
        zh: '根据选定区域的状态自动判断是否可以分割/合并'
    },
    'manual-filled-region-feature2': {
        ja: '分割時は元のパターンを維持',
        en: 'Original pattern is preserved when splitting',
        zh: '分割时保留原始图案'
    },
    'manual-filled-region-feature3': {
        ja: '統合時はパターンを自由に選択可能（プロジェクト内の全パターンから選択）',
        en: 'Pattern can be freely selected when merging (choose from all patterns in the project)',
        zh: '合并时可自由选择图案（从项目中所有图案中选择）'
    },
    'manual-filled-region-feature4': {
        ja: '選択情報（領域数、エリア数）をリアルタイム表示',
        en: 'Real-time display of selection info (number of regions, number of areas)',
        zh: '实时显示选择信息（区域数量、面积数量）'
    },
    'manual-filled-region-feature5': {
        ja: 'エラー時はトランザクション自動ロールバック',
        en: 'Automatic transaction rollback on error',
        zh: '出错时自动回滚事务'
    },
    'manual-filled-region-prep-intro': {
        ja: 'コマンド実行前に、ビュー上で塗潰し領域を選択しておきます。',
        en: 'Before running the command, select filled regions in the view.',
        zh: '执行命令前，在视图中选择填充区域。'
    },
    'manual-filled-region-prep-row1-name': {
        ja: '<strong>分割</strong>',
        en: '<strong>Split</strong>',
        zh: '<strong>分割</strong>'
    },
    'manual-filled-region-prep-row1-desc': {
        ja: '2つ以上のエリアを含む塗潰し領域を1つ選択',
        en: 'Select one filled region containing two or more areas',
        zh: '选择包含两个或更多区域的一个填充区域'
    },
    'manual-filled-region-prep-row2-name': {
        ja: '<strong>統合</strong>',
        en: '<strong>Merge</strong>',
        zh: '<strong>合并</strong>'
    },
    'manual-filled-region-prep-row2-desc': {
        ja: '統合したい塗潰し領域を2つ以上選択',
        en: 'Select two or more filled regions to merge',
        zh: '选择两个或更多要合并的填充区域'
    },
    'manual-filled-region-prep-row3-name': {
        ja: '<strong>両方</strong>',
        en: '<strong>Both</strong>',
        zh: '<strong>两者都有</strong>'
    },
    'manual-filled-region-prep-row3-desc': {
        ja: '複数エリアを持つ領域 ＋ 他の領域を混在して選択',
        en: 'Mix of regions with multiple areas + other regions selected together',
        zh: '混合选择具有多个区域的填充区域 ＋ 其他区域'
    },
    'manual-filled-region-prep-tip': {
        ja: '💡 事前選択なしでコマンドを実行すると、「塗潰し領域を選択してください」というメッセージが表示されます。',
        en: '💡 If you run the command without selecting anything in advance, a message "Please select a filled region" will appear.',
        zh: '💡 如果在未预先选择的情况下运行命令，将显示"请选择填充区域"的消息。'
    },
    'manual-filled-region-step1-title': {
        ja: '対象の塗潰し領域を選択してコマンドを起動',
        en: 'Select Target Filled Regions and Launch Command',
        zh: '选择目标填充区域并启动命令'
    },
    'manual-filled-region-step1-desc': {
        ja: 'ビュー上で対象の塗潰し領域を選択してから、リボン「<strong>28 Tools</strong>」タブ →「<strong>注釈・詳細</strong>」パネル →「<strong>領域 分割/統合</strong>」ボタンをクリックします。',
        en: 'Select the target filled regions in the view, then click the "<strong>Region Split/Merge</strong>" button in the "<strong>Annotation & Detail</strong>" panel under the "<strong>28 Tools</strong>" ribbon tab.',
        zh: '在视图中选择目标填充区域，然后点击「<strong>28 Tools</strong>」功能区选项卡 →「<strong>注释·详图</strong>」面板 →「<strong>区域 分割/合并</strong>」按钮。'
    },
    'manual-filled-region-step2-title': {
        ja: '操作を選択',
        en: 'Select Operation',
        zh: '选择操作'
    },
    'manual-filled-region-step2-desc': {
        ja: 'ダイアログ「<strong>塗潰し領域 分割/統合</strong>」が開きます。',
        en: 'The "<strong>Filled Region Split/Merge</strong>" dialog will open.',
        zh: '「<strong>填充区域 分割/合并</strong>」对话框将打开。'
    },
    'manual-filled-region-op-row1-name': {
        ja: '<strong>分割</strong>',
        en: '<strong>Split</strong>',
        zh: '<strong>分割</strong>'
    },
    'manual-filled-region-op-row1-desc': {
        ja: '選択した領域を各エリアごとに独立した領域へ分割します（選択した領域が2つ以上のエリアを持つ場合のみ有効）',
        en: 'Splits the selected region into independent regions per area (only active when the selected region has two or more areas)',
        zh: '将选定区域按每个面积分割为独立区域（仅当选定区域具有两个或更多面积时有效）'
    },
    'manual-filled-region-op-row2-name': {
        ja: '<strong>統合</strong>',
        en: '<strong>Merge</strong>',
        zh: '<strong>合并</strong>'
    },
    'manual-filled-region-op-row2-desc': {
        ja: '選択した複数の領域を1つにまとめます（2つ以上の領域を選択している場合のみ有効）',
        en: 'Merges multiple selected regions into one (only active when two or more regions are selected)',
        zh: '将多个选定区域合并为一个（仅当选择了两个或更多区域时有效）'
    },
    'manual-filled-region-step2-note': {
        ja: '選択内容によって有効/無効が自動的に切り替わります。',
        en: 'Enabled/disabled automatically based on the selection.',
        zh: '根据选择内容自动切换启用/禁用状态。'
    },
    'manual-filled-region-step3-title': {
        ja: '塗潰しパターンを選択（統合時のみ）',
        en: 'Select Fill Pattern (Merge only)',
        zh: '选择填充图案（仅合并时）'
    },
    'manual-filled-region-step3-desc': {
        ja: '「<strong>統合</strong>」を選んだ場合、統合後に使用する<strong>塗潰しパターン</strong>をドロップダウンから選択します。選択した領域がすべて同じパターンを使用している場合、そのパターンがデフォルトで選択されます。',
        en: 'If you selected "<strong>Merge</strong>", select the <strong>fill pattern</strong> to use after merging from the dropdown. If all selected regions use the same pattern, that pattern is selected by default.',
        zh: '如果选择了「<strong>合并</strong>」，从下拉菜单中选择合并后使用的<strong>填充图案</strong>。如果所有选定区域使用相同的图案，则默认选择该图案。'
    },
    'manual-filled-region-step4-title': {
        ja: 'OKをクリック',
        en: 'Click OK',
        zh: '点击OK'
    },
    'manual-filled-region-step4-desc': {
        ja: '「<strong>OK</strong>」をクリックすると処理が実行されます。処理完了後、作成された領域数がメッセージで表示されます。',
        en: 'Click "<strong>OK</strong>" to execute. After processing, the number of regions created will be shown in a message.',
        zh: '点击「<strong>OK</strong>」执行处理。处理完成后，将以消息形式显示创建的区域数量。'
    },
    'manual-filled-region-output-split-title': {
        ja: '分割の場合',
        en: 'When Splitting',
        zh: '分割时'
    },
    'manual-filled-region-output-split-item1': {
        ja: '元の塗潰し領域は削除され、エリア数と同じ数の独立した塗潰し領域が作成されます',
        en: 'The original filled region is deleted and the same number of independent filled regions as areas are created',
        zh: '原始填充区域被删除，创建与面积数量相同的独立填充区域'
    },
    'manual-filled-region-output-split-item2': {
        ja: '各領域は元と同じ塗潰しパターンを引き継ぎます',
        en: 'Each region inherits the same fill pattern as the original',
        zh: '每个区域继承与原始相同的填充图案'
    },
    'manual-filled-region-output-merge-title': {
        ja: '統合の場合',
        en: 'When Merging',
        zh: '合并时'
    },
    'manual-filled-region-output-merge-item1': {
        ja: '元のすべての塗潰し領域は削除され、1つの塗潰し領域が作成されます',
        en: 'All original filled regions are deleted and one filled region is created',
        zh: '所有原始填充区域被删除，创建一个填充区域'
    },
    'manual-filled-region-output-merge-item2': {
        ja: '重なり合っている領域はブーリアン和算により正しく結合されます（重なり部分が「穴」になりません）',
        en: 'Overlapping regions are correctly joined using Boolean union (overlapping parts do not become "holes")',
        zh: '重叠区域通过布尔并集运算正确连接（重叠部分不会变成"孔"）'
    },
    'manual-filled-region-output-merge-item3': {
        ja: '離れた位置にある領域は、1つの領域内の複数エリアとしてまとめられます',
        en: 'Regions at separate locations are combined as multiple areas within one region',
        zh: '位于不同位置的区域被合并为一个区域内的多个面积'
    },
    'manual-filled-region-usecase1-title': {
        ja: '仕上げ図面の整理',
        en: 'Organizing Finish Drawings',
        zh: '整理装修图'
    },
    'manual-filled-region-usecase1-desc': {
        ja: '複数エリアに分かれた塗潰し領域を個別管理したい場合に、分割して整理できます。',
        en: 'When you want to manage a filled region with multiple areas individually, you can split and organize them.',
        zh: '当需要单独管理分为多个区域的填充区域时，可以分割并整理。'
    },
    'manual-filled-region-usecase2-title': {
        ja: 'パターン統一',
        en: 'Unifying Patterns',
        zh: '统一图案'
    },
    'manual-filled-region-usecase2-desc': {
        ja: 'バラバラに作成された塗潰し領域を1つに統合し、パターンを統一できます。',
        en: 'Merge separately created filled regions into one to unify the pattern.',
        zh: '将分散创建的填充区域合并为一个，统一图案。'
    },
    'manual-filled-region-usecase3-title': {
        ja: '編集の効率化',
        en: 'Efficient Editing',
        zh: '提高编辑效率'
    },
    'manual-filled-region-usecase3-desc': {
        ja: '統合することで1つの要素として管理でき、移動や削除などの編集が効率的になります。',
        en: 'By merging, you can manage as one element, making editing such as moving or deleting more efficient.',
        zh: '通过合并，可作为一个图元进行管理，使移动、删除等编辑更加高效。'
    },
    'manual-filled-region-tip1': {
        ja: '<strong>自動判定：</strong>選択した領域の状態に応じて、分割・統合の可否がダイアログに自動表示されます。',
        en: '<strong>Auto Determination:</strong> Whether split/merge is possible is automatically shown in the dialog based on the state of the selected region.',
        zh: '<strong>自动判断：</strong>根据选定区域的状态，对话框中会自动显示是否可以分割/合并。'
    },
    'manual-filled-region-tip2': {
        ja: '<strong>パターン維持：</strong>分割時は元の塗潰しパターンがそのまま維持されるため、見た目は変わりません。',
        en: '<strong>Pattern Preserved:</strong> When splitting, the original fill pattern is maintained as-is, so the appearance does not change.',
        zh: '<strong>保留图案：</strong>分割时，原始填充图案保持不变，外观不会改变。'
    },
    'manual-filled-region-tip3': {
        ja: '<strong>パターン変更：</strong>統合時にパターンを変更できるため、複数領域のパターン一括変更にも活用できます。',
        en: '<strong>Pattern Change:</strong> You can change the pattern when merging, which can also be used to bulk-change patterns for multiple regions.',
        zh: '<strong>更改图案：</strong>合并时可以更改图案，也可用于批量更改多个区域的图案。'
    },
    'manual-filled-region-note1': {
        ja: '分割するには、塗潰し領域が複数の独立したエリア（境界）を含んでいる必要があります。',
        en: 'To split, the filled region must contain multiple independent areas (boundaries).',
        zh: '要分割，填充区域必须包含多个独立区域（边界）。'
    },
    'manual-filled-region-note2': {
        ja: '統合するには、2つ以上の塗潰し領域を選択する必要があります。',
        en: 'To merge, you must select two or more filled regions.',
        zh: '要合并，必须选择两个或更多填充区域。'
    },
    'manual-filled-region-note3': {
        ja: '塗潰し領域はビューに固有の要素のため、<strong>異なるビューの領域を統合することはできません</strong>。同じビュー内の領域のみ統合できます。',
        en: 'Since filled regions are view-specific elements, <strong>regions from different views cannot be merged</strong>. Only regions within the same view can be merged.',
        zh: '由于填充区域是视图特定的图元，<strong>无法合并不同视图中的区域</strong>。只能合并同一视图内的区域。'
    },
    'manual-filled-region-note4': {
        ja: 'エラーが発生した場合、トランザクションが自動ロールバックされ、元の状態に戻ります。',
        en: 'If an error occurs, the transaction is automatically rolled back and the state returns to its original.',
        zh: '如果发生错误，事务会自动回滚，状态恢复到原始状态。'
    },
    'manual-filled-region-trouble1-title': {
        ja: '「塗潰し領域を選択してください」と表示される',
        en: '"Please select a filled region" message appears',
        zh: '显示"请选择填充区域"'
    },
    'manual-filled-region-trouble1-item1': {
        ja: 'ビュー上で塗潰し領域（FilledRegion）を選択してからコマンドを実行してください',
        en: 'Select a filled region (FilledRegion) in the view before running the command',
        zh: '在视图中选择填充区域（FilledRegion）后再运行命令'
    },
    'manual-filled-region-trouble1-item2': {
        ja: '塗潰し領域以外の要素（壁・床など）のみを選択している場合も同じメッセージが表示されます',
        en: 'The same message also appears when only non-filled-region elements (walls, floors, etc.) are selected',
        zh: '当仅选择非填充区域图元（墙、楼板等）时，也会显示相同的消息'
    },
    'manual-filled-region-trouble2-title': {
        ja: '「分割」がグレーアウトして選択できない',
        en: '"Split" is grayed out and cannot be selected',
        zh: '"分割"显示为灰色无法选择'
    },
    'manual-filled-region-trouble2-item1': {
        ja: '選択した領域が<strong>エリアを1つしか持っていない</strong>場合、分割はできません',
        en: 'If the selected region <strong>has only one area</strong>, it cannot be split',
        zh: '如果选定的区域<strong>只有一个面积</strong>，则无法分割'
    },
    'manual-filled-region-trouble2-item2': {
        ja: '複数のエリアを持つ塗潰し領域（2つ以上の境界ループを含む領域）を選択してください',
        en: 'Select a filled region with multiple areas (a region containing two or more boundary loops)',
        zh: '请选择具有多个面积的填充区域（包含两个或更多边界环的区域）'
    },
    'manual-filled-region-trouble3-title': {
        ja: '「統合」がグレーアウトして選択できない',
        en: '"Merge" is grayed out and cannot be selected',
        zh: '"合并"显示为灰色无法选择'
    },
    'manual-filled-region-trouble3-item1': {
        ja: '<strong>1つの領域しか選択していない</strong>場合、統合はできません',
        en: 'If <strong>only one region is selected</strong>, merge is not possible',
        zh: '如果<strong>只选择了一个区域</strong>，则无法合并'
    },
    'manual-filled-region-trouble3-item2': {
        ja: '2つ以上の塗潰し領域を複数選択してください',
        en: 'Please select two or more filled regions',
        zh: '请选择两个或更多填充区域'
    },
    'manual-filled-region-trouble4-title': {
        ja: '異なるビューの塗潰し領域を統合したい',
        en: 'Want to merge filled regions from different views',
        zh: '想合并不同视图中的填充区域'
    },
    'manual-filled-region-trouble4-item1': {
        ja: '塗潰し領域はビューに固有の要素のため、<strong>異なるビューの領域を統合することはできません</strong>',
        en: 'Since filled regions are view-specific elements, <strong>regions from different views cannot be merged</strong>',
        zh: '由于填充区域是视图特定的图元，<strong>无法合并不同视图中的区域</strong>'
    },
    'manual-filled-region-trouble4-item2': {
        ja: '同じビュー内の領域のみ統合できます',
        en: 'Only regions within the same view can be merged',
        zh: '只能合并同一视图内的区域'
    },
    'manual-filled-region-trouble5-title': {
        ja: '統合後に意図しない形状になる',
        en: 'Unexpected shape after merging',
        zh: '合并后出现意外形状'
    },
    'manual-filled-region-trouble5-item1': {
        ja: '重なり合っていない領域を統合した場合、複数エリアを持つ1つの領域になります。見た目には変化がない場合があります',
        en: 'If non-overlapping regions are merged, they become one region with multiple areas. The appearance may not change.',
        zh: '如果合并不重叠的区域，它们将成为具有多个面积的一个区域。外观可能不会改变。'
    },
    'manual-filled-region-trouble5-item2': {
        ja: 'ブーリアン和算の処理に失敗した場合、通常の複数ループ統合にフォールバックします',
        en: 'If Boolean union processing fails, it falls back to standard multi-loop merging',
        zh: '如果布尔并集处理失败，则退回到标准的多环合并'
    },
    'manual-filled-region-related-fire': {
        ja: '耐火被覆色分け',
        en: 'Fire Protection Coloring',
        zh: '耐火覆盖颜色标注'
    },
    'manual-filled-region-related-fire-desc': {
        ja: ' — 梁・柱の耐火被覆範囲を塗潰し領域で色分け表示',
        en: ' — Color-code beam and column fire protection range using filled regions',
        zh: ' — 用填充区域颜色标注梁和柱的耐火覆盖范围'
    }
};

    // ========================================
    // fire-protection.html (耐火被覆色分け)
    // ========================================
    translations.fireProtection = {
        'manual-fire-protection-title': {
            ja: '耐火被覆色分け',
            en: 'Fire Protection Coloring',
            zh: '防火覆盖着色'
        },
        'manual-fire-protection-subtitle': {
            ja: '梁・柱の耐火被覆を種類別に色分けし凡例も自動作成',
            en: 'Color-code beam/column fire protection by type with auto-generated legend',
            zh: '按类型为梁柱防火覆盖着色并自动生成图例'
        },
        'manual-fire-protection-overview': {
            ja: '平面・天伏・構造伏・断面ビューに配置されている梁・柱の耐火被覆範囲を、種類別に色分けされた塗潰し領域として自動作成する機能です。凡例（製図ビュー）も自動作成され、シート上で実行した場合はシート右上に自動配置されます。1枚のシート内の複数ビューも一括処理できます。',
            en: 'This feature automatically creates color-coded filled regions for fire protection ranges of beams and columns placed in plan, ceiling plan, structural framing, and section views. A legend (drafting view) is also automatically generated, and when executed on a sheet, it is automatically placed in the top-right corner. Multiple views on a single sheet can be processed in batch.',
            zh: '此功能可自动为平面、天花板平面、结构伏图、剖面视图中的梁柱防火覆盖范围按类型创建彩色填充区域。图例（绘图视图）也会自动生成，在图纸上执行时会自动放置在图纸右上角。可批量处理同一图纸中的多个视图。'
        },
        'manual-fire-protection-feature1': {
            ja: '平面・天伏・構造伏ビューで梁＋柱を色分け',
            en: 'Color-code beams and columns in plan, ceiling plan, and structural framing views',
            zh: '在平面、天花板平面、结构伏图视图中为梁和柱着色'
        },
        'manual-fire-protection-feature2': {
            ja: '断面図では梁のみ色分け対応',
            en: 'In section views, only beams are color-coded',
            zh: '剖面视图中仅对梁着色'
        },
        'manual-fire-protection-feature3': {
            ja: 'シート上で実行すれば複数ビューを一括処理',
            en: 'Execute on a sheet to batch-process multiple views',
            zh: '在图纸上执行可批量处理多个视图'
        },
        'manual-fire-protection-feature4': {
            ja: 'パラメータ名に「耐火被覆」を含むものを自動検出',
            en: 'Auto-detect parameters whose names include "耐火被覆" (fire protection)',
            zh: '自动检测名称中包含"耐火被覆"（防火覆盖）的参数'
        },
        'manual-fire-protection-feature5': {
            ja: '塗潰し領域のオフセットを共通／種類別に指定可能',
            en: 'Specify filled region offsets as common or per-type',
            zh: '可指定填充区域的偏移量为通用或按类型'
        },
        'manual-fire-protection-feature6': {
            ja: '柱は外寸・被覆厚を指定して枠型形状で生成',
            en: 'Columns are generated as frame shapes with specified outer dimension and coating thickness',
            zh: '柱可指定外尺寸和覆盖厚度，生成框形形状'
        },
        'manual-fire-protection-feature7': {
            ja: '凡例（製図ビュー）を自動生成しシート右上に自動配置',
            en: 'Auto-generate a legend (drafting view) and place it at top-right of the sheet',
            zh: '自动生成图例（绘图视图）并自动放置在图纸右上角'
        },
        'manual-fire-protection-feature8': {
            ja: '既存の塗潰し領域・凡例を上書き再生成するモードあり',
            en: 'Overwrite mode regenerates existing filled regions and legend',
            zh: '具有覆盖模式可重新生成现有填充区域和图例'
        },
        'manual-fire-protection-prep1-title': {
            ja: '耐火被覆のパラメータを設定する',
            en: 'Configure fire protection parameters',
            zh: '设置防火覆盖参数'
        },
        'manual-fire-protection-prep1-desc': {
            ja: '梁・柱のインスタンスまたはタイプに、耐火被覆の種類を識別するパラメータを設定しておきます。',
            en: 'Set a parameter on beam/column instances or types that identifies the fire protection type.',
            zh: '在梁柱的实例或类型上设置可识别防火覆盖类型的参数。'
        },
        'manual-fire-protection-prep2-title': {
            ja: '梁・柱ファミリを確認する',
            en: 'Verify beam/column families',
            zh: '确认梁柱族'
        },
        'manual-fire-protection-prep3-title': {
            ja: 'ビューテンプレートの確認',
            en: 'Check view templates',
            zh: '确认视图样板'
        },
        'manual-fire-protection-prep3-desc': {
            ja: 'ビューテンプレートが設定されているビューでは塗潰し領域を配置できないため、コマンド実行時に「テンプレートを解除しますか？」という確認が表示されます。「はい」で解除して進めるか、事前に解除しておいてください。',
            en: 'Filled regions cannot be placed in views with a view template applied, so a confirmation dialog appears asking "Detach template?" when the command runs. Click Yes to proceed, or detach the template beforehand.',
            zh: '在应用了视图样板的视图中无法放置填充区域，因此执行命令时会显示"解除样板？"的确认对话框。点击"是"继续，或事先解除样板。'
        },
        'manual-fire-protection-views-hint': {
            ja: '💡 <strong>おすすめは「シート上で実行」</strong> — 複数ビューを一度に処理し、凡例も自動でレイアウトされます。',
            en: '💡 <strong>Recommended: Run on a sheet</strong> — Processes multiple views at once and lays out the legend automatically.',
            zh: '💡 <strong>推荐"在图纸上执行"</strong> — 一次处理多个视图，并自动布局图例。'
        },
        'manual-fire-protection-step1-title': {
            ja: '対象のビューまたはシートを開く',
            en: 'Open the target view or sheet',
            zh: '打开目标视图或图纸'
        },
        'manual-fire-protection-step1-desc': {
            ja: '平面・天伏・構造伏・断面、または対象ビューが配置されたシートをアクティブにします。シート上で実行すると複数ビューを一括処理できます。',
            en: 'Activate a plan, ceiling plan, structural framing, section view, or a sheet containing target views. Executing on a sheet processes multiple views at once.',
            zh: '激活平面、天花板平面、结构伏图、剖面视图或包含目标视图的图纸。在图纸上执行可一次处理多个视图。'
        },
        'manual-fire-protection-step2-title': {
            ja: 'ボタンをクリック',
            en: 'Click the button',
            zh: '点击按钮'
        },
        'manual-fire-protection-step2-desc': {
            ja: 'リボン「28 Tools」タブ →「色分け」パネル →「耐火被覆色分け」をクリックします。',
            en: 'Click Ribbon "28 Tools" tab → "Coloring" panel → "Fire Protection Coloring".',
            zh: '点击功能区"28 Tools"选项卡 → "着色"面板 → "防火覆盖着色"。'
        },
        'manual-fire-protection-step3-title': {
            ja: 'STEP 1/3：基本設定',
            en: 'STEP 1/3: Basic settings',
            zh: 'STEP 1/3：基本设置'
        },
        'manual-fire-protection-step3-desc': {
            ja: '耐火被覆パラメータを選択し、検出された種類ごとに自動割り当てされた色を確認・変更します。塗潰し領域のオフセット（共通／種類別）も指定できます。',
            en: 'Select the fire protection parameter and review/change the auto-assigned color for each detected type. Filled region offset (common or per-type) can also be specified.',
            zh: '选择防火覆盖参数，确认/更改为每种检测到的类型自动分配的颜色。还可指定填充区域偏移量（通用或按类型）。'
        },
        'manual-fire-protection-step4-title': {
            ja: 'STEP 2/3：柱設定',
            en: 'STEP 2/3: Column settings',
            zh: 'STEP 2/3：柱设置'
        },
        'manual-fire-protection-step4-desc': {
            ja: '平面・天伏・構造伏では柱A（外寸）と柱B（被覆厚）を指定します。柱は内側に空洞のある枠型として塗潰し領域が作成されます（断面のみ実行時はスキップ）。',
            en: 'For plan, ceiling plan, and structural framing views, specify Column A (outer dimension) and Column B (coating thickness). Columns are created as frame-shaped filled regions with hollow inside (skipped if only running on sections).',
            zh: '对于平面、天花板平面、结构伏图，指定柱A（外尺寸）和柱B（覆盖厚度）。柱被创建为内部空心的框形填充区域（仅在剖面运行时跳过）。'
        },
        'manual-fire-protection-step5-title': {
            ja: 'STEP 3/3：表示・確認と実行',
            en: 'STEP 3/3: Display, review, and execute',
            zh: 'STEP 3/3：显示、确认并执行'
        },
        'manual-fire-protection-step5-desc': {
            ja: '線種・塗りパターン・凡例の文字タイプを設定し、処理概要を確認して「実行」をクリックします。塗潰し領域と凡例ビューが自動生成されます。',
            en: 'Set the line style, fill pattern, and legend text type. Review the processing summary and click "Execute". Filled regions and the legend view are generated automatically.',
            zh: '设置线型、填充图案、图例文字类型，确认处理概要后点击"执行"。将自动生成填充区域和图例视图。'
        },
        'manual-fire-protection-usecase1-title': {
            ja: '耐火仕様の図面化',
            en: 'Visualizing fire protection specs',
            zh: '将防火规格图纸化'
        },
        'manual-fire-protection-usecase1-desc': {
            ja: '梁・柱の耐火被覆仕様を種類別に色分けした図面を、設計図書・施工図として瞬時に作成できます。',
            en: 'Instantly generate drawings color-coded by fire protection type for use in design documents and shop drawings.',
            zh: '可瞬间生成按类型对梁柱防火覆盖规格着色的图纸，用于设计文档和施工图。'
        },
        'manual-fire-protection-usecase2-title': {
            ja: '仕様確認・設計レビュー',
            en: 'Spec check and design review',
            zh: '规格确认和设计审查'
        },
        'manual-fire-protection-usecase2-desc': {
            ja: '耐火被覆の指定漏れや種類の誤りを視覚的に確認でき、設計レビュー時のチェック作業を効率化します。',
            en: 'Visually identify missing or incorrect fire protection specifications, streamlining design review.',
            zh: '可视化确认防火覆盖的遗漏指定或类型错误，提高设计审查效率。'
        },
        'manual-fire-protection-usecase3-title': {
            ja: 'シート出力の自動化',
            en: 'Automated sheet output',
            zh: '图纸输出自动化'
        },
        'manual-fire-protection-usecase3-desc': {
            ja: 'シート上で実行するだけで複数ビューと凡例が一括レイアウトされ、提出図書の作成時間を大幅に短縮します。',
            en: 'Simply run on a sheet to lay out multiple views and the legend at once, drastically reducing time for deliverable preparation.',
            zh: '只需在图纸上执行即可一次性布局多个视图和图例，大幅缩短提交文件的制作时间。'
        },
        'manual-fire-protection-tip1': {
            ja: '<strong data-lang-key="manual-fire-protection-tip1-strong">シート上での実行が最も効率的：</strong>平面・断面など複数ビューを一括処理でき、凡例も自動でシート右上に配置されます。',
            en: '<strong data-lang-key="manual-fire-protection-tip1-strong">Running on a sheet is the most efficient:</strong> Multiple views like plans and sections can be batch-processed, and the legend is automatically placed at the top-right of the sheet.',
            zh: '<strong data-lang-key="manual-fire-protection-tip1-strong">在图纸上运行最高效：</strong>可批量处理平面、剖面等多个视图，图例也会自动放置在图纸右上角。'
        },
        'manual-fire-protection-tip1-strong': {
            ja: 'シート上での実行が最も効率的：',
            en: 'Running on a sheet is the most efficient:',
            zh: '在图纸上运行最高效：'
        },
        'manual-fire-protection-tip2': {
            ja: '<strong data-lang-key="manual-fire-protection-tip2-strong">再実行時は上書きON：</strong>STEP 3の「既存の『耐火被覆_』塗潰領域・凡例を上書きする」にチェックを入れると、設定変更してきれいに再生成できます。',
            en: '<strong data-lang-key="manual-fire-protection-tip2-strong">Turn on overwrite when re-running:</strong> Check "Overwrite existing 耐火被覆_ filled regions and legend" in STEP 3 to cleanly regenerate after setting changes.',
            zh: '<strong data-lang-key="manual-fire-protection-tip2-strong">重新执行时打开覆盖：</strong>在STEP 3勾选"覆盖现有的『耐火被覆_』填充区域和图例"，可在更改设置后干净地重新生成。'
        },
        'manual-fire-protection-tip2-strong': {
            ja: '再実行時は上書きON：',
            en: 'Turn on overwrite when re-running:',
            zh: '重新执行时打开覆盖：'
        },
        'manual-fire-protection-tip3': {
            ja: '<strong data-lang-key="manual-fire-protection-tip3-strong">色は手動変更可能：</strong>自動割り当ては梁＝パステル系／柱＝ビビッド系で最大12種類保証。気に入らない色はダイアログで個別にクリックして変更できます。',
            en: '<strong data-lang-key="manual-fire-protection-tip3-strong">Colors can be changed manually:</strong> Auto-assignment uses pastel tones for beams and vivid tones for columns, guaranteeing up to 12 distinct colors. Click each color in the dialog to change.',
            zh: '<strong data-lang-key="manual-fire-protection-tip3-strong">颜色可手动更改：</strong>自动分配为梁=柔和色系/柱=鲜艳色系，最多保证12种不同颜色。不满意的颜色可在对话框中单独点击更改。'
        },
        'manual-fire-protection-tip3-strong': {
            ja: '色は手動変更可能：',
            en: 'Colors can be changed manually:',
            zh: '颜色可手动更改：'
        },
        'manual-fire-protection-note1': {
            ja: '梁・柱に「耐火被覆」を含む名前のパラメータ（インスタンスまたはタイプ）が必要です。値が空の要素は色分け対象外となります。',
            en: 'A parameter (instance or type) whose name includes "耐火被覆" is required on beams/columns. Elements with empty values are excluded from coloring.',
            zh: '梁柱需要名称中包含"耐火被覆"的参数（实例或类型）。值为空的元素不参与着色。'
        },
        'manual-fire-protection-note2': {
            ja: 'パラメータ値の表記ゆれ（全角／半角・空白の差・タイプミス）は別の種類として検出されるため、値の統一にご注意ください。',
            en: 'Inconsistencies in parameter values (full-width/half-width, spaces, typos) are detected as different types, so keep values uniform.',
            zh: '参数值的表记差异（全角/半角、空格差异、错字）会被检测为不同类型，请注意值的统一。'
        },
        'manual-fire-protection-note3': {
            ja: 'ビューテンプレートが設定されているビューでは、実行時にテンプレート解除の確認ダイアログが表示されます。',
            en: 'For views with a view template applied, a confirmation dialog to detach the template appears at runtime.',
            zh: '对于应用了视图样板的视图，执行时会显示解除样板的确认对话框。'
        },
        'manual-fire-protection-note4': {
            ja: '3Dビュー・立面ビューでは実行できません。平面・天伏・構造伏・断面、またはシート上でご利用ください。',
            en: 'Cannot run on 3D views or elevation views. Use plan, ceiling plan, structural framing, section, or sheet views.',
            zh: '无法在3D视图或立面视图中执行。请在平面、天花板平面、结构伏图、剖面或图纸视图中使用。'
        },
        'manual-fire-protection-step3-row1-name': {
            ja: '耐火被覆パラメータ',
            en: 'Fire protection parameter',
            zh: '防火覆盖参数'
        },
        'manual-fire-protection-step3-row1-desc': {
            ja: '自動検出されたパラメータを選択（複数候補がある場合）',
            en: 'Select an auto-detected parameter (when multiple candidates exist)',
            zh: '选择自动检测到的参数（有多个候选时）'
        },
        'manual-fire-protection-step3-row2-name': {
            ja: '検出された耐火被覆の種類',
            en: 'Detected fire protection types',
            zh: '检测到的防火覆盖类型'
        },
        'manual-fire-protection-step3-row2-desc': {
            ja: 'ビュー内で見つかった種類の一覧。色を自動割り当て（クリックで変更可能）',
            en: 'List of types found in the view. Colors are auto-assigned (click to change)',
            zh: '视图中找到的类型列表。自动分配颜色（点击可更改）'
        },
        'manual-fire-protection-step3-row3-name': {
            ja: '塗潰し領域のオフセット設定',
            en: 'Filled region offset setting',
            zh: '填充区域偏移设置'
        },
        'manual-fire-protection-step3-row3-desc': {
            ja: '梁・柱の周囲に何mmはみ出して塗潰すかを指定',
            en: 'Specify how many mm to extend the fill around beams/columns',
            zh: '指定围绕梁柱外扩多少mm进行填充'
        },
        'manual-fire-protection-step3-row4-name': {
            ja: '共通オフセット',
            en: 'Common offset',
            zh: '通用偏移'
        },
        'manual-fire-protection-step3-row4-desc': {
            ja: '全種類で同じ値',
            en: 'Same value for all types',
            zh: '所有类型使用相同值'
        },
        'manual-fire-protection-step3-row5-name': {
            ja: '種類ごとに個別オフセット',
            en: 'Per-type offset',
            zh: '按类型单独偏移'
        },
        'manual-fire-protection-step3-row5-desc': {
            ja: '種類別に個別の値を指定',
            en: 'Specify individual values per type',
            zh: '按类型指定不同的值'
        },
        'manual-fire-protection-step4-row1-name': {
            ja: '柱A（外寸）',
            en: 'Column A (outer dimension)',
            zh: '柱A（外尺寸）'
        },
        'manual-fire-protection-step4-row1-desc': {
            ja: '柱の外周から被覆外面までの距離 mm',
            en: 'Distance from column outer perimeter to coating outer surface (mm)',
            zh: '从柱外周到覆盖外表面的距离 mm'
        },
        'manual-fire-protection-step4-row2-name': {
            ja: '柱B（被覆厚）',
            en: 'Column B (coating thickness)',
            zh: '柱B（覆盖厚度）'
        },
        'manual-fire-protection-step4-row2-desc': {
            ja: '被覆の厚み mm',
            en: 'Coating thickness (mm)',
            zh: '覆盖厚度 mm'
        },
        'manual-fire-protection-step5-row1-name': {
            ja: '線種',
            en: 'Line style',
            zh: '线型'
        },
        'manual-fire-protection-step5-row1-desc': {
            ja: '塗潰し領域の境界線の種類',
            en: 'Boundary line type of the filled region',
            zh: '填充区域边界线的类型'
        },
        'manual-fire-protection-step5-row2-name': {
            ja: '塗りパターン',
            en: 'Fill pattern',
            zh: '填充图案'
        },
        'manual-fire-protection-step5-row2-desc': {
            ja: '塗潰しパターン（通常は「Solid fill」または「中実」）',
            en: 'Fill pattern (usually "Solid fill" or "中実")',
            zh: '填充图案（通常为"Solid fill"或"中实"）'
        },
        'manual-fire-protection-step5-row3-name': {
            ja: '文字タイプ',
            en: 'Text type',
            zh: '文字类型'
        },
        'manual-fire-protection-step5-row3-desc': {
            ja: '凡例に使用するテキストノートのタイプ',
            en: 'Text note type used in the legend',
            zh: '图例使用的文字注释类型'
        },
        'manual-fire-protection-step5-row4-name': {
            ja: '既存の「耐火被覆_」塗潰領域・凡例を上書きする',
            en: 'Overwrite existing "耐火被覆_" filled regions and legend',
            zh: '覆盖现有的"耐火被覆_"填充区域和图例'
        },
        'manual-fire-protection-step5-row4-desc': {
            ja: '再実行時にチェック推奨（既存を削除して再生成）',
            en: 'Recommended when re-running (deletes existing and regenerates)',
            zh: '重新执行时建议勾选（删除现有并重新生成）'
        },
        'manual-fire-protection-output-intro': {
            ja: '実行後、以下が自動作成されます。',
            en: 'After execution, the following are automatically created.',
            zh: '执行后将自动创建以下内容。'
        },
        'manual-fire-protection-output1-title': {
            ja: '1. 塗潰し領域（FilledRegion）',
            en: '1. Filled Region',
            zh: '1. 填充区域（FilledRegion）'
        },
        'manual-fire-protection-output1-desc': {
            ja: '各ビューの梁・柱の周囲に、種類別の色で塗潰し領域が配置されます。',
            en: 'Filled regions colored by type are placed around beams/columns in each view.',
            zh: '在各视图的梁柱周围放置按类型着色的填充区域。'
        },
        'manual-fire-protection-output1-item1': {
            ja: '塗潰しタイプ名：<code>耐火被覆_{種類名}</code>（梁）／ <code>耐火被覆_柱_{種類名}</code>（柱）',
            en: 'Filled region type name: <code>耐火被覆_{type}</code> (beam) / <code>耐火被覆_柱_{type}</code> (column)',
            zh: '填充类型名：<code>耐火被覆_{类型名}</code>（梁）／ <code>耐火被覆_柱_{类型名}</code>（柱）'
        },
        'manual-fire-protection-output1-item2': {
            ja: '種類が同じ要素は同じ色',
            en: 'Elements of the same type share the same color',
            zh: '相同类型的元素使用相同颜色'
        },
        'manual-fire-protection-output2-title': {
            ja: '2. 凡例（製図ビュー）',
            en: '2. Legend (Drafting View)',
            zh: '2. 图例（绘图视图）'
        },
        'manual-fire-protection-output2-desc': {
            ja: '<code>耐火被覆色分け凡例</code> という名前の製図ビューが自動作成されます。',
            en: 'A drafting view named <code>耐火被覆色分け凡例</code> is automatically created.',
            zh: '自动创建名为<code>耐火被覆色分け凡例</code>的绘图视图。'
        },
        'manual-fire-protection-output2-item1': {
            ja: 'タイトル「◎耐火被覆仕様凡例」',
            en: 'Title "◎耐火被覆仕様凡例" (Fire Protection Specification Legend)',
            zh: '标题"◎耐火被覆仕様凡例"（防火覆盖规格图例）'
        },
        'manual-fire-protection-output2-item2': {
            ja: '各種類の色四角＋名称',
            en: 'Color squares and names for each type',
            zh: '各类型的色块和名称'
        },
        'manual-fire-protection-output2-item3': {
            ja: '柱の枠型サンプル',
            en: 'Column frame-shape sample',
            zh: '柱的框形示例'
        },
        'manual-fire-protection-output2-item4': {
            ja: '注記（耐火被覆不要範囲・半湿式吹付ロックウール工法の例外範囲など）',
            en: 'Notes (areas not requiring fire protection, exceptions for semi-wet spray rockwool method, etc.)',
            zh: '注记（不需要防火覆盖的范围、半湿式喷涂岩棉工法的例外范围等）'
        },
        'manual-fire-protection-output3-title': {
            ja: '3. シート上での凡例自動配置',
            en: '3. Auto-placement of Legend on Sheet',
            zh: '3. 图纸上图例的自动放置'
        },
        'manual-fire-protection-output3-desc': {
            ja: '<strong>シートで実行した場合のみ</strong>、上記凡例がシートの<strong>右上角</strong>にビューポートとして自動配置されます。',
            en: '<strong>Only when run on a sheet</strong>, the legend above is automatically placed as a viewport at the <strong>top-right corner</strong> of the sheet.',
            zh: '<strong>仅在图纸上执行时</strong>，上述图例会作为视口自动放置在图纸的<strong>右上角</strong>。'
        },
        'manual-fire-protection-output3-hint': {
            ja: '💡 配置位置が気に入らない場合は、Revit上でビューポートを掴んで移動できます。',
            en: '💡 If you don\'t like the placement, you can drag the viewport in Revit to move it.',
            zh: '💡 如果不喜欢放置位置，可在Revit中拖动视口移动。'
        },
        'manual-fire-protection-rerun-intro': {
            ja: '設定を変更して再実行したい場合：',
            en: 'To re-run with changed settings:',
            zh: '更改设置后想重新执行时：'
        },
        'manual-fire-protection-rerun-step1': {
            ja: 'ダイアログのSTEP 3で<strong>「既存の『耐火被覆_』塗潰領域・凡例を上書きする」</strong>にチェック',
            en: 'In STEP 3 of the dialog, check <strong>"Overwrite existing 耐火被覆_ filled regions and legend"</strong>',
            zh: '在对话框的STEP 3勾选<strong>"覆盖现有的『耐火被覆_』填充区域和图例"</strong>'
        },
        'manual-fire-protection-rerun-step2': {
            ja: '「実行」をクリック',
            en: 'Click "Execute"',
            zh: '点击"执行"'
        },
        'manual-fire-protection-rerun-result': {
            ja: '→ 既存の塗潰し領域・凡例ビューが削除され、新しい設定で再作成されます。',
            en: '→ Existing filled regions and the legend view are deleted, and recreated with the new settings.',
            zh: '→ 现有的填充区域和图例视图将被删除，并以新设置重新创建。'
        },
        'manual-fire-protection-trouble1-title': {
            ja: '「ビュー内に梁または柱が見つかりません」と表示される',
            en: '"No beams or columns found in the view" is displayed',
            zh: '显示"视图中未找到梁或柱"'
        },
        'manual-fire-protection-trouble1-item1': {
            ja: 'ビュー上で梁・柱が<strong>表示されている</strong>か確認してください（フィルタや非表示で隠れていませんか？）',
            en: 'Check that beams/columns are <strong>visible</strong> in the view (not hidden by filters or hide commands)',
            zh: '请确认梁柱在视图上<strong>已显示</strong>（是否被过滤器或隐藏命令隐藏？）'
        },
        'manual-fire-protection-trouble1-item2': {
            ja: '構造フレーム（梁）／構造柱のカテゴリで配置されているか確認',
            en: 'Verify they are placed under the Structural Framing (beams) / Structural Columns categories',
            zh: '确认是否放置于结构框架（梁）／结构柱类别下'
        },
        'manual-fire-protection-trouble2-title': {
            ja: '「『耐火被覆』を含むパラメータが見つかりません」と表示される',
            en: '"No parameter containing 耐火被覆 found" is displayed',
            zh: '显示"未找到包含『耐火被覆』的参数"'
        },
        'manual-fire-protection-trouble2-item1': {
            ja: '梁・柱の<strong>インスタンスまたはタイプパラメータ</strong>に「耐火被覆」を含む名前のパラメータを追加してください',
            en: 'Add a parameter whose name includes "耐火被覆" to the <strong>instance or type parameters</strong> of beams/columns',
            zh: '请在梁柱的<strong>实例或类型参数</strong>中添加名称包含"耐火被覆"的参数'
        },
        'manual-fire-protection-trouble2-item2': {
            ja: '共有パラメータ・プロジェクトパラメータどちらでも可',
            en: 'Either shared parameters or project parameters can be used',
            zh: '共享参数或项目参数均可'
        },
        'manual-fire-protection-trouble3-title': {
            ja: '検出された種類が想定と違う',
            en: 'Detected types differ from expected',
            zh: '检测到的类型与预期不同'
        },
        'manual-fire-protection-trouble3-item1': {
            ja: 'パラメータの値に<strong>タイプミス・全角半角混在・空白の差</strong>がないか確認',
            en: 'Check parameter values for <strong>typos, mixed full/half-width characters, or space differences</strong>',
            zh: '检查参数值是否存在<strong>错字、全角半角混用、空格差异</strong>'
        },
        'manual-fire-protection-trouble3-item2': {
            ja: 'パラメータ値が空の要素は色分け対象外',
            en: 'Elements with empty parameter values are excluded from coloring',
            zh: '参数值为空的元素不参与着色'
        },
        'manual-fire-protection-trouble4-title': {
            ja: '凡例がシートからはみ出す',
            en: 'Legend extends beyond the sheet',
            zh: '图例超出图纸范围'
        },
        'manual-fire-protection-trouble4-item1': {
            ja: '種類数が多い場合や注記文字サイズが大きい場合、凡例サイズが推定より大きくなることがあります',
            en: 'When there are many types or the annotation text size is large, the legend may be larger than estimated',
            zh: '类型数量多或注记文字尺寸大时，图例尺寸可能比预估更大'
        },
        'manual-fire-protection-trouble4-item2': {
            ja: 'Revit上で凡例ビューポートを手動で移動してください',
            en: 'Manually move the legend viewport in Revit',
            zh: '请在Revit中手动移动图例视口'
        },
        'manual-fire-protection-trouble5-title': {
            ja: '同じ色が複数の種類に使われている',
            en: 'The same color is used for multiple types',
            zh: '同一颜色被用于多个类型'
        },
        'manual-fire-protection-trouble5-item1': {
            ja: '種類が13以上ある場合、色のバリエーションを増やすため明度違いの色になります',
            en: 'When there are 13 or more types, colors of different brightness are used to add variation',
            zh: '类型数达到13个以上时，会使用不同明度的颜色以增加变化'
        },
        'manual-fire-protection-trouble5-item2': {
            ja: 'ダイアログ「検出された耐火被覆の種類」セクションで色四角をクリックして手動変更できます',
            en: 'In the "Detected fire protection types" section of the dialog, click a color square to change it manually',
            zh: '在对话框的"检测到的防火覆盖类型"部分点击色块可手动更改'
        },
        'manual-fire-protection-trouble6-title': {
            ja: 'ビューテンプレートがある',
            en: 'A view template is applied',
            zh: '应用了视图样板'
        },
        'manual-fire-protection-trouble6-item1': {
            ja: '実行時に解除確認ダイアログが出ます。「はい」で一時的に解除します',
            en: 'A detach confirmation dialog appears at runtime. Click "Yes" to detach temporarily',
            zh: '执行时会显示解除确认对话框。点击"是"暂时解除'
        },
        'manual-fire-protection-trouble6-item2': {
            ja: '元に戻したい場合は、実行後に手動でテンプレートを再設定してください',
            en: 'To revert, manually reapply the template after execution',
            zh: '如想恢复，请在执行后手动重新设置样板'
        },
        'manual-fire-protection-related-beam-bottom': {
            ja: '梁下端色分け',
            en: 'Beam Bottom Level Coloring',
            zh: '梁底标高着色'
        },
        'manual-fire-protection-related-beam-bottom-desc': {
            ja: ' — 天井伏図で梁下端レベルを色分け',
            en: ' — Color-code beam bottom levels in ceiling plans',
            zh: ' — 在天花板平面图中按梁底标高着色'
        },
        'manual-fire-protection-related-beam-top': {
            ja: '梁天端色分け',
            en: 'Beam Top Level Coloring',
            zh: '梁顶标高着色'
        },
        'manual-fire-protection-related-beam-top-desc': {
            ja: ' — 平面・構造伏図で梁天端レベルを色分け',
            en: ' — Color-code beam top levels in plan and structural framing views',
            zh: ' — 在平面图、结构伏图中按梁顶标高着色'
        },
        'manual-fire-protection-view-row1-type': {
            ja: '平面ビュー',
            en: 'Plan View',
            zh: '平面视图'
        },
        'manual-fire-protection-view-row1-behavior': {
            ja: '梁＋柱を色分け',
            en: 'Color-code beams and columns',
            zh: '为梁和柱着色'
        },
        'manual-fire-protection-view-row2-type': {
            ja: '天井伏図',
            en: 'Ceiling Plan',
            zh: '天花板平面'
        },
        'manual-fire-protection-view-row2-behavior': {
            ja: '梁＋柱を色分け',
            en: 'Color-code beams and columns',
            zh: '为梁和柱着色'
        },
        'manual-fire-protection-view-row3-type': {
            ja: '構造伏図',
            en: 'Structural Framing Plan',
            zh: '结构伏图'
        },
        'manual-fire-protection-view-row3-behavior': {
            ja: '梁＋柱を色分け',
            en: 'Color-code beams and columns',
            zh: '为梁和柱着色'
        },
        'manual-fire-protection-view-row4-type': {
            ja: '断面図',
            en: 'Section View',
            zh: '剖面视图'
        },
        'manual-fire-protection-view-row4-behavior': {
            ja: '梁のみ色分け',
            en: 'Color-code beams only',
            zh: '仅为梁着色'
        },
        'manual-fire-protection-view-row5-type': {
            ja: 'シート',
            en: 'Sheet',
            zh: '图纸'
        },
        'manual-fire-protection-view-row5-behavior': {
            ja: '配置されている上記ビューを一括処理＋凡例自動配置',
            en: 'Batch-process the views placed on the sheet + auto-place legend',
            zh: '批量处理图纸上的上述视图＋自动放置图例'
        },
        'manual-fire-protection-view-row6-type': {
            ja: 'その他（3D・立面など）',
            en: 'Others (3D, elevation, etc.)',
            zh: '其他（3D、立面等）'
        },
        'manual-fire-protection-view-row6-behavior': {
            ja: '実行不可',
            en: 'Cannot execute',
            zh: '无法执行'
        }
    };

    // ========================================
    // formwork-calculator.html (型枠数量算出)
    // ========================================
    translations.formwork = {
        'manual-formwork-title': {
            ja: '型枠数量算出',
            en: 'Formwork Quantity Calculation',
            zh: '模板数量计算'
        },
        'manual-formwork-subtitle': {
            ja: 'RC躯体から型枠面積を自動算出しExcel・集計表・3Dビューに出力',
            en: 'Auto-calculate formwork area from RC structures, output to Excel/schedules/3D views',
            zh: '从RC结构自动计算模板面积并输出到Excel、明细表和3D视图'
        },
        'manual-formwork-overview': {
            ja: 'RC躯体モデルから「型枠が必要な面」と「不要な面（接触面・天端・地中部）」を自動分類し、要素ごとの型枠面積をレベル・部位・タイプ別に集計します。結果はExcelファイル・Revit集計表・色分け3Dビュー・シートに同時出力できます。鉄骨部材・デッキスラブ・LGS壁などは自動判別して除外されます。',
            en: 'Automatically classifies surfaces as "formwork-required" or "not required (contact/top/underground)" from RC structural models, and aggregates formwork area per element by level, member, and type. Results can be simultaneously output to Excel files, Revit schedules, color-coded 3D views, and sheets. Steel members, deck slabs, and LGS walls are automatically detected and excluded.',
            zh: '从RC结构模型自动分类"需要模板的面"和"不需要的面（接触面、顶面、地下部分）"，按层级、部位、类型汇总各元素的模板面积。结果可同时输出到Excel文件、Revit明细表、彩色3D视图和图纸。钢构件、压型钢板楼板、LGS墙等会自动识别并排除。'
        },
        'manual-formwork-feature1': {
            ja: '柱・梁・壁・床・基礎・階段・屋根を対象に自動算出',
            en: 'Auto-calculate for columns, beams, walls, floors, foundations, stairs, and roofs',
            zh: '自动计算柱、梁、墙、楼板、基础、楼梯、屋顶'
        },
        'manual-formwork-feature2': {
            ja: '要素同士の接触面・天端・地中部を幾何検査で自動控除',
            en: 'Auto-deduct contact surfaces, top surfaces, and underground parts through geometric inspection',
            zh: '通过几何检查自动扣除元素间接触面、顶面和地下部分'
        },
        'manual-formwork-feature3': {
            ja: 'Join Geometry の事前接合は不要',
            en: 'No pre-joining with Join Geometry required',
            zh: '无需事先使用Join Geometry连接'
        },
        'manual-formwork-feature4': {
            ja: '鉄骨・デッキスラブ・LGS壁・鉄骨階段を自動除外',
            en: 'Auto-exclude steel members, deck slabs, LGS walls, and steel stairs',
            zh: '自动排除钢构件、压型钢板楼板、LGS墙、钢楼梯'
        },
        'manual-formwork-feature5': {
            ja: 'レベル → 部位 → タイプ名の階層で集計表を生成',
            en: 'Generate schedules grouped hierarchically by Level → Member → Type',
            zh: '按层级 → 部位 → 类型名的层级生成明细表'
        },
        'manual-formwork-feature6': {
            ja: '部位別・工区別・型枠種別で色分け3Dビューを作成',
            en: 'Create color-coded 3D views by member, work zone, or formwork type',
            zh: '按部位、工区、模板类型创建彩色3D视图'
        },
        'manual-formwork-feature7': {
            ja: 'Excel出力（部位別シート＋総括シート、オートフィルタ自動設定）',
            en: 'Excel output (per-member sheets + summary sheet with auto-filter)',
            zh: 'Excel输出（按部位的工作表+汇总表，自动设置筛选）'
        },
        'manual-formwork-feature8': {
            ja: '集計シート（3Dビュー＋集計表）を自動レイアウト',
            en: 'Auto-layout summary sheet (3D view + schedules)',
            zh: '自动布局汇总图纸（3D视图+明细表）'
        },
        'manual-formwork-feature9': {
            ja: 'GL高さで地中部分を控除するオプション',
            en: 'Option to deduct underground portions by GL height',
            zh: '通过GL高度扣除地下部分的选项'
        },
        'manual-formwork-prep1-title': {
            ja: 'モデルの確認',
            en: 'Verify the model',
            zh: '确认模型'
        },
        'manual-formwork-prep1-desc': {
            ja: '下記カテゴリに該当するものが算出対象になります。正しいカテゴリでモデリングされているかを確認してください。',
            en: 'Elements in the following categories are subject to calculation. Verify they are modeled in the correct categories.',
            zh: '以下类别的元素为计算对象。请确认是否以正确的类别建模。'
        },
        'manual-formwork-prep2-title': {
            ja: 'レベル設定',
            en: 'Level settings',
            zh: '层级设置'
        },
        'manual-formwork-prep2-desc': {
            ja: '各要素のベースレベル・上部レベルが正しく設定されていることを確認してください。集計表はレベル順にグループ化されます。',
            en: 'Verify that the base level and top level of each element are set correctly. Schedules are grouped in level order.',
            zh: '请确认各元素的基准层级和顶层级设置正确。明细表按层级顺序分组。'
        },
        'manual-formwork-prep3-title': {
            ja: '要素同士の結合は不要',
            en: 'Element joining not required',
            zh: '元素之间无需结合'
        },
        'manual-formwork-prep3-desc': {
            ja: '柱と梁、梁と床などが接している部分は <strong>Revit の「結合」機能で結合させていなくても自動で接触面を判別</strong>します。モデリング時に結合し忘れがあっても、接触している箇所は型枠不要として正しく控除されます。',
            en: 'Where columns and beams or beams and floors are touching, the contact surfaces are <strong>automatically detected even without using Revit\'s "Join" feature</strong>. Even if joining is forgotten during modeling, touching areas are correctly deducted as formwork-unnecessary.',
            zh: '柱与梁、梁与楼板等相接的部分，<strong>即使未使用Revit的"结合"功能进行结合也会自动判别接触面</strong>。即使在建模时忘记结合，相接的部分也会作为不需要模板正确扣除。'
        },
        'manual-formwork-prep4-title': {
            ja: '自動除外される要素（モデル変更不要）',
            en: 'Auto-excluded elements (no model changes needed)',
            zh: '自动排除的元素（无需修改模型）'
        },
        'manual-formwork-prep4-desc': {
            ja: '以下は型枠不要と判定され、集計から自動的に除外されます：',
            en: 'The following are determined to require no formwork and are automatically excluded from aggregation:',
            zh: '以下被判定为不需要模板，将自动从汇总中排除：'
        },
        'manual-formwork-views-hint': {
            ja: '💡 <strong>ポイント：</strong>計算対象を絞り込みたい場合は、対象範囲のみが表示された3Dビューを開いた状態で「現在のビューに表示されている要素」を選択してください。セクションボックスで切り取った範囲のみを算出することも可能です。',
            en: '💡 <strong>Tip:</strong> To narrow the calculation scope, open a 3D view showing only the target range and choose "Elements visible in the current view". Section box-clipped ranges can also be used.',
            zh: '💡 <strong>要点：</strong>要缩小计算范围时，请打开仅显示目标范围的3D视图，并选择"当前视图中可见的元素"。也可仅计算剖面框裁剪的范围。'
        },
        'manual-formwork-step1-title': {
            ja: 'リボンからボタンを実行',
            en: 'Click the button on the ribbon',
            zh: '从功能区执行按钮'
        },
        'manual-formwork-step1-desc': {
            ja: '<code>Tools28</code> リボン → 構造パネル → <strong>「型枠数量算出」</strong> をクリックします。',
            en: 'Click <code>Tools28</code> ribbon → Structure panel → <strong>"Formwork Quantity Calculation"</strong>.',
            zh: '点击 <code>Tools28</code> 功能区 → 结构面板 → <strong>"模板数量计算"</strong>。'
        },
        'manual-formwork-step2-title': {
            ja: '設定ダイアログで条件を指定',
            en: 'Specify conditions in the settings dialog',
            zh: '在设置对话框中指定条件'
        },
        'manual-formwork-step2-range-title': {
            ja: '計算範囲',
            en: 'Calculation Scope',
            zh: '计算范围'
        },
        'manual-formwork-step2-range-item1': {
            ja: '<strong>プロジェクト全体</strong> — モデル内の全要素を対象',
            en: '<strong>Entire project</strong> — All elements in the model',
            zh: '<strong>整个项目</strong> — 模型内的所有元素'
        },
        'manual-formwork-step2-range-item2': {
            ja: '<strong>現在のビューに表示されている要素</strong> — アクティブ3Dビューで可視の要素のみ',
            en: '<strong>Elements visible in the current view</strong> — Only elements visible in the active 3D view',
            zh: '<strong>当前视图中可见的元素</strong> — 仅活动3D视图中可见的元素'
        },
        'manual-formwork-step2-agg-title': {
            ja: '集計区分（複数選択可）',
            en: 'Aggregation Categories (multi-select)',
            zh: '汇总分类（可多选）'
        },
        'manual-formwork-step2-agg-item1': {
            ja: '<strong>部位別</strong>（柱・梁・壁・スラブ・基礎・階段・屋根）— 既定でON',
            en: '<strong>By member</strong> (columns, beams, walls, slabs, foundations, stairs, roofs) — On by default',
            zh: '<strong>按部位</strong>（柱、梁、墙、楼板、基础、楼梯、屋顶）— 默认开启'
        },
        'manual-formwork-step2-agg-item2': {
            ja: '<strong>工区別</strong> — 「工区」パラメータで分類（パラメータ名を指定）',
            en: '<strong>By work zone</strong> — Classified by a "work zone" parameter (specify parameter name)',
            zh: '<strong>按工区</strong> — 按"工区"参数分类（指定参数名）'
        },
        'manual-formwork-step2-agg-item3': {
            ja: '<strong>型枠種別</strong> — 「型枠種別」パラメータで分類（パラメータ名を指定）',
            en: '<strong>By formwork type</strong> — Classified by a "formwork type" parameter (specify parameter name)',
            zh: '<strong>按模板类型</strong> — 按"模板类型"参数分类（指定参数名）'
        },
        'manual-formwork-step2-output-title': {
            ja: '出力設定',
            en: 'Output Settings',
            zh: '输出设置'
        },
        'manual-formwork-step2-output-item1': {
            ja: '☑ <strong>Excel ファイルに出力</strong> — 部位別シート＋総括シートを含む .xlsx',
            en: '☑ <strong>Export to Excel</strong> — .xlsx with per-member sheets and a summary sheet',
            zh: '☑ <strong>导出到Excel</strong> — 包含按部位的工作表和汇总表的.xlsx'
        },
        'manual-formwork-step2-output-item2': {
            ja: '☑ <strong>Revit 集計ビューを作成</strong> — 階層グループ化された集計表',
            en: '☑ <strong>Create Revit schedule view</strong> — Hierarchically grouped schedule',
            zh: '☑ <strong>创建Revit明细表视图</strong> — 层级分组的明细表'
        },
        'manual-formwork-step2-output-item3': {
            ja: '☑ <strong>色分け 3D ビューを作成</strong> — 解析専用の3Dビュー「型枠分析」',
            en: '☑ <strong>Create color-coded 3D view</strong> — Analysis-dedicated 3D view "Formwork Analysis"',
            zh: '☑ <strong>创建彩色3D视图</strong> — 分析专用的3D视图"型枠分析"'
        },
        'manual-formwork-step2-output-item4': {
            ja: '☑ <strong>集計シートを自動作成</strong> — 3Dビュー＋集計表が配置されたシート',
            en: '☑ <strong>Auto-create summary sheet</strong> — A sheet with the 3D view and schedules laid out',
            zh: '☑ <strong>自动创建汇总图纸</strong> — 布置了3D视图和明细表的图纸'
        },
        'manual-formwork-step2-color-title': {
            ja: '色分け区分',
            en: 'Color Category',
            zh: '着色分类'
        },
        'manual-formwork-step2-color-desc': {
            ja: '3Dビューの色分けを「部位別」「工区別」「型枠種別」から選択します。',
            en: 'Choose the 3D view color coding from "by member", "by work zone", or "by formwork type".',
            zh: '从"按部位""按工区""按模板类型"中选择3D视图的着色方式。'
        },
        'manual-formwork-step2-option-title': {
            ja: 'オプション',
            en: 'Options',
            zh: '选项'
        },
        'manual-formwork-step2-option-item1': {
            ja: '☐ <strong>控除面も表示する</strong> — 接触面・天端面をグレー半透明で表示',
            en: '☐ <strong>Show deducted surfaces</strong> — Display contact and top surfaces in semi-transparent gray',
            zh: '☐ <strong>也显示扣除面</strong> — 接触面和顶面以灰色半透明显示'
        },
        'manual-formwork-step2-option-item2': {
            ja: '☐ <strong>GL 高さで地中部分を控除</strong> — GLより下の鉛直面・下向き面を控除（基礎の地中面など）',
            en: '☐ <strong>Deduct underground portions by GL height</strong> — Deduct vertical and downward-facing surfaces below GL (e.g., foundation underground surfaces)',
            zh: '☐ <strong>按GL高度扣除地下部分</strong> — 扣除GL以下的垂直面和向下面（如基础的地下面等）'
        },
        'manual-formwork-step3-title': {
            ja: '「実行」をクリック',
            en: 'Click "Execute"',
            zh: '点击"执行"'
        },
        'manual-formwork-step3-desc': {
            ja: '処理時間：要素数100〜500個で30秒〜2分程度。',
            en: 'Processing time: about 30 seconds to 2 minutes for 100–500 elements.',
            zh: '处理时间：100〜500个元素约30秒〜2分钟。'
        },
        'manual-formwork-step4-title': {
            ja: '結果を確認',
            en: 'Review results',
            zh: '查看结果'
        },
        'manual-formwork-step4-desc': {
            ja: '完了ダイアログに以下が表示されます。',
            en: 'The completion dialog displays the following:',
            zh: '完成对话框显示以下内容：'
        },
        'manual-formwork-step4-item1': {
            ja: '対象要素数 ／ 合計型枠面積 ／ 控除面積 ／ 傾斜面面積',
            en: 'Target element count / Total formwork area / Deducted area / Inclined surface area',
            zh: '目标元素数 / 总模板面积 / 扣除面积 / 倾斜面面积'
        },
        'manual-formwork-step4-item2': {
            ja: '自動除外件数（鉄骨・デッキスラブ・LGS壁等）',
            en: 'Auto-excluded count (steel, deck slabs, LGS walls, etc.)',
            zh: '自动排除数（钢构件、压型钢板楼板、LGS墙等）'
        },
        'manual-formwork-step4-item3': {
            ja: '出力されたシート名・Excel保存先',
            en: 'Output sheet names and Excel save location',
            zh: '输出的图纸名称和Excel保存位置'
        },
        'manual-formwork-usecase1-title': {
            ja: '概算見積もりの自動化',
            en: 'Automated rough estimation',
            zh: '概算估算自动化'
        },
        'manual-formwork-usecase1-desc': {
            ja: 'RC躯体モデルから型枠面積を瞬時に算出し、概算見積もりの作成時間を大幅に短縮します。',
            en: 'Instantly calculate formwork area from RC structural models, drastically reducing the time to prepare rough estimates.',
            zh: '从RC结构模型瞬间计算模板面积，大幅缩短概算估算的制作时间。'
        },
        'manual-formwork-usecase2-title': {
            ja: '工区別の数量管理',
            en: 'Quantity management by work zone',
            zh: '按工区的数量管理'
        },
        'manual-formwork-usecase2-desc': {
            ja: '工区パラメータで分類した集計を出力し、施工計画・進捗管理に活用できます。',
            en: 'Output aggregations classified by work zone parameter for use in construction planning and progress management.',
            zh: '输出按工区参数分类的汇总，可用于施工计划和进度管理。'
        },
        'manual-formwork-usecase3-title': {
            ja: '図書提出資料の作成',
            en: 'Preparing submittal documents',
            zh: '制作提交文件'
        },
        'manual-formwork-usecase3-desc': {
            ja: '色分け3Dビュー＋集計表のシートを自動作成し、提出図書をそのまま出力できます。',
            en: 'Auto-create a sheet with color-coded 3D view and schedules, ready to deliver as submittal documents.',
            zh: '自动创建彩色3D视图+明细表的图纸，可直接作为提交文件输出。'
        },
        'manual-formwork-tip1': {
            ja: '<strong data-lang-key="manual-formwork-tip1-strong">対象を絞り込むなら3Dビュー：</strong>セクションボックスで対象範囲のみを表示した3Dビューを開き、「現在のビューに表示されている要素」を選択すると処理が高速化されます。',
            en: '<strong data-lang-key="manual-formwork-tip1-strong">Use a 3D view to narrow the target:</strong> Open a 3D view with a section box showing only the target range, then choose "Elements visible in the current view" for faster processing.',
            zh: '<strong data-lang-key="manual-formwork-tip1-strong">缩小目标范围用3D视图：</strong>打开使用剖面框仅显示目标范围的3D视图，选择"当前视图中可见的元素"可加速处理。'
        },
        'manual-formwork-tip1-strong': {
            ja: '対象を絞り込むなら3Dビュー：',
            en: 'Use a 3D view to narrow the target:',
            zh: '缩小目标范围用3D视图：'
        },
        'manual-formwork-tip2': {
            ja: '<strong data-lang-key="manual-formwork-tip2-strong">サマリ集計表は動的：</strong>「型枠数量集計_合計」表はDirectShapeの追加・削除に動的追従し、要素を削除すると合計が自動再計算されます。',
            en: '<strong data-lang-key="manual-formwork-tip2-strong">Summary schedule is dynamic:</strong> The "Formwork Quantity Summary_Total" schedule dynamically tracks DirectShape additions/deletions; totals are automatically recalculated when elements are removed.',
            zh: '<strong data-lang-key="manual-formwork-tip2-strong">汇总明细表是动态的：</strong>"型枠数量集計_合計"表会动态跟踪DirectShape的添加和删除，删除元素时合计自动重新计算。'
        },
        'manual-formwork-tip2-strong': {
            ja: 'サマリ集計表は動的：',
            en: 'Summary schedule is dynamic:',
            zh: '汇总明细表是动态的：'
        },
        'manual-formwork-tip3': {
            ja: '<strong data-lang-key="manual-formwork-tip3-strong">控除面の可視化：</strong>オプション「控除面も表示する」をONにすると、接触面・天端面がグレー半透明で表示され、算出ロジックの確認に便利です。',
            en: '<strong data-lang-key="manual-formwork-tip3-strong">Visualize deducted surfaces:</strong> Turning on the "Show deducted surfaces" option displays contact surfaces and top surfaces as semi-transparent gray, useful for verifying the calculation logic.',
            zh: '<strong data-lang-key="manual-formwork-tip3-strong">可视化扣除面：</strong>打开"也显示扣除面"选项，接触面和顶面会以灰色半透明显示，便于确认计算逻辑。'
        },
        'manual-formwork-tip3-strong': {
            ja: '控除面の可視化：',
            en: 'Visualize deducted surfaces:',
            zh: '可视化扣除面：'
        },
        'manual-formwork-tip4': {
            ja: '<strong data-lang-key="manual-formwork-tip4-strong">再計算は再実行で：</strong>ボタンを再実行すると既存の「型枠分析」ビュー・集計表が上書きされます。視点はその時点でアクティブな3Dビューが引き継がれます。',
            en: '<strong data-lang-key="manual-formwork-tip4-strong">Re-run to recalculate:</strong> Re-running the button overwrites the existing "Formwork Analysis" view and schedules. The viewpoint inherits the active 3D view at that time.',
            zh: '<strong data-lang-key="manual-formwork-tip4-strong">重新计算就重新执行：</strong>重新执行按钮会覆盖现有的"型枠分析"视图和明细表。视点继承此时激活的3D视图。'
        },
        'manual-formwork-tip4-strong': {
            ja: '再計算は再実行で：',
            en: 'Re-run to recalculate:',
            zh: '重新计算就重新执行：'
        },
        'manual-formwork-note1': {
            ja: 'シートビューでは実行できません。3Dビュー（推奨）または平面・断面ビューに切り替えてから実行してください。',
            en: 'Cannot be executed on sheet views. Switch to a 3D view (recommended) or a plan/section view first.',
            zh: '无法在图纸视图中执行。请先切换到3D视图（推荐）或平面/剖面视图。'
        },
        'manual-formwork-note2': {
            ja: '鉄骨柱が除外されない場合は、ファミリの構造材料が「鋼」または「金属」になっているか、ファミリ名・タイプ名に「H-」「BH-」「鉄骨」等のキーワードが含まれているかを確認してください。',
            en: 'If steel columns are not excluded, check that the family\'s structural material is "Steel" or "Metal", or that the family/type name contains keywords like "H-", "BH-", or "鉄骨".',
            zh: '如果钢柱未被排除，请检查族的结构材料是否为"鋼"或"金属"，或族名/类型名是否包含"H-"、"BH-"、"鉄骨"等关键字。'
        },
        'manual-formwork-note3': {
            ja: 'RC壁が誤ってLGS壁として除外される場合は、壁構造の各層のマテリアルに「Concrete」または「コンクリート」が含まれているかを確認してください。',
            en: 'If an RC wall is incorrectly excluded as an LGS wall, check that each wall structure layer\'s material includes "Concrete" or "コンクリート".',
            zh: '如果RC墙被错误排除为LGS墙，请检查墙结构各层的材质是否包含"Concrete"或"コンクリート"。'
        },
        'manual-formwork-note4': {
            ja: '処理が遅い場合は計算範囲を「現在のビュー」に絞るか、セクションボックスで対象範囲を限定してください。',
            en: 'If processing is slow, narrow the calculation scope to "Current view" or limit the target range using a section box.',
            zh: '处理较慢时，请将计算范围缩小为"当前视图"，或使用剖面框限定目标范围。'
        },
        'manual-formwork-deliv1-title': {
            ja: '解析3Dビュー「型枠分析」',
            en: 'Analysis 3D View "Formwork Analysis"',
            zh: '分析3D视图"型枠分析"'
        },
        'manual-formwork-deliv1-item1': {
            ja: '型枠が必要な面が<strong>色付きの薄板オブジェクト</strong>として配置される',
            en: 'Formwork-required surfaces are placed as <strong>colored thin-plate objects</strong>',
            zh: '需要模板的面作为<strong>彩色薄板对象</strong>放置'
        },
        'manual-formwork-deliv1-item2': {
            ja: '部位別の配色：柱＝青／梁＝緑／壁＝橙／スラブ＝黄／基礎＝紫／階段＝水／屋根＝ピンク赤',
            en: 'Color scheme by member: columns=blue / beams=green / walls=orange / slabs=yellow / foundations=purple / stairs=cyan / roofs=pinkish-red',
            zh: '按部位配色：柱=蓝/梁=绿/墙=橙/楼板=黄/基础=紫/楼梯=水蓝/屋顶=粉红'
        },
        'manual-formwork-deliv1-item3': {
            ja: '視点はボタン実行時のアクティブ3Dビューを継承',
            en: 'The viewpoint inherits the active 3D view at the time of button execution',
            zh: '视点继承按钮执行时激活的3D视图'
        },
        'manual-formwork-deliv2-title': {
            ja: '集計表「型枠数量集計」',
            en: 'Schedule "Formwork Quantity Summary"',
            zh: '明细表"型枠数量集計"'
        },
        'manual-formwork-deliv2-item1': {
            ja: '<strong>レベル → 部位 → タイプ名</strong>の階層でグループ化',
            en: 'Grouped hierarchically by <strong>Level → Member → Type name</strong>',
            zh: '按<strong>层级 → 部位 → 类型名</strong>的层级分组'
        },
        'manual-formwork-deliv2-item2': {
            ja: '列：件数 ／ レベル ／ 部位 ／ 区分 ／ 型枠面積',
            en: 'Columns: Count / Level / Member / Category / Formwork area',
            zh: '列：件数 / 层级 / 部位 / 区分 / 模板面积'
        },
        'manual-formwork-deliv2-item3': {
            ja: '列幅は内容に応じて自動調整',
            en: 'Column widths auto-adjusted based on content',
            zh: '列宽根据内容自动调整'
        },
        'manual-formwork-deliv3-title': {
            ja: 'サマリ集計表「型枠数量集計_合計」',
            en: 'Summary Schedule "Formwork Quantity Summary_Total"',
            zh: '汇总明细表"型枠数量集計_合計"'
        },
        'manual-formwork-deliv3-item1': {
            ja: '全件の合計値のみを表示する1行集計表',
            en: 'A single-row schedule showing only the total values',
            zh: '仅显示全部合计值的单行明细表'
        },
        'manual-formwork-deliv3-item2': {
            ja: '列ヘッダーを赤字・太字・薄黄背景でスタイリング',
            en: 'Column headers styled in red bold text with pale yellow background',
            zh: '列标题以红色粗体、浅黄背景设计'
        },
        'manual-formwork-deliv3-item3': {
            ja: 'DirectShape の追加・削除に動的追従（要素を削除すると合計が自動再計算）',
            en: 'Dynamically tracks DirectShape additions/deletions (totals auto-recalculated when elements are removed)',
            zh: '动态跟随DirectShape的添加和删除（删除元素时合计自动重新计算）'
        },
        'manual-formwork-deliv4-title': {
            ja: 'シート（オプション）',
            en: 'Sheet (optional)',
            zh: '图纸（可选）'
        },
        'manual-formwork-deliv4-item1': {
            ja: '解析3Dビューとメイン集計表・サマリ集計表が自動レイアウトされたA1シート',
            en: 'An A1 sheet with the analysis 3D view and the main/summary schedules auto-laid out',
            zh: '自动布置了分析3D视图、主明细表、汇总明细表的A1图纸'
        },
        'manual-formwork-deliv5-title': {
            ja: 'Excel ファイル（オプション）',
            en: 'Excel File (optional)',
            zh: 'Excel文件（可选）'
        },
        'manual-formwork-deliv5-item1': {
            ja: '部位別シート＋全件総括シート',
            en: 'Per-member sheets + a full summary sheet',
            zh: '按部位的工作表+全部汇总表'
        },
        'manual-formwork-deliv5-item2': {
            ja: 'ヘッダー色付け、オートフィルタ自動設定',
            en: 'Colored headers, auto-filter automatically configured',
            zh: '标题着色，自动设置筛选'
        },
        'manual-formwork-logic1-title': {
            ja: '型枠が必要と判定される面',
            en: 'Surfaces determined to require formwork',
            zh: '被判定为需要模板的面'
        },
        'manual-formwork-logic1-item1': {
            ja: '鉛直面・斜面',
            en: 'Vertical and inclined surfaces',
            zh: '垂直面、斜面'
        },
        'manual-formwork-logic1-item2': {
            ja: '梁・柱・階段の底面',
            en: 'Bottom surfaces of beams, columns, and stairs',
            zh: '梁、柱、楼梯的底面'
        },
        'manual-formwork-logic1-item3': {
            ja: '開口部の内側面（縁面の加算）',
            en: 'Inner surfaces of openings (edge surfaces added)',
            zh: '开口的内侧面（边缘面加算）'
        },
        'manual-formwork-logic2-title': {
            ja: '型枠不要として控除される面',
            en: 'Surfaces deducted as not requiring formwork',
            zh: '作为不需要模板而扣除的面'
        },
        'manual-formwork-logic2-item1': {
            ja: '<strong>床・壁・基礎・屋根の天端</strong> — コンクリート打設時に開放される面',
            en: '<strong>Top surfaces of floors, walls, foundations, and roofs</strong> — Surfaces open during concrete placement',
            zh: '<strong>楼板、墙、基础、屋顶的顶面</strong> — 浇筑混凝土时开放的面'
        },
        'manual-formwork-logic2-item1a': {
            ja: '屋根は勾配付き上向き面（傾斜＞約5°）も自動的に天端扱い',
            en: 'For roofs, sloped upward-facing surfaces (slope > ~5°) are also automatically treated as tops',
            zh: '屋顶的带坡度向上面（坡度>约5°）也自动作为顶面处理'
        },
        'manual-formwork-logic2-item1b': {
            ja: '壁の斜めの天端は<strong>水平射影の幅が30mm以上</strong>なら天端扱い（小さな面取りは型枠必要）',
            en: 'Slanted wall tops are treated as tops when <strong>their horizontal projection width is 30mm or more</strong> (small chamfers require formwork)',
            zh: '墙的斜顶面在<strong>水平投影宽度30mm以上</strong>时作为顶面处理（小倒角需要模板）'
        },
        'manual-formwork-logic2-item2': {
            ja: '<strong>他要素との接触面</strong> — 接触部分のみ控除（完全接触・部分接触の両方に対応）',
            en: '<strong>Contact surfaces with other elements</strong> — Only contact portions are deducted (supports both full and partial contact)',
            zh: '<strong>与其他元素的接触面</strong> — 仅扣除接触部分（支持完全接触和部分接触）'
        },
        'manual-formwork-logic2-item3': {
            ja: '<strong>GL高さ以下の地中部分</strong>（オプションON時）',
            en: '<strong>Underground portions below GL height</strong> (when option is ON)',
            zh: '<strong>GL高度以下的地下部分</strong>（选项开启时）'
        },
        'manual-formwork-logic2-item4': {
            ja: '<strong>開口部の控除</strong>（窓・ドア・床開口等の面積を自動控除）',
            en: '<strong>Opening deductions</strong> (window, door, floor opening areas auto-deducted)',
            zh: '<strong>开口的扣除</strong>（窗、门、楼板开口等面积自动扣除）'
        },
        'manual-formwork-faq1-q': {
            ja: 'Q. 鉄骨柱が型枠必要として残ってしまう',
            en: 'Q. Steel columns remain as formwork-required',
            zh: 'Q. 钢柱仍作为需要模板保留'
        },
        'manual-formwork-faq1-a': {
            ja: 'A. ファミリの構造材料が「鋼」または「金属」になっているか確認してください。それでも検出されない場合、ファミリ名・タイプ名に「H-」「BH-」「鉄骨」等のキーワードを含めると4層目の名前判定で除外されます。',
            en: 'A. Verify that the family\'s structural material is "Steel" or "Metal". If still not detected, including keywords like "H-", "BH-", or "鉄骨" in the family/type name will exclude it via the 4th-layer name detection.',
            zh: 'A. 请确认族的结构材料是否为"鋼"或"金属"。如果仍未检测到，在族名/类型名中包含"H-"、"BH-"、"鉄骨"等关键字会在第4层名称判定中排除。'
        },
        'manual-formwork-faq2-q': {
            ja: 'Q. RC壁が誤ってLGS壁として除外される',
            en: 'Q. An RC wall is incorrectly excluded as an LGS wall',
            zh: 'Q. RC墙被错误排除为LGS墙'
        },
        'manual-formwork-faq2-a': {
            ja: 'A. 壁構造の各層のマテリアルに「Concrete」または「コンクリート」が含まれているか確認してください。コンクリート層が認識されれば、石膏ボード仕上げが付いていてもRC壁として算出対象になります。',
            en: 'A. Verify that the wall structure layer materials include "Concrete" or "コンクリート". Once a concrete layer is recognized, the wall will be subject to calculation as an RC wall even with gypsum board finishes.',
            zh: 'A. 请确认墙结构各层的材质是否包含"Concrete"或"コンクリート"。一旦识别到混凝土层，即使有石膏板饰面也会作为RC墙参与计算。'
        },
        'manual-formwork-faq3-q': {
            ja: 'Q. 集計表の列幅が大きすぎる／値が改行される',
            en: 'Q. Schedule column widths are too large / values wrap',
            zh: 'Q. 明细表列宽过大/值换行'
        },
        'manual-formwork-faq3-a': {
            ja: 'A. 列幅は実セル内容の最大文字数から自動計算されます。それでも問題がある場合は集計表プロパティで手動調整してください。',
            en: 'A. Column widths are auto-calculated from the maximum character count of actual cell contents. If issues remain, adjust manually in the schedule properties.',
            zh: 'A. 列宽根据实际单元格内容的最大字符数自动计算。如仍有问题，请在明细表属性中手动调整。'
        },
        'manual-formwork-faq4-q': {
            ja: 'Q. 結果を再計算したい',
            en: 'Q. I want to recalculate results',
            zh: 'Q. 想要重新计算结果'
        },
        'manual-formwork-faq4-a': {
            ja: 'A. ボタンを再実行してください。既存の「型枠分析」ビュー・集計表は上書きされます。視点はその時点でアクティブな3Dビューが引き継がれます。',
            en: 'A. Re-run the button. The existing "Formwork Analysis" view and schedules will be overwritten. The viewpoint inherits the active 3D view at that time.',
            zh: 'A. 请重新执行按钮。现有的"型枠分析"视图和明细表将被覆盖。视点继承此时激活的3D视图。'
        },
        'manual-formwork-trouble1-sym': {
            ja: '「対象要素が見つかりませんでした」',
            en: '"No target elements were found"',
            zh: '"未找到目标元素"'
        },
        'manual-formwork-trouble1-act': {
            ja: '計算範囲を「プロジェクト全体」に切り替える、または3Dビューに対象要素を表示させる',
            en: 'Switch the calculation scope to "Entire project", or make the target elements visible in the 3D view',
            zh: '将计算范围切换为"整个项目"，或在3D视图中显示目标元素'
        },
        'manual-formwork-trouble2-sym': {
            ja: '鉄骨が除外されない／RCが除外される',
            en: 'Steel is not excluded / RC is excluded',
            zh: '钢未被排除/RC被排除'
        },
        'manual-formwork-trouble2-act': {
            ja: 'デバッグログ <code>C:\\temp\\Formwork_debug.txt</code> で <code>[SteelDetect]</code> <code>[LgsExclude]</code> 行を確認し、誤判定の根拠を特定',
            en: 'Check <code>[SteelDetect]</code> and <code>[LgsExclude]</code> lines in the debug log <code>C:\\temp\\Formwork_debug.txt</code> to identify the cause of misjudgment',
            zh: '在调试日志 <code>C:\\temp\\Formwork_debug.txt</code> 中查看 <code>[SteelDetect]</code>、<code>[LgsExclude]</code> 行，找出误判依据'
        },
        'manual-formwork-trouble3-sym': {
            ja: '処理が遅い',
            en: 'Processing is slow',
            zh: '处理较慢'
        },
        'manual-formwork-trouble3-act': {
            ja: '計算範囲を「現在のビュー」に絞る／セクションボックスで対象範囲を限定する',
            en: 'Narrow the calculation scope to "Current view" / limit the target range using a section box',
            zh: '将计算范围缩小为"当前视图"/使用剖面框限定目标范围'
        },
        'manual-formwork-trouble4-sym': {
            ja: 'エラーで止まる',
            en: 'Stops with an error',
            zh: '因错误停止'
        },
        'manual-formwork-trouble4-act': {
            ja: '完了ダイアログの「エラー・注記」件数を確認し、デバッグログでエラー要素IDを特定',
            en: 'Check the "Errors & Notes" count in the completion dialog and identify the error element ID in the debug log',
            zh: '检查完成对话框中的"错误·注记"数量，并在调试日志中找出错误元素ID'
        },
        'manual-formwork-link1-label': {
            ja: 'マニュアル一覧：',
            en: 'Manual list: ',
            zh: '手册列表：'
        },
        'manual-formwork-link2-label': {
            ja: 'リリース・最新版：',
            en: 'Releases / latest version: ',
            zh: '发布/最新版本：'
        },
        'manual-formwork-view-row1-type': {
            ja: '3Dビュー',
            en: '3D View',
            zh: '3D视图'
        },
        'manual-formwork-view-row1-status': {
            ja: '✅ 推奨',
            en: '✅ Recommended',
            zh: '✅ 推荐'
        },
        'manual-formwork-view-row1-note': {
            ja: '「現在のビューに表示されている要素」モードで使用する場合は3Dビューが必須',
            en: 'A 3D view is required when using the "Elements visible in the current view" mode',
            zh: '使用"当前视图中可见的元素"模式时必须为3D视图'
        },
        'manual-formwork-view-row2-type': {
            ja: '平面ビュー・断面ビュー',
            en: 'Plan / Section View',
            zh: '平面视图、剖面视图'
        },
        'manual-formwork-view-row2-status': {
            ja: '⚠️ 可',
            en: '⚠️ Allowed',
            zh: '⚠️ 可'
        },
        'manual-formwork-view-row2-note': {
            ja: '「プロジェクト全体」モードでのみ実行可能',
            en: 'Can only be executed in "Entire project" mode',
            zh: '仅能在"整个项目"模式下执行'
        },
        'manual-formwork-view-row3-type': {
            ja: 'シートビュー',
            en: 'Sheet View',
            zh: '图纸视图'
        },
        'manual-formwork-view-row3-status': {
            ja: '❌ 不可',
            en: '❌ Not allowed',
            zh: '❌ 不可'
        },
        'manual-formwork-view-row3-note': {
            ja: 'アクティブビューを3Dビューに切り替えてから実行してください',
            en: 'Switch the active view to a 3D view before executing',
            zh: '请将活动视图切换为3D视图后再执行'
        },
        'manual-formwork-cat-col': {
            ja: '柱',
            en: 'Column',
            zh: '柱'
        },
        'manual-formwork-cat-col-revit': {
            ja: '構造柱',
            en: 'Structural Columns',
            zh: '结构柱'
        },
        'manual-formwork-cat-beam': {
            ja: '梁',
            en: 'Beam',
            zh: '梁'
        },
        'manual-formwork-cat-beam-revit': {
            ja: '構造フレーム',
            en: 'Structural Framing',
            zh: '结构框架'
        },
        'manual-formwork-cat-wall': {
            ja: '壁',
            en: 'Wall',
            zh: '墙'
        },
        'manual-formwork-cat-wall-revit': {
            ja: '壁',
            en: 'Walls',
            zh: '墙'
        },
        'manual-formwork-cat-floor': {
            ja: '床',
            en: 'Floor',
            zh: '楼板'
        },
        'manual-formwork-cat-floor-revit': {
            ja: '床',
            en: 'Floors',
            zh: '楼板'
        },
        'manual-formwork-cat-foundation': {
            ja: '基礎',
            en: 'Foundation',
            zh: '基础'
        },
        'manual-formwork-cat-foundation-revit': {
            ja: '構造基礎',
            en: 'Structural Foundations',
            zh: '结构基础'
        },
        'manual-formwork-cat-stair': {
            ja: '階段',
            en: 'Stair',
            zh: '楼梯'
        },
        'manual-formwork-cat-stair-revit': {
            ja: '階段',
            en: 'Stairs',
            zh: '楼梯'
        },
        'manual-formwork-cat-roof': {
            ja: '屋根',
            en: 'Roof',
            zh: '屋顶'
        },
        'manual-formwork-cat-roof-revit': {
            ja: '屋根',
            en: 'Roofs',
            zh: '屋顶'
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
        },
        'footer-share': {
            ja: 'このページをシェア：',
            en: 'Share this page:',
            zh: '分享此页：'
        }
    };

    // ========================================
    // ハッチングパターン作成ページ翻訳
    // ========================================
    translations.hatchPage = {
        'hatch-breadcrumb': {
            ja: '塗潰し（ハッチング）パターン自動作成',
            en: 'Hatch Pattern Generator',
            zh: '填充图案自动生成'
        },
        'pdf-compare-breadcrumb': {
            ja: 'PDF 比較ツール',
            en: 'PDF Compare Tool',
            zh: 'PDF比较工具'
        },
        'pdf-compare-page-title': {
            ja: 'PDF 比較ツール',
            en: 'PDF Compare Tool',
            zh: 'PDF比较工具'
        },
        'pdf-compare-page-desc': {
            ja: '2つのPDFを重ねて差分をカラー表示 — すべてブラウザ内で処理（サーバー送信なし）',
            en: 'Overlay two PDFs and highlight differences in color — all processing done in browser (no server upload)',
            zh: '叠加两个PDF并以彩色显示差异 — 所有处理均在浏览器中完成（无需上传服务器）'
        },
        'pdf-compare-source-label': {
            ja: '比較元 PDF（青色で表示）',
            en: 'Source PDF (shown in blue)',
            zh: '比较源PDF（蓝色显示）'
        },
        'pdf-compare-target-label': {
            ja: '比較先 PDF（赤色で表示）',
            en: 'Target PDF (shown in red)',
            zh: '比较目标PDF（红色显示）'
        },
        'pdf-compare-click-or-drop': {
            ja: 'クリックまたはドロップ',
            en: 'Click or drop',
            zh: '点击或拖放'
        },
        'pdf-compare-old-version': {
            ja: '旧バージョン',
            en: 'Old version',
            zh: '旧版本'
        },
        'pdf-compare-new-version': {
            ja: '新バージョン',
            en: 'New version',
            zh: '新版本'
        },
        'pdf-compare-opacity': {
            ja: '差分の不透明度',
            en: 'Diff opacity',
            zh: '差异不透明度'
        },
        'pdf-compare-run': {
            ja: '比較実行',
            en: 'Compare',
            zh: '执行比较'
        },
        'pdf-compare-download': {
            ja: '📥 全ページPDF保存',
            en: '📥 Save all pages as PDF',
            zh: '📥 保存全部页面为PDF'
        },
        'pdf-compare-status-select': {
            ja: 'PDFを2つ選択してください',
            en: 'Please select two PDFs',
            zh: '请选择两个PDF'
        },
        'pdf-compare-page-nav': {
            ja: 'ページ',
            en: 'Page',
            zh: '页面'
        },
        'pdf-compare-has-diff': {
            ja: '差分あり',
            en: 'Has differences',
            zh: '有差异'
        },
        'pdf-compare-no-diff': {
            ja: '差分なし',
            en: 'No differences',
            zh: '无差异'
        },
        'pdf-compare-preview': {
            ja: '差分プレビュー',
            en: 'Diff Preview',
            zh: '差异预览'
        },
        'pdf-compare-legend': {
            ja: '凡例',
            en: 'Legend',
            zh: '图例'
        },
        'pdf-compare-legend-source': {
            ja: '比較元のみ<br>（旧・削除）',
            en: 'Source only<br>(Old / Removed)',
            zh: '仅比较源<br>（旧/删除）'
        },
        'pdf-compare-legend-target': {
            ja: '比較先のみ<br>（新・追加）',
            en: 'Target only<br>(New / Added)',
            zh: '仅比较目标<br>（新/添加）'
        },
        'pdf-compare-legend-common': {
            ja: '共通部分<br>（変更なし）',
            en: 'Common<br>(No change)',
            zh: '共同部分<br>（无变更）'
        },
        'pdf-compare-legend-bg': {
            ja: '背景（白）',
            en: 'Background (white)',
            zh: '背景（白色）'
        },
        'pdf-compare-stats': {
            ja: '差分統計',
            en: 'Diff Statistics',
            zh: '差异统计'
        },
        'pdf-compare-change-rate': {
            ja: '% 変更率',
            en: '% change rate',
            zh: '% 变更率'
        },
        'hatch-page-title': {
            ja: '塗潰し（ハッチング）パターン自動作成',
            en: 'Hatch Pattern Generator',
            zh: '填充图案自动生成'
        },
        'hatch-page-description': {
            ja: 'Revit / AutoCAD用のハッチングパターンファイル（.pat）を作成できます。',
            en: 'Create hatch pattern files (.pat) for Revit / AutoCAD.',
            zh: '创建用于Revit / AutoCAD的填充图案文件（.pat）。'
        },
        'hatch-pattern-name': {
            ja: 'パターン名',
            en: 'Pattern Name',
            zh: '图案名称'
        },
        'hatch-pattern-type': {
            ja: 'パターン種類',
            en: 'Pattern Type',
            zh: '图案类型'
        },
        'hatch-type-diagonal': {
            ja: '斜線',
            en: 'Diagonal',
            zh: '斜线'
        },
        'hatch-type-crosshatch': {
            ja: '網掛け',
            en: 'Crosshatch',
            zh: '网格线'
        },
        'hatch-type-dot': {
            ja: 'ドット',
            en: 'Dot',
            zh: '点'
        },
        'hatch-type-tile-grid': {
            ja: '芋目地',
            en: 'Grid',
            zh: '网格'
        },
        'hatch-type-tile-brick': {
            ja: '馬目地',
            en: 'Brick',
            zh: '砖砌'
        },
        'hatch-type-rc': {
            ja: 'RC',
            en: 'RC',
            zh: 'RC'
        },
        'hatch-angle': {
            ja: '角度 (°)',
            en: 'Angle (°)',
            zh: '角度 (°)'
        },
        'hatch-spacing': {
            ja: '間隔 (mm)',
            en: 'Spacing (mm)',
            zh: '间距 (mm)'
        },
        'hatch-dash-type': {
            ja: '破線設定',
            en: 'Line Style',
            zh: '线型设置'
        },
        'hatch-dash-solid': {
            ja: '実線',
            en: 'Solid',
            zh: '实线'
        },
        'hatch-dash-alternate': {
            ja: '一本おき',
            en: 'Alternate',
            zh: '交替'
        },
        'hatch-dash-all': {
            ja: '全て破線',
            en: 'All Dashed',
            zh: '全部虚线'
        },
        'hatch-dash-length': {
            ja: '破線長さ (mm)',
            en: 'Dash Length (mm)',
            zh: '虚线长度 (mm)'
        },
        'hatch-dash-gap': {
            ja: '破線間隔 (mm)',
            en: 'Dash Gap (mm)',
            zh: '虚线间隔 (mm)'
        },
        'hatch-x-spacing': {
            ja: 'X間隔 (mm)',
            en: 'X Spacing (mm)',
            zh: 'X间距 (mm)'
        },
        'hatch-y-spacing': {
            ja: 'Y間隔 (mm)',
            en: 'Y Spacing (mm)',
            zh: 'Y间距 (mm)'
        },
        'hatch-size': {
            ja: 'サイズ (mm)',
            en: 'Size (mm)',
            zh: '尺寸 (mm)'
        },
        'hatch-width': {
            ja: '幅 (mm)',
            en: 'Width (mm)',
            zh: '宽度 (mm)'
        },
        'hatch-height': {
            ja: '高さ (mm)',
            en: 'Height (mm)',
            zh: '高度 (mm)'
        },
        'hatch-grout-enabled': {
            ja: '目地あり',
            en: 'With Grout',
            zh: '有接缝'
        },
        'hatch-grout-size': {
            ja: '目地サイズ (mm)',
            en: 'Grout Size (mm)',
            zh: '接缝尺寸 (mm)'
        },
        'hatch-offset-note': {
            ja: '※ ずらし量は1/2固定',
            en: '* Offset is fixed at 1/2',
            zh: '※ 偏移量固定为1/2'
        },
        'hatch-inner-spacing': {
            ja: '線内間隔 (mm)',
            en: 'Inner Spacing (mm)',
            zh: '线内间距 (mm)'
        },
        'hatch-group-spacing': {
            ja: 'グループ間隔 (mm)',
            en: 'Group Spacing (mm)',
            zh: '组间距 (mm)'
        },
        'hatch-output-format': {
            ja: '出力形式',
            en: 'Output Format',
            zh: '输出格式'
        },
        'hatch-unit': {
            ja: '単位',
            en: 'Unit',
            zh: '单位'
        },
        'hatch-revit-pattern-type': {
            ja: 'パターンタイプ',
            en: 'Pattern Type',
            zh: '图案类型'
        },
        'hatch-revit-model': {
            ja: 'モデル',
            en: 'Model',
            zh: '模型'
        },
        'hatch-revit-drafting': {
            ja: '製図',
            en: 'Drafting',
            zh: '制图'
        },
        'hatch-revit-note': {
            ja: 'モデル: 実寸で表示 / 製図: 図面スケールに依存',
            en: 'Model: Actual size / Drafting: Scale dependent',
            zh: '模型: 实际尺寸 / 制图: 取决于比例'
        },
        'hatch-download-btn': {
            ja: 'パターンファイルをダウンロード',
            en: 'Download Pattern File',
            zh: '下载图案文件'
        },
        'hatch-preview-title': {
            ja: 'プレビュー',
            en: 'Preview',
            zh: '预览'
        },
        'hatch-preview-info': {
            ja: 'パターンをプレビュー中...',
            en: 'Previewing pattern...',
            zh: '预览图案中...'
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
            ja: '現在、以下の14のツールを提供しています：',
            en: 'Currently, we provide the following 14 tools:',
            zh: '目前，我们提供以下14个工具：'
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
            ja: '3D視点コピペ - 3Dビューの視点を他のビューに反映',
            en: '3D View Copy & Paste - Copy and paste 3D view orientation to other views',
            zh: '3D视点复制粘贴 - 将3D视图视角复制并粘贴到其他视图'
        },
        'about-tool4': {
            ja: '切断ボックスコピペ - 3Dビューの切断ボックス範囲を反映',
            en: 'Section Box Copy & Paste - Copy and paste 3D view section box range',
            zh: '剖切框复制粘贴 - 复制并粘贴剖切框范围'
        },
        'about-tool5': {
            ja: 'ビューポート位置コピペ - シート上のビューポート位置を反映',
            en: 'Viewport Position Copy & Paste - Copy and paste viewport positions on sheets',
            zh: '视口位置复制粘贴 - 复制并粘贴视口位置'
        },
        'about-tool6': {
            ja: 'トリミング領域コピペ - ビューのトリミング領域を反映',
            en: 'Crop Region Copy & Paste - Copy and paste view crop regions',
            zh: '裁剪区域复制粘贴 - 复制并粘贴裁剪区域'
        },
        'about-tool7': {
            ja: '部屋タグ自動配置 - ビューポートの部屋情報からタグを一括自動配置',
            en: 'Room Tag Auto Placement - Auto-place room tags from viewport room data',
            zh: '房间标签自动放置 - 从视口房间信息自动批量放置标签'
        },
        'about-tool8': {
            ja: '梁下端色分け - 梁の下端レベルを自動計算しパステルカラーで色分け',
            en: 'Beam Bottom Level Coloring - Auto-calculate beam bottom levels and color-code with pastels',
            zh: '梁底标高着色 - 自动计算梁底标高并用柔和颜色着色'
        },
        'about-tool9': {
            ja: '梁天端色分け - 梁の天端レベルをパステルカラーで色分け表示',
            en: 'Beam Top Level Coloring - Color-code beam top levels with pastel colors',
            zh: '梁顶标高着色 - 用柔和颜色显示梁顶标高着色'
        },
        'about-tool10': {
            ja: 'Excelエクスポート - 要素パラメータをカテゴリ別にExcelへ書き出し',
            en: 'Excel Export - Export element parameters to Excel by category',
            zh: 'Excel导出 - 按类别将元素参数导出到Excel'
        },
        'about-tool11': {
            ja: 'Excelインポート - Excelの編集内容をRevitモデルに書き戻し',
            en: 'Excel Import - Import Excel edits back into Revit model',
            zh: 'Excel导入 - 将Excel编辑内容写回Revit模型'
        },
        'about-tool12': {
            ja: '塗潰し領域 分割・統合 - 塗り潰し領域を個別に分割または1つに統合',
            en: 'Filled Region Split & Merge - Split or merge filled regions',
            zh: '填充区域 分割与合并 - 将填充区域分割或合并'
        },
        'about-tool13': {
            ja: '耐火被覆色分け - 梁・柱の耐火被覆を種類別に色分けし凡例も自動作成',
            en: 'Fire Protection Coloring - Color-code beam/column fire protection by type with auto-generated legend',
            zh: '防火覆盖着色 - 按类型为梁柱防火覆盖着色并自动生成图例'
        },
        'about-tool14': {
            ja: '型枠数量算出 - RC躯体から型枠面積を自動算出しExcel・集計表・3Dビューに出力',
            en: 'Formwork Quantity Calculation - Auto-calculate formwork area from RC structures, output to Excel/schedules/3D views',
            zh: '模板数量计算 - 从RC结构自动计算模板面积并输出到Excel、明细表和3D视图'
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

    // BIM業界ニュースページ
    translations.newsPage = {
        'news-breadcrumb': {
            ja: 'BIM業界ニュース',
            en: 'BIM Industry News',
            zh: 'BIM行业新闻'
        },
        'news-title': {
            ja: 'BIM業界ニュース',
            en: 'BIM Industry News',
            zh: 'BIM行业新闻'
        },
        'news-subtitle': {
            ja: '最新のBIM・Revit・建築業界情報',
            en: 'Latest BIM, Revit & Architecture News',
            zh: '最新的BIM、Revit和建筑行业信息'
        },
        'news-update-label': {
            ja: '最終更新:',
            en: 'Last Updated:',
            zh: '最后更新:'
        },
        'news-update-note': {
            ja: '（毎日自動更新）',
            en: '(Auto-updated daily)',
            zh: '（每天自动更新）'
        },
        'news-filter-all': {
            ja: 'すべて',
            en: 'All',
            zh: '全部'
        },
        'news-filter-bim': {
            ja: 'BIM全般',
            en: 'BIM General',
            zh: 'BIM综合'
        },
        'news-filter-revit': {
            ja: 'Revit',
            en: 'Revit',
            zh: 'Revit'
        },
        'news-filter-software': {
            ja: 'ソフトウェア',
            en: 'Software',
            zh: '软件'
        },
        'news-filter-architecture': {
            ja: '建築・設計',
            en: 'Architecture',
            zh: '建筑设计'
        },
        'news-loading': {
            ja: 'ニュースを読み込み中...',
            en: 'Loading news...',
            zh: '正在加载新闻...'
        },
        'news-error': {
            ja: 'ニュースの読み込みに失敗しました。しばらくしてから再度お試しください。',
            en: 'Failed to load news. Please try again later.',
            zh: '新闻加载失败。请稍后再试。'
        },
        'news-empty': {
            ja: '該当するニュースがありません。',
            en: 'No news found.',
            zh: '未找到相关新闻。'
        }
    };

    // AIニュースページ
    translations.aiNewsPage = {
        'ai-news-breadcrumb': {
            ja: 'AIニュース',
            en: 'AI News',
            zh: 'AI新闻'
        },
        'ai-news-title': {
            ja: 'AIニュース',
            en: 'AI News',
            zh: 'AI新闻'
        },
        'ai-news-subtitle': {
            ja: '最新のAI・機械学習・LLM情報',
            en: 'Latest AI, Machine Learning & LLM News',
            zh: '最新的AI、机器学习和LLM信息'
        },
        'ai-news-update-label': {
            ja: '最終更新:',
            en: 'Last Updated:',
            zh: '最后更新:'
        },
        'ai-news-update-note': {
            ja: '（毎日自動更新）',
            en: '(Auto-updated daily)',
            zh: '（每天自动更新）'
        },
        'ai-news-filter-all': {
            ja: 'すべて',
            en: 'All',
            zh: '全部'
        },
        'ai-news-filter-general': {
            ja: 'AI全般',
            en: 'AI General',
            zh: 'AI综合'
        },
        'ai-news-filter-llm': {
            ja: 'LLM',
            en: 'LLM',
            zh: 'LLM'
        },
        'ai-news-filter-tools': {
            ja: 'AIツール',
            en: 'AI Tools',
            zh: 'AI工具'
        },
        'ai-news-filter-research': {
            ja: '研究・開発',
            en: 'Research',
            zh: '研究开发'
        },
        'ai-news-loading': {
            ja: 'ニュースを読み込み中...',
            en: 'Loading news...',
            zh: '正在加载新闻...'
        },
        'ai-news-error': {
            ja: 'ニュースの読み込みに失敗しました。しばらくしてから再度お試しください。',
            en: 'Failed to load news. Please try again later.',
            zh: '新闻加载失败。请稍后再试。'
        },
        'ai-news-empty': {
            ja: '該当するニュースがありません。',
            en: 'No news found.',
            zh: '未找到相关新闻。'
        }
    };

    // ========================================
    // ファミリページ
    // ========================================
    translations.familyPage = {
        'family-page-title': {
            ja: 'Revitファミリライブラリ',
            en: 'Revit Family Library',
            zh: 'Revit族库'
        },
        'family-page-description': {
            ja: '建築、構造、設備、家具など、実務で使えるRevitファミリをカテゴリ別に整理。すべて無料でダウンロードできます。',
            en: 'Architecture, structure, MEP, furniture and more - Revit families organized by category. All free to download.',
            zh: '建筑、结构、机电、家具等实用Revit族，按类别整理。全部免费下载。'
        },
        'family-cat-architecture': {
            ja: '建築',
            en: 'Architecture',
            zh: '建筑'
        },
        'family-cat-architecture-desc': {
            ja: 'ドア、窓、壁、床、天井など',
            en: 'Doors, windows, walls, floors, ceilings, etc.',
            zh: '门、窗、墙、楼板、天花板等'
        },
        'family-cat-structure': {
            ja: '構造',
            en: 'Structure',
            zh: '结构'
        },
        'family-cat-structure-desc': {
            ja: '柱、梁、基礎、鉄骨部材など',
            en: 'Columns, beams, foundations, steel members, etc.',
            zh: '柱、梁、基础、钢构件等'
        },
        'family-cat-mep': {
            ja: '設備（MEP）',
            en: 'MEP',
            zh: '机电设备（MEP）'
        },
        'family-cat-mep-desc': {
            ja: '配管、ダクト、電気設備など',
            en: 'Pipes, ducts, electrical equipment, etc.',
            zh: '管道、风管、电气设备等'
        },
        'family-cat-furniture': {
            ja: '家具',
            en: 'Furniture',
            zh: '家具'
        },
        'family-cat-furniture-desc': {
            ja: '机、椅子、キャビネット、棚など',
            en: 'Desks, chairs, cabinets, shelves, etc.',
            zh: '桌子、椅子、柜子、货架等'
        },
        'family-cat-plumbing': {
            ja: '衛生器具',
            en: 'Plumbing Fixtures',
            zh: '卫浴设备'
        },
        'family-cat-plumbing-desc': {
            ja: 'トイレ、洗面台、浴槽など',
            en: 'Toilets, sinks, bathtubs, etc.',
            zh: '马桶、洗脸盆、浴缸等'
        },
        'family-cat-lighting': {
            ja: '照明器具',
            en: 'Lighting Fixtures',
            zh: '照明设备'
        },
        'family-cat-lighting-desc': {
            ja: 'ダウンライト、ペンダント、間接照明など',
            en: 'Downlights, pendants, indirect lighting, etc.',
            zh: '筒灯、吊灯、间接照明等'
        },
        'family-cat-site': {
            ja: '外構',
            en: 'Site',
            zh: '场地'
        },
        'family-cat-site-desc': {
            ja: '植栽、フェンス、舗装、サインなど',
            en: 'Planting, fences, paving, signage, etc.',
            zh: '绿化、围栏、铺装、标识等'
        },
        'family-cat-specialty': {
            ja: '特殊',
            en: 'Specialty',
            zh: '特殊'
        },
        'family-cat-specialty-desc': {
            ja: '注釈、タグ、詳細アイテムなど',
            en: 'Annotations, tags, detail items, etc.',
            zh: '注释、标记、详图项目等'
        },
        'family-badge-coming-soon': {
            ja: '準備中',
            en: 'Coming Soon',
            zh: '准备中'
        },
        'family-badge-available': {
            ja: '利用可能',
            en: 'Available',
            zh: '可用'
        },
        'family-info-title': {
            ja: '📢 ファミリライブラリについて',
            en: '📢 About Family Library',
            zh: '📢 关于族库'
        },
        'family-info-content': {
            ja: '現在、各カテゴリのファミリを準備中です。順次公開していく予定ですので、しばらくお待ちください。\nリクエストやご要望がありましたら、お問い合わせフォームからお気軽にご連絡ください。',
            en: 'We are currently preparing families for each category. They will be released gradually, so please stay tuned.\nIf you have any requests or suggestions, please feel free to contact us through the contact form.',
            zh: '目前正在准备各类别的族。我们将逐步发布，请耐心等待。\n如有任何需求或建议，请随时通过联系表单与我们联系。'
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
        translations.roomTag,
        translations.beamBottomColor,
        translations.beamTopColor,
        translations.beamLevelColor,
        translations.excelExport,
        translations.excelImport,
        translations.filledRegion,
        translations.fireProtection,
        translations.formwork,
        translations.footerLinks,
        translations.hatchPage,
        translations.privacyPage,
        translations.contactPage,
        translations.aboutPage,
        translations.termsPage,
        translations.newsPage,
        translations.aiNewsPage,
        translations.familyPage
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
            const translatedText = translations[key][currentLanguage];
            // strongタグの中身は翻訳しない場合の処理
            if (element.tagName === 'STRONG') {
                element.textContent = translatedText;
            } else if (element.querySelector('strong[data-lang-key]')) {
                // strongタグを含むpタグの処理（既存パターン: tip-strong）
                const strongKey = element.querySelector('strong[data-lang-key]').dataset.langKey;
                if (strongKey && translations[strongKey]) {
                    const strongText = translations[strongKey][currentLanguage];
                    element.innerHTML = `<strong>${strongText}</strong>${translatedText.replace(translations[strongKey]['ja'], '')}`;
                } else {
                    element.textContent = translatedText;
                }
            } else if (/<[a-z\/]/i.test(translatedText)) {
                // 翻訳文字列にHTMLタグ（<strong>, <code> など）が含まれる場合は innerHTML で挿入
                element.innerHTML = translatedText;
            } else {
                element.textContent = translatedText;
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

    // ページ内に直接言語ボタンがある場合も初期化
    // （index.htmlなど共通ヘッダーを使わないページ用）
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        initLanguageSwitcher();
        updateLanguageButton();
        updateAllContent();
    }
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
    // すべてのダウンロードボタンにクリックイベントを追加
    const allDownloadButtons = document.querySelectorAll('.download-btn[data-version]');

    allDownloadButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const version = this.getAttribute('data-version');

            console.log(`🖱️ Download button clicked: ${version}`);

            if (version) {
                // ダウンロード開始
                downloadWithPassword(version);
            }
        });
    });

    console.log(`✅ Download buttons initialized: ${allDownloadButtons.length} buttons`);
}

// グローバルに公開（onclick属性用）
window.downloadWithPassword = downloadWithPassword;
window.showNotAvailableMessage = showNotAvailableMessage;

// ========================================
// 11. SNSシェア機能
// ========================================

function initSocialShare() {
    const shareButtons = document.querySelectorAll('.share-btn');
    if (shareButtons.length === 0) {
        console.log('⚠️ No share buttons found');
        return;
    }

    shareButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const sns = this.dataset.sns;
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.title);

            let shareUrl = '';

            switch(sns) {
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                    break;
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                    break;
                case 'line':
                    shareUrl = `https://social-plugins.line.me/lineit/share?url=${url}`;
                    break;
                case 'hatena':
                    shareUrl = `https://b.hatena.ne.jp/entry/${url}`;
                    break;
                default:
                    console.warn(`Unknown SNS: ${sns}`);
                    return;
            }

            window.open(shareUrl, '_blank', 'width=600,height=400');
            console.log(`🔗 Shared on ${sns}: ${url}`);
        });
    });

    console.log(`✅ Social share buttons initialized: ${shareButtons.length} buttons`);
}

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
