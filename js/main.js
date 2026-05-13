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
    // room-tag.html (部屋タグ自動配置)
    // ========================================
    translations.roomTag = {
        'manual-room-tag-title': {
            ja: '部屋タグ自動配置',
            en: 'Room Tag Auto Placement',
            zh: '房间标签自动放置'
        },
        'manual-room-tag-subtitle': {
            ja: 'ビューポートの部屋情報からタグを一括自動配置',
            en: 'Auto-place room tags from viewport room data',
            zh: '从视口房间信息自动批量放置标签'
        },
        'manual-room-tag-overview': {
            ja: '図面シート上のビューポートから部屋情報を読み取り、指定したタグタイプ・間隔・配列数で新しいビューにルームタグを一括自動配置する機能です。仕上表の作成作業を大幅に効率化できます。',
            en: 'This feature reads room information from viewports on drawing sheets and automatically places room tags in a new view with specified tag types, spacing, and grid arrangement. It greatly streamlines the creation of finish schedules.',
            zh: '此功能从图纸视口读取房间信息，并按指定的标签类型、间距和排列数在新视图中自动批量放置房间标签。大大提高了装修表的创建效率。'
        },
        'manual-room-tag-feature1': {
            ja: 'ビューポート内の部屋を自動検出・一覧表示',
            en: 'Auto-detect and list rooms in viewport',
            zh: '自动检测并列出视口中的房间'
        },
        'manual-room-tag-feature2': {
            ja: 'タグの種類（ファミリ）を選択可能',
            en: 'Selectable tag type (family)',
            zh: '可选择标签类型（族）'
        },
        'manual-room-tag-feature3': {
            ja: 'グリッド配列（行数・間隔）を自由に設定',
            en: 'Freely configure grid layout (rows and spacing)',
            zh: '自由设置网格排列（行数和间距）'
        },
        'manual-room-tag-feature4': {
            ja: '配置プレビューをリアルタイムで確認',
            en: 'Real-time placement preview',
            zh: '实时预览放置效果'
        },
        'manual-room-tag-feature5': {
            ja: '平面図 / 天井伏図 のビューファミリタイプを選択可能',
            en: 'Selectable view family type (Floor Plan / Ceiling Plan)',
            zh: '可选择视图族类型（平面图/天花板平面图）'
        },
        'manual-room-tag-feature6': {
            ja: '部屋の順番変更・除外が可能',
            en: 'Reorder or exclude rooms',
            zh: '可更改房间顺序或排除房间'
        },
        'manual-room-tag-step1-title': {
            ja: '図面シートを開く',
            en: 'Open Drawing Sheet',
            zh: '打开图纸'
        },
        'manual-room-tag-step1-desc': {
            ja: '部屋が配置されたビューポートがあるシートを表示します。',
            en: 'Display the sheet containing viewports with rooms placed.',
            zh: '显示包含已放置房间的视口的图纸。'
        },
        'manual-room-tag-step2-title': {
            ja: 'ボタンをクリック',
            en: 'Click Button',
            zh: '点击按钮'
        },
        'manual-room-tag-step2-desc': {
            ja: 'リボンの「注釈・詳細」パネルから「部屋タグ 自動配置」をクリックします。',
            en: 'Click "Room Tag Auto Placement" from the "Annotation & Detail" panel on the ribbon.',
            zh: '从功能区的"注释·详细"面板中点击"房间标签 自动放置"。'
        },
        'manual-room-tag-step3-title': {
            ja: 'ビューポートを選択',
            en: 'Select Viewport',
            zh: '选择视口'
        },
        'manual-room-tag-step3-desc': {
            ja: 'シート上のビューポートをクリックして選択します。',
            en: 'Click to select a viewport on the sheet.',
            zh: '点击选择图纸上的视口。'
        },
        'manual-room-tag-step4-title': {
            ja: '設定ダイアログ',
            en: 'Settings Dialog',
            zh: '设置对话框'
        },
        'manual-room-tag-step4-desc': {
            ja: 'ビュー名（自動生成、編集可能）、ビューファミリタイプ（平面図/天井伏図）、タグファミリタイプ、タグの間隔（mm）、行数、部屋リスト（順番変更・除外）を設定します。',
            en: 'Configure view name (auto-generated, editable), view family type (Floor Plan/Ceiling Plan), tag family type, tag spacing (mm), number of rows, and room list (reorder/exclude).',
            zh: '设置视图名称（自动生成，可编辑）、视图族类型（平面图/天花板平面图）、标签族类型、标签间距（mm）、行数、房间列表（排序/排除）。'
        },
        'manual-room-tag-step5-title': {
            ja: 'OKをクリック',
            en: 'Click OK',
            zh: '点击确定'
        },
        'manual-room-tag-step5-desc': {
            ja: '新しいビューが作成され、タグが自動配置されます。',
            en: 'A new view is created and tags are automatically placed.',
            zh: '创建新视图并自动放置标签。'
        },
        'manual-room-tag-step6-title': {
            ja: '完了',
            en: 'Complete',
            zh: '完成'
        },
        'manual-room-tag-step6-desc': {
            ja: '作成されたビュー名とタグ数が表示され、自動的にそのビューに切り替わります。',
            en: 'The created view name and tag count are displayed, and the view is automatically switched.',
            zh: '显示创建的视图名称和标签数量，并自动切换到该视图。'
        },
        'manual-room-tag-usecase1-title': {
            ja: '仕上表の作成',
            en: 'Finish Schedule Creation',
            zh: '装修表制作'
        },
        'manual-room-tag-usecase1-desc': {
            ja: '部屋タグを整列配置して、仕上表ビューを効率的に作成できます。',
            en: 'Create finish schedule views efficiently by aligning room tags.',
            zh: '通过排列房间标签高效创建装修表视图。'
        },
        'manual-room-tag-usecase2-title': {
            ja: '部屋一覧の整理',
            en: 'Room List Organization',
            zh: '房间列表整理'
        },
        'manual-room-tag-usecase2-desc': {
            ja: '複数の部屋タグをグリッド状に整列し、見やすい一覧表を作成できます。',
            en: 'Align multiple room tags in a grid to create a clear overview list.',
            zh: '将多个房间标签网格排列，创建清晰的一览表。'
        },
        'manual-room-tag-usecase3-title': {
            ja: '作業時間の短縮',
            en: 'Time Saving',
            zh: '节省时间'
        },
        'manual-room-tag-usecase3-desc': {
            ja: '手動でタグを1つずつ配置する手間を省き、大幅に時間を短縮できます。',
            en: 'Save significant time by eliminating the need to place tags one by one manually.',
            zh: '省去手动逐个放置标签的麻烦，大幅节省时间。'
        },
        'manual-room-tag-tip1': {
            ja: '行数や間隔を変更すると、リアルタイムでプレビューが更新されます。最適な配置を確認してから実行できます。',
            en: 'Preview updates in real-time when you change rows or spacing. Confirm the optimal layout before executing.',
            zh: '更改行数或间距时，预览会实时更新。可以在执行前确认最佳布局。'
        },
        'manual-room-tag-tip1-strong': {
            ja: 'プレビュー活用：',
            en: 'Use Preview:',
            zh: '使用预览：'
        },
        'manual-room-tag-tip2': {
            ja: '部屋リストで順番を変更することで、タグの配置順序をカスタマイズできます。',
            en: 'Customize the tag placement order by reordering rooms in the list.',
            zh: '通过在列表中更改房间顺序来自定义标签放置顺序。'
        },
        'manual-room-tag-tip2-strong': {
            ja: '部屋の順番変更：',
            en: 'Reorder Rooms:',
            zh: '更改房间顺序：'
        },
        'manual-room-tag-tip3': {
            ja: '部屋リストからチェックを外すことで、特定の部屋をタグ配置対象から除外できます。',
            en: 'Exclude specific rooms from tag placement by unchecking them in the room list.',
            zh: '通过取消选中列表中的房间，将特定房间排除在标签放置范围之外。'
        },
        'manual-room-tag-tip3-strong': {
            ja: '不要な部屋の除外：',
            en: 'Exclude Rooms:',
            zh: '排除房间：'
        },
        'manual-room-tag-note1': {
            ja: 'ビューポート内に部屋が配置されていない場合は使用できません。',
            en: 'Cannot be used if no rooms are placed in the viewport.',
            zh: '如果视口中没有放置房间，则无法使用。'
        },
        'manual-room-tag-note2': {
            ja: '新しいビューが自動作成されるため、不要な場合はビューを削除してください。',
            en: 'A new view is automatically created. Delete it if not needed.',
            zh: '会自动创建新视图。如果不需要，请删除该视图。'
        },
        'manual-room-tag-note3': {
            ja: '図面シートがアクティブな状態で実行する必要があります。',
            en: 'Must be executed with a drawing sheet as the active view.',
            zh: '必须在图纸为活动视图的状态下执行。'
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
            ja: 'Revitモデルの要素パラメータをカテゴリ別にExcelファイル（.xlsx）へ書き出す機能です。カテゴリ・パラメータの選択、出力列の並び替え、設定の保存/読込が可能です。',
            en: 'This feature exports Revit model element parameters to Excel files (.xlsx) by category. It supports category/parameter selection, column reordering, and saving/loading settings.',
            zh: '此功能按类别将Revit模型元素参数导出到Excel文件（.xlsx）。支持类别/参数选择、列排序和设置保存/加载。'
        },
        'manual-excel-export-feature1': {
            ja: 'カテゴリ別にシート分割して出力',
            en: 'Output split into sheets by category',
            zh: '按类别分工作表输出'
        },
        'manual-excel-export-feature2': {
            ja: 'インスタンスパラメータ（I-）/ タイプパラメータ（T-）を区別',
            en: 'Distinguish instance (I-) and type (T-) parameters',
            zh: '区分实例参数（I-）和类型参数（T-）'
        },
        'manual-excel-export-feature3': {
            ja: '出力パラメータと列順をドラッグ＆ドロップ感覚で選択・並替え',
            en: 'Select and reorder output parameters with drag-and-drop style interface',
            zh: '以拖放方式选择和排列输出参数及列顺序'
        },
        'manual-excel-export-feature4': {
            ja: 'カテゴリ・パラメータの検索フィルタ',
            en: 'Search filter for categories and parameters',
            zh: '类别和参数搜索过滤器'
        },
        'manual-excel-export-feature5': {
            ja: '設定の保存・読込・リセット（JSON形式）',
            en: 'Save, load, and reset settings (JSON format)',
            zh: '设置保存·加载·重置（JSON格式）'
        },
        'manual-excel-export-feature6': {
            ja: '数値は数値型で書き込み（Excel警告なし）',
            en: 'Numbers written as numeric type (no Excel warnings)',
            zh: '数值以数字类型写入（无Excel警告）'
        },
        'manual-excel-export-feature7': {
            ja: 'ヘッダー行に緑背景＋白文字＋オートフィルタ自動設定',
            en: 'Header row with green background, white text, and auto-filter',
            zh: '表头行绿色背景+白色文字+自动筛选自动设置'
        },
        'manual-excel-export-feature8': {
            ja: 'エクスポート後に自動でExcelファイルを開く',
            en: 'Automatically open Excel file after export',
            zh: '导出后自动打开Excel文件'
        },
        'manual-excel-export-step1-title': {
            ja: 'Revitモデルを開く',
            en: 'Open Revit Model',
            zh: '打开Revit模型'
        },
        'manual-excel-export-step1-desc': {
            ja: 'エクスポートしたい要素が含まれるモデルをアクティブにします。',
            en: 'Activate the model containing the elements you want to export.',
            zh: '激活包含要导出元素的模型。'
        },
        'manual-excel-export-step2-title': {
            ja: 'ボタンをクリック',
            en: 'Click Button',
            zh: '点击按钮'
        },
        'manual-excel-export-step2-desc': {
            ja: 'リボンの「Excel連携」パネルから「Excel エクスポート」をクリックします。',
            en: 'Click "Excel Export" from the "Excel Integration" panel on the ribbon.',
            zh: '从功能区的"Excel联动"面板中点击"Excel 导出"。'
        },
        'manual-excel-export-step3-title': {
            ja: 'カテゴリ選択',
            en: 'Select Categories',
            zh: '选择类别'
        },
        'manual-excel-export-step3-desc': {
            ja: '左側のカテゴリリストからエクスポート対象を選択します。チェックボックスで選択でき、検索フィルタも使用できます。',
            en: 'Select export targets from the category list on the left. Use checkboxes to select and search filter for filtering.',
            zh: '从左侧类别列表中选择导出目标。使用复选框选择，也可使用搜索过滤器。'
        },
        'manual-excel-export-step4-title': {
            ja: 'パラメータ選択',
            en: 'Select Parameters',
            zh: '选择参数'
        },
        'manual-excel-export-step4-desc': {
            ja: '中央のパラメータリストから出力したいパラメータを選び、「＞」ボタンで出力リストに追加します。',
            en: 'Select parameters to output from the center list and add them to the output list with the ">" button.',
            zh: '从中央参数列表中选择要输出的参数，使用">"按钮添加到输出列表。'
        },
        'manual-excel-export-step5-title': {
            ja: '列順の調整',
            en: 'Adjust Column Order',
            zh: '调整列顺序'
        },
        'manual-excel-export-step5-desc': {
            ja: '右側の出力リストで「▲」「▼」ボタンで列順を調整します。',
            en: 'Adjust column order using the up/down buttons in the output list on the right.',
            zh: '在右侧输出列表中使用"▲""▼"按钮调整列顺序。'
        },
        'manual-excel-export-step6-title': {
            ja: 'エクスポート実行',
            en: 'Execute Export',
            zh: '执行导出'
        },
        'manual-excel-export-step6-desc': {
            ja: 'OKをクリックし、保存先を選択してエクスポートを実行します。完了するとExcelファイルが自動的に開かれます。',
            en: 'Click OK, select the save location, and execute the export. The Excel file opens automatically when complete.',
            zh: '点击确定，选择保存位置并执行导出。完成后Excel文件将自动打开。'
        },
        'manual-excel-export-usecase1-title': {
            ja: '数量集計',
            en: 'Quantity Takeoff',
            zh: '数量统计'
        },
        'manual-excel-export-usecase1-desc': {
            ja: '要素のパラメータをExcelに書き出して、数量集計や見積作業に活用できます。',
            en: 'Export element parameters to Excel for quantity takeoff and estimation work.',
            zh: '将元素参数导出到Excel，用于数量统计和估算工作。'
        },
        'manual-excel-export-usecase2-title': {
            ja: 'データ分析',
            en: 'Data Analysis',
            zh: '数据分析'
        },
        'manual-excel-export-usecase2-desc': {
            ja: 'Excelのピボットテーブルやグラフ機能を使って、モデルデータを分析できます。',
            en: 'Analyze model data using Excel pivot tables and chart features.',
            zh: '使用Excel数据透视表和图表功能分析模型数据。'
        },
        'manual-excel-export-usecase3-title': {
            ja: 'レポート作成',
            en: 'Report Creation',
            zh: '报告制作'
        },
        'manual-excel-export-usecase3-desc': {
            ja: 'モデル情報をExcel形式で共有し、関係者へのレポート作成に利用できます。',
            en: 'Share model information in Excel format and use it for creating reports for stakeholders.',
            zh: '以Excel格式共享模型信息，用于向相关方制作报告。'
        },
        'manual-excel-export-tip1': {
            ja: 'よく使うカテゴリ・パラメータの組み合わせを設定ファイル（JSON）として保存し、次回から読み込めます。',
            en: 'Save frequently used category/parameter combinations as settings files (JSON) for future use.',
            zh: '将常用的类别·参数组合保存为设置文件（JSON），下次可直接加载。'
        },
        'manual-excel-export-tip1-strong': {
            ja: '設定の保存：',
            en: 'Save Settings:',
            zh: '保存设置：'
        },
        'manual-excel-export-tip2': {
            ja: 'I-（インスタンス）とT-（タイプ）の接頭辞でパラメータの種類を区別できます。',
            en: 'Distinguish parameter types with I- (instance) and T- (type) prefixes.',
            zh: '通过I-（实例）和T-（类型）前缀区分参数类型。'
        },
        'manual-excel-export-tip2-strong': {
            ja: 'パラメータの区別：',
            en: 'Parameter Types:',
            zh: '参数区分：'
        },
        'manual-excel-export-tip3': {
            ja: 'エクスポートしたファイルを編集し、「Excelインポート」で書き戻すことができます。',
            en: 'Edit the exported file and write it back using "Excel Import".',
            zh: '编辑导出的文件，使用"Excel导入"写回。'
        },
        'manual-excel-export-tip3-strong': {
            ja: 'Excelインポートとの連携：',
            en: 'Excel Import Integration:',
            zh: 'Excel导入联动：'
        },
        'manual-excel-export-note1': {
            ja: '大量の要素をエクスポートする場合、処理に時間がかかることがあります。',
            en: 'Processing may take time when exporting a large number of elements.',
            zh: '导出大量元素时，处理可能需要一些时间。'
        },
        'manual-excel-export-note2': {
            ja: '出力先のExcelファイルが開いている場合はエクスポートできません。先にファイルを閉じてください。',
            en: 'Cannot export if the output Excel file is open. Please close the file first.',
            zh: '如果输出Excel文件已打开，则无法导出。请先关闭文件。'
        },
        'manual-excel-export-note3': {
            ja: 'エクスポート対象はモデル内の要素のみです。リンクモデルの要素は含まれません。',
            en: 'Only elements in the model are exported. Linked model elements are not included.',
            zh: '仅导出模型中的元素。不包含链接模型的元素。'
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
            ja: 'Excelの編集内容をRevitモデルに書き戻し',
            en: 'Import Excel edits back into Revit model',
            zh: '将Excel编辑内容写回Revit模型'
        },
        'manual-excel-import-overview': {
            ja: 'エクスポートしたExcelファイルの編集内容をRevitモデルに書き戻す機能です。変更箇所のプレビュー確認、読み取り専用パラメータの自動スキップ、インポート後のExcel色付け（変更セルを黄色にハイライト）に対応します。',
            en: 'This feature writes back edited Excel file contents to the Revit model. It supports change preview, auto-skip of read-only parameters, and post-import Excel coloring (highlighting changed cells in yellow).',
            zh: '此功能将编辑后的Excel文件内容写回Revit模型。支持变更预览确认、只读参数自动跳过、导入后Excel着色（将变更单元格高亮为黄色）。'
        },
        'manual-excel-import-feature1': {
            ja: '開いているExcelファイルの自動検出',
            en: 'Auto-detect open Excel files',
            zh: '自动检测已打开的Excel文件'
        },
        'manual-excel-import-feature2': {
            ja: '変更プレビュー（DataGrid表示、現在値 vs 新しい値）',
            en: 'Change preview (DataGrid display, current vs new values)',
            zh: '变更预览（DataGrid显示，当前值 vs 新值）'
        },
        'manual-excel-import-feature3': {
            ja: '読み取り専用パラメータは自動スキップ（サマリーに件数表示）',
            en: 'Auto-skip read-only parameters (count shown in summary)',
            zh: '只读参数自动跳过（摘要中显示数量）'
        },
        'manual-excel-import-feature4': {
            ja: 'インポート後、変更セルをExcel上で黄色ハイライト',
            en: 'Highlight changed cells in yellow on Excel after import',
            zh: '导入后在Excel上将变更单元格高亮为黄色'
        },
        'manual-excel-import-feature5': {
            ja: 'トランザクションによる安全な更新（失敗時はロールバック）',
            en: 'Safe updates via transactions (rollback on failure)',
            zh: '通过事务进行安全更新（失败时回滚）'
        },
        'manual-excel-import-feature6': {
            ja: 'エラー・警告の詳細表示',
            en: 'Detailed error and warning display',
            zh: '详细显示错误和警告'
        },
        'manual-excel-import-step1-title': {
            ja: 'Revitモデルを開く',
            en: 'Open Revit Model',
            zh: '打开Revit模型'
        },
        'manual-excel-import-step1-desc': {
            ja: 'インポート先のモデルをアクティブにします。',
            en: 'Activate the target model for import.',
            zh: '激活导入目标模型。'
        },
        'manual-excel-import-step2-title': {
            ja: 'ボタンをクリック',
            en: 'Click Button',
            zh: '点击按钮'
        },
        'manual-excel-import-step2-desc': {
            ja: 'リボンの「Excel連携」パネルから「Excel インポート」をクリックします。',
            en: 'Click "Excel Import" from the "Excel Integration" panel on the ribbon.',
            zh: '从功能区的"Excel联动"面板中点击"Excel 导入"。'
        },
        'manual-excel-import-step3-title': {
            ja: 'Excelファイル選択',
            en: 'Select Excel File',
            zh: '选择Excel文件'
        },
        'manual-excel-import-step3-desc': {
            ja: '開いているExcelファイルを自動検出して選択するか、「参照...」ボタンでファイルを選択します。',
            en: 'Auto-detect and select an open Excel file, or select a file using the "Browse..." button.',
            zh: '自动检测并选择已打开的Excel文件，或使用"浏览..."按钮选择文件。'
        },
        'manual-excel-import-step4-title': {
            ja: '変更プレビュー確認',
            en: 'Review Change Preview',
            zh: '确认变更预览'
        },
        'manual-excel-import-step4-desc': {
            ja: '変更内容（要素ID、カテゴリ、パラメータ、現在値→新しい値）を確認します。',
            en: 'Review changes (element ID, category, parameter, current value → new value).',
            zh: '确认变更内容（元素ID、类别、参数、当前值→新值）。'
        },
        'manual-excel-import-step5-title': {
            ja: 'インポート実行',
            en: 'Execute Import',
            zh: '执行导入'
        },
        'manual-excel-import-step5-desc': {
            ja: '「インポート実行」をクリックし、確認ダイアログで「はい」を選択します。結果サマリーが表示され、Excelの変更セルが黄色にハイライトされます。',
            en: 'Click "Execute Import" and select "Yes" in the confirmation dialog. A result summary is displayed and changed cells in Excel are highlighted in yellow.',
            zh: '点击"执行导入"，在确认对话框中选择"是"。显示结果摘要，Excel中的变更单元格将高亮为黄色。'
        },
        'manual-excel-import-usecase1-title': {
            ja: '一括パラメータ更新',
            en: 'Batch Parameter Update',
            zh: '批量参数更新'
        },
        'manual-excel-import-usecase1-desc': {
            ja: 'Excelで大量のパラメータを編集し、一括でRevitモデルに反映できます。',
            en: 'Edit a large number of parameters in Excel and apply them to the Revit model at once.',
            zh: '在Excel中编辑大量参数，一次性反映到Revit模型中。'
        },
        'manual-excel-import-usecase2-title': {
            ja: '外部データの取り込み',
            en: 'External Data Integration',
            zh: '外部数据导入'
        },
        'manual-excel-import-usecase2-desc': {
            ja: '他のシステムから出力されたExcelデータをRevitモデルに反映できます。',
            en: 'Integrate Excel data from other systems into the Revit model.',
            zh: '将其他系统输出的Excel数据反映到Revit模型中。'
        },
        'manual-excel-import-usecase3-title': {
            ja: '修正作業の効率化',
            en: 'Efficient Corrections',
            zh: '修改工作效率化'
        },
        'manual-excel-import-usecase3-desc': {
            ja: 'Revit上で1つずつ修正するよりExcelで一括編集した方が効率的な場合に活用できます。',
            en: 'Useful when batch editing in Excel is more efficient than correcting one by one in Revit.',
            zh: '当在Excel中批量编辑比在Revit中逐个修改更高效时使用。'
        },
        'manual-excel-import-tip1': {
            ja: 'インポート前に変更内容を確認できるので、意図しない変更を防げます。',
            en: 'Review changes before import to prevent unintended modifications.',
            zh: '导入前可确认变更内容，防止意外修改。'
        },
        'manual-excel-import-tip1-strong': {
            ja: '変更プレビュー：',
            en: 'Change Preview:',
            zh: '变更预览：'
        },
        'manual-excel-import-tip2': {
            ja: 'インポート後にExcel上で変更されたセルが黄色になるので、どの値が更新されたか確認できます。',
            en: 'Changed cells turn yellow in Excel after import, so you can verify which values were updated.',
            zh: '导入后Excel中变更的单元格变为黄色，可确认哪些值被更新。'
        },
        'manual-excel-import-tip2-strong': {
            ja: '黄色ハイライト：',
            en: 'Yellow Highlight:',
            zh: '黄色高亮：'
        },
        'manual-excel-import-tip3': {
            ja: 'トランザクション機能により、エラーが発生した場合は変更が自動的に取り消されます。',
            en: 'Transaction feature automatically rolls back changes if errors occur.',
            zh: '事务功能确保发生错误时自动撤销更改。'
        },
        'manual-excel-import-tip3-strong': {
            ja: '安全なロールバック：',
            en: 'Safe Rollback:',
            zh: '安全回滚：'
        },
        'manual-excel-import-note1': {
            ja: '「Excelエクスポート」で出力したファイル形式に準拠している必要があります。',
            en: 'The file must conform to the format output by "Excel Export".',
            zh: '文件必须符合"Excel导出"输出的文件格式。'
        },
        'manual-excel-import-note2': {
            ja: '読み取り専用パラメータ（要素IDなど）は自動的にスキップされます。',
            en: 'Read-only parameters (such as element ID) are automatically skipped.',
            zh: '只读参数（如元素ID等）将自动跳过。'
        },
        'manual-excel-import-note3': {
            ja: 'インポート前にRevitモデルのバックアップを取ることを推奨します。',
            en: 'It is recommended to back up your Revit model before importing.',
            zh: '建议在导入前备份Revit模型。'
        }
    };

    // ========================================
    // filled-region.html (塗潰し領域 分割・統合)
    // ========================================
    translations.filledRegion = {
        'manual-filled-region-title': {
            ja: '塗潰し領域 分割・統合',
            en: 'Filled Region Split & Merge',
            zh: '填充区域 分割与合并'
        },
        'manual-filled-region-subtitle': {
            ja: '塗り潰し領域を個別に分割または1つに統合',
            en: 'Split or merge filled regions',
            zh: '将填充区域分割或合并'
        },
        'manual-filled-region-overview': {
            ja: '配置済みの塗り潰し領域を分割または統合する機能です。分割では、1つの塗り潰し領域が複数の独立したエリア（境界）を含んでいる場合、それぞれを個別の独立した塗り潰し領域に分離します。統合では、複数の別々の塗り潰し領域を1つの領域にまとめます。',
            en: 'This feature splits or merges placed filled regions. Split separates a single filled region containing multiple independent areas (boundaries) into individual filled regions. Merge combines multiple separate filled regions into one.',
            zh: '此功能用于分割或合并已放置的填充区域。分割将包含多个独立区域（边界）的单个填充区域分离为独立的填充区域。合并将多个单独的填充区域合并为一个区域。'
        },
        'manual-filled-region-feature1': {
            ja: '選択した領域の状態に応じて分割/統合の可否を自動判定',
            en: 'Automatically determine split/merge availability based on selection state',
            zh: '根据选择状态自动判定可否分割/合并'
        },
        'manual-filled-region-feature2': {
            ja: '分割時は元のパターンを維持',
            en: 'Original pattern preserved when splitting',
            zh: '分割时保持原始图案'
        },
        'manual-filled-region-feature3': {
            ja: '統合時はパターンを自由に選択可能（プロジェクト内の全パターンから選択）',
            en: 'Freely select pattern when merging (choose from all project patterns)',
            zh: '合并时可自由选择图案（从项目内所有图案中选择）'
        },
        'manual-filled-region-feature4': {
            ja: '選択情報（領域数、エリア数）をリアルタイム表示',
            en: 'Real-time display of selection info (region count, area count)',
            zh: '实时显示选择信息（区域数、面积数）'
        },
        'manual-filled-region-feature5': {
            ja: 'エラー時はトランザクション自動ロールバック',
            en: 'Automatic transaction rollback on error',
            zh: '错误时自动回滚事务'
        },
        'manual-filled-region-step1-title': {
            ja: '塗り潰し領域を選択',
            en: 'Select Filled Regions',
            zh: '选择填充区域'
        },
        'manual-filled-region-step1-desc': {
            ja: 'ビュー上で、分割したい領域（1つ以上）または統合したい領域（2つ以上）を選択します。',
            en: 'Select regions to split (1 or more) or merge (2 or more) on the view.',
            zh: '在视图上选择要分割的区域（1个以上）或要合并的区域（2个以上）。'
        },
        'manual-filled-region-step2-title': {
            ja: 'ボタンをクリック',
            en: 'Click Button',
            zh: '点击按钮'
        },
        'manual-filled-region-step2-desc': {
            ja: 'リボンの「注釈・詳細」パネルから「塗潰し領域 分割･統合」をクリックします。',
            en: 'Click "Filled Region Split & Merge" from the "Annotation & Detail" panel on the ribbon.',
            zh: '从功能区的"注释·详细"面板中点击"填充区域 分割与合并"。'
        },
        'manual-filled-region-step3-title': {
            ja: '操作を選択',
            en: 'Select Operation',
            zh: '选择操作'
        },
        'manual-filled-region-step3-desc': {
            ja: 'ダイアログで操作を選択します。分割は複数エリアを持つ領域がある場合、統合は2つ以上の領域を選択している場合に選択可能です。',
            en: 'Select the operation in the dialog. Split is available when regions contain multiple areas; Merge is available when 2 or more regions are selected.',
            zh: '在对话框中选择操作。当区域包含多个面积时可选择分割；选择2个以上区域时可选择合并。'
        },
        'manual-filled-region-step4-title': {
            ja: '（統合の場合）パターン選択',
            en: '(For Merge) Select Pattern',
            zh: '（合并时）选择图案'
        },
        'manual-filled-region-step4-desc': {
            ja: '統合後の塗り潰しパターンをドロップダウンから選択します。選択した領域が同じパターンの場合は自動選択済みです。',
            en: 'Select the fill pattern from the dropdown for the merged region. If selected regions share the same pattern, it is auto-selected.',
            zh: '从下拉菜单中选择合并后的填充图案。如果所选区域具有相同图案，则自动选择。'
        },
        'manual-filled-region-step5-title': {
            ja: 'OKをクリック',
            en: 'Click OK',
            zh: '点击确定'
        },
        'manual-filled-region-step5-desc': {
            ja: '処理を実行します。完了すると結果メッセージが表示されます。',
            en: 'Execute the operation. A result message is displayed upon completion.',
            zh: '执行处理。完成后显示结果消息。'
        },
        'manual-filled-region-usecase1-title': {
            ja: '仕上げ図面の整理',
            en: 'Finish Drawing Organization',
            zh: '装修图纸整理'
        },
        'manual-filled-region-usecase1-desc': {
            ja: '複数エリアに分かれた塗り潰し領域を個別管理したい場合に、分割して整理できます。',
            en: 'Split and organize filled regions with multiple areas for individual management.',
            zh: '将包含多个区域的填充区域分割整理，以便单独管理。'
        },
        'manual-filled-region-usecase2-title': {
            ja: 'パターン統一',
            en: 'Pattern Unification',
            zh: '图案统一'
        },
        'manual-filled-region-usecase2-desc': {
            ja: 'バラバラに作成された塗り潰し領域を1つに統合し、パターンを統一できます。',
            en: 'Merge separately created filled regions into one and unify the pattern.',
            zh: '将分别创建的填充区域合并为一个并统一图案。'
        },
        'manual-filled-region-usecase3-title': {
            ja: '編集の効率化',
            en: 'Efficient Editing',
            zh: '编辑效率化'
        },
        'manual-filled-region-usecase3-desc': {
            ja: '統合することで1つの要素として管理でき、移動や削除などの編集が効率的になります。',
            en: 'Manage as a single element after merging for more efficient editing, moving, and deleting.',
            zh: '合并后作为单个元素管理，使移动和删除等编辑更加高效。'
        },
        'manual-filled-region-tip1': {
            ja: '選択した領域の状態に応じて、分割・統合の可否がダイアログに自動表示されます。',
            en: 'Split/merge availability is automatically shown in the dialog based on the selected regions.',
            zh: '根据所选区域的状态，对话框中自动显示可否分割/合并。'
        },
        'manual-filled-region-tip1-strong': {
            ja: '自動判定：',
            en: 'Auto Detection:',
            zh: '自动判定：'
        },
        'manual-filled-region-tip2': {
            ja: '分割時は元の塗り潰しパターンがそのまま維持されるため、見た目は変わりません。',
            en: 'The original fill pattern is preserved when splitting, so the appearance remains unchanged.',
            zh: '分割时保持原始填充图案，因此外观不会改变。'
        },
        'manual-filled-region-tip2-strong': {
            ja: 'パターン維持：',
            en: 'Pattern Preserved:',
            zh: '图案保持：'
        },
        'manual-filled-region-tip3': {
            ja: '統合時にパターンを変更できるため、複数領域のパターン一括変更にも活用できます。',
            en: 'You can change the pattern when merging, useful for batch pattern changes across multiple regions.',
            zh: '合并时可更改图案，因此也可用于批量更改多个区域的图案。'
        },
        'manual-filled-region-tip3-strong': {
            ja: 'パターン変更：',
            en: 'Pattern Change:',
            zh: '图案更改：'
        },
        'manual-filled-region-note1': {
            ja: '分割するには、塗り潰し領域が複数の独立したエリア（境界）を含んでいる必要があります。',
            en: 'To split, the filled region must contain multiple independent areas (boundaries).',
            zh: '要分割，填充区域必须包含多个独立的区域（边界）。'
        },
        'manual-filled-region-note2': {
            ja: '統合するには、2つ以上の塗り潰し領域を選択する必要があります。',
            en: 'To merge, 2 or more filled regions must be selected.',
            zh: '要合并，必须选择2个以上的填充区域。'
        },
        'manual-filled-region-note3': {
            ja: 'エラーが発生した場合、トランザクションが自動ロールバックされ、元の状態に戻ります。',
            en: 'If an error occurs, the transaction is automatically rolled back to the original state.',
            zh: '如果发生错误，事务将自动回滚到原始状态。'
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
            ja: 'Join Geometry は不要',
            en: 'Join Geometry not required',
            zh: '无需Join Geometry'
        },
        'manual-formwork-prep3-desc': {
            ja: '要素同士の接合は <strong>Join Geometry でつなぐ必要はありません</strong>。本機能が幾何検査で接触面を自動検出します。',
            en: 'You <strong>do not need to join elements with Join Geometry</strong>. This feature auto-detects contact surfaces through geometric inspection.',
            zh: '元素之间<strong>无需使用Join Geometry连接</strong>。本功能通过几何检查自动检测接触面。'
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
            ja: '3Dビューを開く',
            en: 'Open a 3D view',
            zh: '打开3D视图'
        },
        'manual-formwork-step1-desc': {
            ja: '対象範囲のみが表示された3Dビュー（必要に応じてセクションボックスで切り取り）を開きます。「現在のビューに表示されている要素」モードを使う場合は3Dビューが必須です。',
            en: 'Open a 3D view showing only the target range (use a section box if needed). A 3D view is required when using the "Elements visible in the current view" mode.',
            zh: '打开仅显示目标范围的3D视图（必要时使用剖面框裁剪）。使用"当前视图中可见的元素"模式时必须为3D视图。'
        },
        'manual-formwork-step2-title': {
            ja: 'ボタンをクリック',
            en: 'Click the button',
            zh: '点击按钮'
        },
        'manual-formwork-step2-desc': {
            ja: 'リボン「28 Tools」タブ →「構造」パネル →「型枠数量算出」をクリックします。',
            en: 'Click Ribbon "28 Tools" tab → "Structure" panel → "Formwork Quantity Calculation".',
            zh: '点击功能区"28 Tools"选项卡 → "结构"面板 → "模板数量计算"。'
        },
        'manual-formwork-step3-title': {
            ja: '計算範囲と集計区分を指定',
            en: 'Specify calculation scope and aggregation categories',
            zh: '指定计算范围和汇总分类'
        },
        'manual-formwork-step3-desc': {
            ja: '「プロジェクト全体」または「現在のビューに表示されている要素」を選択し、部位別・工区別・型枠種別の集計区分を選択します。工区・型枠種別はパラメータ名を指定します。',
            en: 'Choose "Entire project" or "Elements visible in current view", then choose aggregation categories: by member, work zone, or formwork type. Specify parameter names for work zone and formwork type.',
            zh: '选择"整个项目"或"当前视图中可见的元素"，并选择按部位/工区/模板类型的汇总分类。工区和模板类型需指定参数名。'
        },
        'manual-formwork-step4-title': {
            ja: '出力先とオプションを設定',
            en: 'Configure output destinations and options',
            zh: '设置输出目标和选项'
        },
        'manual-formwork-step4-desc': {
            ja: 'Excel／Revit集計ビュー／色分け3Dビュー／集計シートのうち必要な出力にチェックを入れます。3Dビューの色分け区分や、GL高さで地中部分を控除するオプションも指定できます。',
            en: 'Check the desired outputs: Excel, Revit schedule view, color-coded 3D view, and summary sheet. You can also specify the 3D view color category and the option to deduct underground parts by GL height.',
            zh: '勾选所需输出：Excel、Revit明细表视图、彩色3D视图、汇总图纸。还可指定3D视图的着色分类，以及按GL高度扣除地下部分的选项。'
        },
        'manual-formwork-step5-title': {
            ja: '実行と結果確認',
            en: 'Execute and review results',
            zh: '执行并查看结果'
        },
        'manual-formwork-step5-desc': {
            ja: '「実行」をクリックすると要素数100〜500個で30秒〜2分程度で処理が完了します。完了ダイアログで対象要素数・合計型枠面積・自動除外件数・出力先などを確認できます。',
            en: 'Click "Execute" and processing completes in 30 seconds to 2 minutes for 100–500 elements. The completion dialog shows target element count, total formwork area, auto-excluded count, and output destinations.',
            zh: '点击"执行"，100〜500个元素约30秒〜2分钟完成处理。完成对话框显示目标元素数、总模板面积、自动排除数、输出目标等。'
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
