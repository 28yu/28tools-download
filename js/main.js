// main.js v6.2 - 言語切り替え完全修正版

// ==========================================
// 1. 共通ヘッダー読み込み機能
// ==========================================
async function loadHeader() {
    try {
        console.log('ヘッダー読み込み開始');
        const headerContainer = document.getElementById('header-container');
        
        if (!headerContainer) {
            console.warn('header-containerが見つかりません');
            return;
        }

        // 現在のページパスを取得してincludesへの相対パスを決定
        const isManualPage = window.location.pathname.includes('/manual/');
        const headerPath = isManualPage ? '../includes/header.html' : 'includes/header.html';
        
        console.log('ヘッダーパス:', headerPath);
        
        const response = await fetch(headerPath);
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }
        
        const html = await response.text();
        headerContainer.innerHTML = html;
        console.log('ヘッダー読み込み完了');
        
        // ヘッダー読み込み後に言語切り替えを初期化
        initLanguageSelector();
        
        // 保存された言語設定を適用
        const savedLang = localStorage.getItem('selectedLanguage') || 'ja';
        changeLanguage(savedLang);
        
    } catch (error) {
        console.error('ヘッダー読み込みエラー:', error);
    }
}

// ==========================================
// 2. 言語切り替えシステム
// ==========================================

// 翻訳データベース（完全版）
const translations = {
    ja: {
        // ヘッダー
        'site-title': '28 Tools',
        'site-subtitle': 'Revit アドイン配布センター',
        
        // メインページ - 機能カード
        'feature-grid-title': '符号ON/OFF',
        'feature-grid-desc': '通り芯・レベルの符号表示を一括切替',
        'feature-sheet-title': 'シート一括作成',
        'feature-sheet-desc': '図枠を指定して複数シートをまとめて作成',
        'feature-view-title': '3D視点コピペ',
        'feature-view-desc': '3Dビューの視点を他のビューにコピー&ペースト',
        'feature-section-title': '切断ボックスコピペ',
        'feature-section-desc': '3Dビューの切断ボックス範囲をコピー&ペースト',
        'feature-viewport-title': 'ビューポート位置コピペ',
        'feature-viewport-desc': 'シート上のビューポート位置をコピー&ペースト',
        'feature-crop-title': 'トリミング領域コピペ',
        'feature-crop-desc': 'ビューのトリミング領域をコピー&ペースト',
        
        // バージョンセクション
        'version-title': 'Revitバージョンを選択',
        'version-2021': 'Revit 2021',
        'version-2022': 'Revit 2022',
        'version-2023': 'Revit 2023',
        'version-2024': 'Revit 2024',
        'version-2025': 'Revit 2025',
        'version-2026': 'Revit 2026',
        'version-status-available': '利用可能',
        'version-status-development': '開発中',
        'version-status-planned': '計画中',
        
        // ダウンロードボタン
        'download-button': 'ダウンロード',
        
        // フッターリンク
        'footer-install': 'インストール手順',
        'footer-uninstall': 'アンインストール',
        'footer-support': 'サポート情報',
        
        // モーダル
        'modal-install-title': 'インストール手順',
        'modal-uninstall-title': 'アンインストール手順',
        'modal-support-title': 'サポート情報',
        'modal-close': '閉じる',
        
        // マニュアルページ共通
        'breadcrumb-home': 'ホーム',
        'back-to-home': 'ホームに戻る',
        
        // マニュアルセクションタイトル
        'section-overview': '機能概要',
        'section-howto': '使い方',
        'section-usecases': '活用シーン',
        'section-tips': 'Tips',
        'section-notes': '注意事項'
    },
    
    en: {
        // Header
        'site-title': '28 Tools',
        'site-subtitle': 'Revit Add-in Distribution Center',
        
        // Main page - Feature cards
        'feature-grid-title': 'Grid Bubble ON/OFF',
        'feature-grid-desc': 'Toggle grid/level bubble display',
        'feature-sheet-title': 'Batch Sheet Creation',
        'feature-sheet-desc': 'Create multiple sheets with specified title block',
        'feature-view-title': '3D View Copy/Paste',
        'feature-view-desc': 'Copy & paste 3D view orientation',
        'feature-section-title': 'Section Box Copy/Paste',
        'feature-section-desc': 'Copy & paste section box range',
        'feature-viewport-title': 'Viewport Position Copy/Paste',
        'feature-viewport-desc': 'Copy & paste viewport position on sheet',
        'feature-crop-title': 'Crop Region Copy/Paste',
        'feature-crop-desc': 'Copy & paste view crop region',
        
        // Version section
        'version-title': 'Select Revit Version',
        'version-2021': 'Revit 2021',
        'version-2022': 'Revit 2022',
        'version-2023': 'Revit 2023',
        'version-2024': 'Revit 2024',
        'version-2025': 'Revit 2025',
        'version-2026': 'Revit 2026',
        'version-status-available': 'Available',
        'version-status-development': 'In Development',
        'version-status-planned': 'Planned',
        
        // Download button
        'download-button': 'Download',
        
        // Footer links
        'footer-install': 'Installation Guide',
        'footer-uninstall': 'Uninstallation',
        'footer-support': 'Support Information',
        
        // Modal
        'modal-install-title': 'Installation Guide',
        'modal-uninstall-title': 'Uninstallation Guide',
        'modal-support-title': 'Support Information',
        'modal-close': 'Close',
        
        // Manual page common
        'breadcrumb-home': 'Home',
        'back-to-home': 'Back to Home',
        
        // Manual section titles
        'section-overview': 'Overview',
        'section-howto': 'How to Use',
        'section-usecases': 'Use Cases',
        'section-tips': 'Tips',
        'section-notes': 'Notes'
    },
    
    zh: {
        // 页眉
        'site-title': '28 Tools',
        'site-subtitle': 'Revit 插件分发中心',
        
        // 主页 - 功能卡片
        'feature-grid-title': '符号开/关',
        'feature-grid-desc': '批量切换轴网/标高符号显示',
        'feature-sheet-title': '批量创建图纸',
        'feature-sheet-desc': '指定图框批量创建多个图纸',
        'feature-view-title': '3D视点复制粘贴',
        'feature-view-desc': '复制并粘贴3D视图的视点',
        'feature-section-title': '剖面框复制粘贴',
        'feature-section-desc': '复制并粘贴3D视图的剖面框范围',
        'feature-viewport-title': '视口位置复制粘贴',
        'feature-viewport-desc': '复制并粘贴图纸上的视口位置',
        'feature-crop-title': '裁剪区域复制粘贴',
        'feature-crop-desc': '复制并粘贴视图的裁剪区域',
        
        // 版本选择
        'version-title': '选择Revit版本',
        'version-2021': 'Revit 2021',
        'version-2022': 'Revit 2022',
        'version-2023': 'Revit 2023',
        'version-2024': 'Revit 2024',
        'version-2025': 'Revit 2025',
        'version-2026': 'Revit 2026',
        'version-status-available': '可用',
        'version-status-development': '开发中',
        'version-status-planned': '计划中',
        
        // 下载按钮
        'download-button': '下载',
        
        // 页脚链接
        'footer-install': '安装指南',
        'footer-uninstall': '卸载',
        'footer-support': '支持信息',
        
        // 模态框
        'modal-install-title': '安装指南',
        'modal-uninstall-title': '卸载指南',
        'modal-support-title': '支持信息',
        'modal-close': '关闭',
        
        // 手册页面通用
        'breadcrumb-home': '主页',
        'back-to-home': '返回主页',
        
        // 手册部分标题
        'section-overview': '功能概述',
        'section-howto': '使用方法',
        'section-usecases': '应用场景',
        'section-tips': '提示',
        'section-notes': '注意事项'
    }
};

// 言語切り替えボタン初期化
function initLanguageSelector() {
    console.log('言語セレクター初期化開始');
    
    const langButton = document.querySelector('.lang-selector-button');
    const langDropdown = document.querySelector('.lang-dropdown');
    const langOptions = document.querySelectorAll('.lang-option');
    
    if (!langButton || !langDropdown) {
        console.warn('言語セレクター要素が見つかりません');
        return;
    }
    
    console.log('言語セレクター要素発見');
    
    // ドロップダウン表示切替
    langButton.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle('show');
        console.log('ドロップダウン切替:', langDropdown.classList.contains('show'));
    });
    
    // 言語オプションクリック
    langOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedLang = option.dataset.lang;
            console.log('言語選択:', selectedLang);
            
            changeLanguage(selectedLang);
            updateLanguageButton(selectedLang);
            
            langDropdown.classList.remove('show');
        });
    });
    
    // 外側クリックでドロップダウンを閉じる
    document.addEventListener('click', () => {
        langDropdown.classList.remove('show');
    });
    
    console.log('言語セレクター初期化完了');
}

// 言語ボタンの表示更新
function updateLanguageButton(lang) {
    const langButton = document.querySelector('.lang-selector-button');
    if (!langButton) return;
    
    const flagEmojis = {
        'ja': '🇯🇵',
        'en': '🇺🇸',
        'zh': '🇨🇳'
    };
    
    const langNames = {
        'ja': '日本語',
        'en': 'English',
        'zh': '中文'
    };
    
    langButton.innerHTML = `
        <span class="flag">${flagEmojis[lang]}</span>
        <span class="lang-name">${langNames[lang]}</span>
        <span class="arrow">▼</span>
    `;
}

// 言語切り替え実行
function changeLanguage(lang) {
    console.log('言語切り替え実行:', lang);
    
    // すべてのdata-lang属性を持つ要素を取得
    const elements = document.querySelectorAll('[data-lang]');
    console.log('翻訳対象要素数:', elements.length);
    
    elements.forEach(element => {
        const key = element.dataset.lang;
        
        if (translations[lang] && translations[lang][key]) {
            // テキストノードの場合
            if (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
                element.textContent = translations[lang][key];
            } else {
                // 子要素がある場合は最初のテキストノードのみ変更
                const textNode = Array.from(element.childNodes).find(node => node.nodeType === 3);
                if (textNode) {
                    textNode.textContent = translations[lang][key];
                }
            }
            console.log(`翻訳適用: ${key} -> ${translations[lang][key]}`);
        } else {
            console.warn(`翻訳キー未定義: ${lang}.${key}`);
        }
    });
    
    // localStorage に保存
    localStorage.setItem('selectedLanguage', lang);
    console.log('言語設定保存:', lang);
    
    // 言語ボタンの表示更新
    updateLanguageButton(lang);
}

// ==========================================
// 3. モーダル機能（v6.1改善版）
// ==========================================

let currentModal = null;

function openModal(type) {
    console.log('モーダル表示:', type);
    
    // 既存のモーダルを取得または作成
    if (!currentModal) {
        currentModal = createModal();
    }
    
    // コンテンツを更新
    updateModalContent(type);
    
    // モーダルを表示
    currentModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function createModal() {
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById('info-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'info-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modal-title" data-lang="modal-install-title">タイトル</h2>
                <button class="modal-close" id="modal-close-btn">
                    <span data-lang="modal-close">閉じる</span>
                </button>
            </div>
            <div class="modal-body" id="modal-body">
                <!-- コンテンツが動的に挿入されます -->
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // イベントリスナーを設定（一度だけ）
    const closeBtn = modal.querySelector('#modal-close-btn');
    closeBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    return modal;
}

function updateModalContent(type) {
    const modalTitle = currentModal.querySelector('#modal-title');
    const modalBody = currentModal.querySelector('#modal-body');
    const currentLang = localStorage.getItem('selectedLanguage') || 'ja';
    
    // フェード効果
    modalBody.style.opacity = '0';
    
    setTimeout(() => {
        // タイトルのdata-lang属性を更新
        const titleKeys = {
            'install': 'modal-install-title',
            'uninstall': 'modal-uninstall-title',
            'support': 'modal-support-title'
        };
        modalTitle.dataset.lang = titleKeys[type];
        
        // コンテンツを更新
        modalBody.innerHTML = getModalContent(type, currentLang);
        
        // 言語を再適用
        changeLanguage(currentLang);
        
        // フェードイン
        modalBody.style.opacity = '1';
    }, 150);
}

function getModalContent(type, lang) {
    const content = {
        install: {
            ja: `
                <div class="modal-steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>ZIPファイルを解凍</h3>
                            <p>ダウンロードしたZIPファイルを任意の場所に解凍してください。</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>自動インストール実行</h3>
                            <p><code>自動インストール.bat</code>を右クリック→「管理者として実行」してください。</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h3>Revitを起動</h3>
                            <p>Revitを起動すると、リボンに「28 Tools」タブが表示されます。</p>
                        </div>
                    </div>
                </div>
                <div class="modal-note">
                    <strong>注意:</strong> インストールにはRevitの再起動が必要です。
                </div>
            `,
            en: `
                <div class="modal-steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>Extract ZIP file</h3>
                            <p>Extract the downloaded ZIP file to any location.</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>Run Auto Install</h3>
                            <p>Right-click <code>Auto Install.bat</code> → "Run as administrator".</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h3>Start Revit</h3>
                            <p>When you start Revit, the "28 Tools" tab will appear in the ribbon.</p>
                        </div>
                    </div>
                </div>
                <div class="modal-note">
                    <strong>Note:</strong> Revit restart is required for installation.
                </div>
            `,
            zh: `
                <div class="modal-steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>解压ZIP文件</h3>
                            <p>将下载的ZIP文件解压到任意位置。</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>运行自动安装</h3>
                            <p>右键单击<code>自动安装.bat</code>→"以管理员身份运行"。</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h3>启动Revit</h3>
                            <p>启动Revit后,功能区将显示"28 Tools"选项卡。</p>
                        </div>
                    </div>
                </div>
                <div class="modal-note">
                    <strong>注意:</strong> 安装需要重启Revit。
                </div>
            `
        },
        uninstall: {
            ja: `
                <div class="modal-steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>Revitを終了</h3>
                            <p>すべてのRevitウィンドウを閉じてください。</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>アンインストール実行</h3>
                            <p><code>アンインストール.bat</code>を右クリック→「管理者として実行」してください。</p>
                        </div>
                    </div>
                </div>
                <div class="modal-note">
                    <strong>注意:</strong> アンインストール後は設定が削除されます。
                </div>
            `,
            en: `
                <div class="modal-steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>Close Revit</h3>
                            <p>Close all Revit windows.</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>Run Uninstaller</h3>
                            <p>Right-click <code>Uninstall.bat</code> → "Run as administrator".</p>
                        </div>
                    </div>
                </div>
                <div class="modal-note">
                    <strong>Note:</strong> Settings will be deleted after uninstallation.
                </div>
            `,
            zh: `
                <div class="modal-steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h3>关闭Revit</h3>
                            <p>关闭所有Revit窗口。</p>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h3>运行卸载程序</h3>
                            <p>右键单击<code>卸载.bat</code>→"以管理员身份运行"。</p>
                        </div>
                    </div>
                </div>
                <div class="modal-note">
                    <strong>注意:</strong> 卸载后设置将被删除。
                </div>
            `
        },
        support: {
            ja: `
                <div class="modal-info">
                    <h3>動作環境</h3>
                    <ul>
                        <li>対応Revit: 2021～2026</li>
                        <li>対応OS: Windows 10/11 (64bit)</li>
                        <li>.NET Framework: 4.8以上</li>
                    </ul>
                    
                    <h3>問い合わせ</h3>
                    <p>問題が発生した場合は、<code>診断ツール.bat</code>を実行してログを確認してください。</p>
                    
                    <h3>既知の問題</h3>
                    <ul>
                        <li>インストール時に管理者権限が必要です</li>
                        <li>複数バージョンのRevitを同時使用する場合は個別にインストールが必要です</li>
                    </ul>
                </div>
            `,
            en: `
                <div class="modal-info">
                    <h3>System Requirements</h3>
                    <ul>
                        <li>Supported Revit: 2021-2026</li>
                        <li>Supported OS: Windows 10/11 (64bit)</li>
                        <li>.NET Framework: 4.8 or higher</li>
                    </ul>
                    
                    <h3>Support</h3>
                    <p>If you encounter problems, run <code>Diagnostic Tool.bat</code> to check the logs.</p>
                    
                    <h3>Known Issues</h3>
                    <ul>
                        <li>Administrator privileges required for installation</li>
                        <li>Separate installation required for multiple Revit versions</li>
                    </ul>
                </div>
            `,
            zh: `
                <div class="modal-info">
                    <h3>系统要求</h3>
                    <ul>
                        <li>支持的Revit: 2021-2026</li>
                        <li>支持的操作系统: Windows 10/11 (64位)</li>
                        <li>.NET Framework: 4.8或更高版本</li>
                    </ul>
                    
                    <h3>支持</h3>
                    <p>如遇问题,请运行<code>诊断工具.bat</code>检查日志。</p>
                    
                    <h3>已知问题</h3>
                    <ul>
                        <li>安装需要管理员权限</li>
                        <li>使用多个Revit版本需要分别安装</li>
                    </ul>
                </div>
            `
        }
    };
    
    return content[type][lang];
}

function closeModal() {
    if (currentModal) {
        currentModal.style.display = 'none';
        document.body.style.overflow = '';
        console.log('モーダル閉じる');
    }
}

// ==========================================
// 4. バージョン選択機能
// ==========================================

function selectVersion(version) {
    console.log('バージョン選択:', version);
    
    // すべてのバージョンタブから selected クラスを削除
    document.querySelectorAll('.version-tab').forEach(tab => {
        tab.classList.remove('selected');
    });
    
    // 選択されたバージョンタブに selected クラスを追加
    const selectedTab = document.querySelector(`[onclick="selectVersion('${version}')"]`);
    if (selectedTab) {
        selectedTab.classList.add('selected');
    }
    
    // ダウンロードボタンの状態を更新
    updateDownloadButton(version);
}

function updateDownloadButton(version) {
    const downloadBtn = document.querySelector('.download-button');
    if (!downloadBtn) return;
    
    const availableVersions = ['2021', '2022', '2023'];
    
    if (availableVersions.includes(version)) {
        downloadBtn.disabled = false;
        downloadBtn.style.opacity = '1';
        downloadBtn.style.cursor = 'pointer';
    } else {
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.5';
        downloadBtn.style.cursor = 'not-allowed';
    }
}

// ==========================================
// 5. ダウンロード機能（パスワード認証）
// ==========================================

function downloadAddin() {
    const selectedVersion = document.querySelector('.version-tab.selected');
    if (!selectedVersion) {
        alert('Revitバージョンを選択してください');
        return;
    }
    
    const version = selectedVersion.textContent.match(/\d{4}/)[0];
    const password = prompt('ダウンロードパスワードを入力してください:');
    
    // 仮のパスワード認証（実際の運用では変更してください）
    if (password === '28tools2024') {
        // ダウンロード処理（実際のファイルがdownloadsフォルダに配置されたら有効化）
        // window.location.href = `downloads/28Tools_Revit${version}_v1.0.zip`;
        alert(`Revit ${version}版のダウンロードを開始します\n（ファイル準備中）`);
    } else {
        alert('パスワードが正しくありません');
    }
}

// ==========================================
// 6. マニュアルページ用機能
// ==========================================

function addHomeLink() {
    const manualContainer = document.querySelector('.manual-container');
    if (!manualContainer) return;
    
    // ホームリンクボタンを追加
    const backButton = document.createElement('a');
    backButton.href = '../index.html';
    backButton.className = 'back-to-home-button';
    backButton.innerHTML = '<span data-lang="back-to-home">ホームに戻る</span>';
    
    manualContainer.appendChild(backButton);
}

// タイトルクリックでホームに戻る
function addTitleHomeLink() {
    const title = document.querySelector('.main-title');
    if (title && document.body.classList.contains('manual-page')) {
        title.style.cursor = 'pointer';
        title.addEventListener('click', () => {
            window.location.href = '../index.html';
        });
    }
}

// ==========================================
// 7. 初期化処理
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded - 初期化開始');
    
    // ヘッダー読み込み
    await loadHeader();
    
    // マニュアルページの場合
    if (document.body.classList.contains('manual-page')) {
        addHomeLink();
        addTitleHomeLink();
    }
    
    // フッターリンクにイベントリスナーを追加
    const footerLinks = document.querySelectorAll('.footer-link');
    footerLinks.forEach(link => {
        const type = link.dataset.modal;
        if (type) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(type);
            });
        }
    });
    
    console.log('初期化完了');
});

// Escキーでモーダルを閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentModal && currentModal.style.display === 'flex') {
        closeModal();
    }
});
