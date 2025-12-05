// 28 Tools 配布サイト - メインJavaScript（マニュアルページ対応版）

// 言語情報
const languageInfo = {
    ja: { name: '🇯🇵 日本語', flag: '🇯🇵' },
    en: { name: '🇺🇸 English', flag: '🇺🇸' },
    zh: { name: '🇨🇳 中文', flag: '🇨🇳' }
};

// 翻訳データ
const translations = {
    ja: {
        // 共通要素
        'site-title': '28 Tools',
        'site-subtitle': 'Revit アドイン配布センター',
        
        // メインページ専用
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
        
        // マニュアルページ専用
        'breadcrumb-home': 'ホーム',
        'breadcrumb-current': '符号ON/OFF',
        'function-title': '符号ON/OFF',
        'function-description': '通り芯・レベルの符号表示をワンクリックで一括ON/OFF切り替え',
        'overview-title': '機能概要',
        'overview-text': 'この機能は、現在アクティブなビュー内のすべての通り芯（グリッド）とレベルの符号表示を一括で切り替えることができます。大量の通り芯やレベルがあるプロジェクトで、図面の見やすさを調整する際に非常に便利です。',
        'features-title-manual': '主な特徴',
        'feature-1': 'ワンクリックで全ての通り芯・レベル符号を一括切り替え',
        'feature-2': '現在のアクティブビューのみに適用',
        'feature-3': '平面図、断面図、立面図すべてに対応',
        'feature-4': '元に戻す（Undo）機能で安全に操作可能',
        'usage-title': '使用方法',
        'step1-title': 'ビューを開く',
        'step1-text': '符号表示を変更したいビュー（平面図、断面図、立面図など）を開きます。',
        'step2-title': '28 Toolsを起動',
        'step2-text': 'Revitのアドインタブから「28 Tools」パネルを開きます。',
        'step3-title': '符号ON/OFFをクリック',
        'step3-text': '「符号ON/OFF」ボタンをクリックすると、現在のビュー内のすべての通り芯・レベル符号の表示が切り替わります。',
        'step4-title': '結果を確認',
        'step4-text': '符号が表示されていた場合は非表示に、非表示だった場合は表示に切り替わります。',
        'notes-title': '注意事項',
        'warning-title': '⚠️ 重要な注意点',
        'warning-1': 'この機能は現在アクティブなビューのみに適用されます',
        'warning-2': '他のビューの符号表示には影響しません',
        'warning-3': '3Dビューでは通り芯・レベルの符号表示設定が異なる場合があります',
        'tips-title': '💡 使用のコツ',
        'tip-1': '印刷用の図面では符号を非表示にして見やすくする',
        'tip-2': '作業中は符号を表示して位置関係を把握しやすくする',
        'tip-3': '間違えて切り替えた場合は Ctrl+Z で元に戻せます',
        'back-home': '← ホームに戻る',
        'footer-text': '© 2024 28 Tools. All rights reserved.'
    },
    
    en: {
        // 共通要素
        'site-title': '28 Tools',
        'site-subtitle': 'Revit Add-in Distribution Center',
        
        // メインページ専用
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
        
        // マニュアルページ専用
        'breadcrumb-home': 'Home',
        'breadcrumb-current': 'Grid Bubble ON/OFF',
        'function-title': 'Grid Bubble ON/OFF',
        'function-description': 'Toggle grid and level bubble display with one click',
        'overview-title': 'Function Overview',
        'overview-text': 'This function allows you to toggle the bubble display of all grids and levels in the currently active view at once. It is very useful for adjusting drawing visibility in projects with many grids and levels.',
        'features-title-manual': 'Key Features',
        'feature-1': 'Toggle all grid and level bubbles with one click',
        'feature-2': 'Applies only to the currently active view',
        'feature-3': 'Compatible with plan, section, and elevation views',
        'feature-4': 'Safe operation with Undo functionality',
        'usage-title': 'How to Use',
        'step1-title': 'Open View',
        'step1-text': 'Open the view (plan, section, elevation, etc.) where you want to change bubble display.',
        'step2-title': 'Launch 28 Tools',
        'step2-text': 'Open the "28 Tools" panel from the Add-ins tab in Revit.',
        'step3-title': 'Click Grid Bubble ON/OFF',
        'step3-text': 'Click the "Grid Bubble ON/OFF" button to toggle the display of all grid and level bubbles in the current view.',
        'step4-title': 'Check Results',
        'step4-text': 'Visible bubbles will be hidden, and hidden bubbles will be displayed.',
        'notes-title': 'Important Notes',
        'warning-title': '⚠️ Important Points',
        'warning-1': 'This function applies only to the currently active view',
        'warning-2': 'Does not affect bubble display in other views',
        'warning-3': '3D views may have different grid and level bubble display settings',
        'tips-title': '💡 Usage Tips',
        'tip-1': 'Hide bubbles in print drawings for better visibility',
        'tip-2': 'Show bubbles during work to understand spatial relationships',
        'tip-3': 'Use Ctrl+Z to undo if toggled by mistake',
        'back-home': '← Back to Home',
        'footer-text': '© 2024 28 Tools. All rights reserved.'
    },
    
    zh: {
        // 共通要素
        'site-title': '28 Tools',
        'site-subtitle': 'Revit 插件分发中心',
        
        // メインページ専用
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
        
        // マニュアルページ専用
        'breadcrumb-home': '首页',
        'breadcrumb-current': '符号开关',
        'function-title': '符号开关',
        'function-description': '一键切换轴网和标高符号显示',
        'overview-title': '功能概述',
        'overview-text': '此功能可以一次性切换当前活动视图中所有轴网和标高的符号显示。在有大量轴网和标高的项目中，调整图纸可见性时非常有用。',
        'features-title-manual': '主要特点',
        'feature-1': '一键切换所有轴网和标高符号',
        'feature-2': '仅适用于当前活动视图',
        'feature-3': '兼容平面图、剖面图和立面图',
        'feature-4': '支持撤销功能，操作安全',
        'usage-title': '使用方法',
        'step1-title': '打开视图',
        'step1-text': '打开要更改符号显示的视图（平面图、剖面图、立面图等）。',
        'step2-title': '启动28 Tools',
        'step2-text': '从Revit的加载项选项卡中打开"28 Tools"面板。',
        'step3-title': '点击符号开关',
        'step3-text': '点击"符号开关"按钮，当前视图中所有轴网和标高符号的显示将被切换。',
        'step4-title': '检查结果',
        'step4-text': '显示的符号将被隐藏，隐藏的符号将被显示。',
        'notes-title': '注意事项',
        'warning-title': '⚠️ 重要提示',
        'warning-1': '此功能仅适用于当前活动视图',
        'warning-2': '不会影响其他视图中的符号显示',
        'warning-3': '三维视图中的轴网和标高符号显示设置可能不同',
        'tips-title': '💡 使用技巧',
        'tip-1': '在打印图纸中隐藏符号以提高可见性',
        'tip-2': '工作时显示符号以了解空间关系',
        'tip-3': '如果误操作可使用Ctrl+Z撤销',
        'back-home': '← 返回首页',
        'footer-text': '© 2024 28 Tools. 版权所有。'
    }
};

// 言語更新機能
function updateLanguage(lang) {
    console.log('Updating language to:', lang);
    
    // 現在の言語表示を更新（要素の存在確認）
    const currentLanguage = document.getElementById('currentLanguage');
    if (currentLanguage && languageInfo[lang]) {
        currentLanguage.textContent = languageInfo[lang].name;
    }

    // 翻訳を適用（要素の存在確認を追加）
    const elements = document.querySelectorAll('[data-lang]');
    elements.forEach(element => {
        const key = element.getAttribute('data-lang');
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });

    // ローカルストレージに保存
    localStorage.setItem('selectedLanguage', lang);
}

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

// モーダル表示機能
function showModal(type) {
    const currentLang = localStorage.getItem('selectedLanguage') || 'ja';
    const content = modalContents[type][currentLang];
    
    if (!content) return;
    
    // モーダル要素を作成
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
    
    // アニメーション用のクラス追加
    setTimeout(() => modal.classList.add('show'), 10);
    
    // 閉じるボタンのイベント
    const closeBtn = modal.querySelector('.modal-close');
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => document.body.removeChild(modal), 300);
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

// DOMContentLoaded イベントリスナー
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js loaded');

    // 言語切り替えボタンの設定（要素の存在確認）
    const languageBtn = document.getElementById('languageBtn');
    const languageDropdown = document.getElementById('languageDropdown');

    if (languageBtn && languageDropdown) {
        // 言語切り替えボタンクリック
        languageBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            languageDropdown.classList.toggle('show');
        });

        // ドロップダウン外クリックで閉じる
        document.addEventListener('click', function() {
            languageDropdown.classList.remove('show');
        });

        // 言語選択
        const languageOptions = document.querySelectorAll('.language-option');
        languageOptions.forEach(option => {
            option.addEventListener('click', function() {
                const lang = this.getAttribute('data-lang');
                updateLanguage(lang);
                languageDropdown.classList.remove('show');
            });
        });
    }

    // バージョンタブの設定（メインページのみ）
    const versionTabs = document.querySelectorAll('.version-tab');
    if (versionTabs.length > 0) {
        versionTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const version = this.getAttribute('data-version');
                const status = this.getAttribute('data-status');
                
                if (status === 'disabled') {
                    alert(`Revit ${version}版は開発予定です。`);
                    return;
                }
                
                const inputPassword = prompt(`Revit ${version}版のパスワードを入力してください:`);
                
                if (inputPassword === passwords[version]) {
                    alert(`Revit ${version}版のダウンロードを開始します。`);
                    // 実際のダウンロード処理をここに実装
                } else if (inputPassword !== null) {
                    alert('パスワードが正しくありません。');
                }
            });
        });
    }

    // フッターリンクの設定（メインページのみ）
    const footerLinks = document.querySelectorAll('.footer-link');
    if (footerLinks.length > 0) {
        footerLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const type = this.getAttribute('data-type');
                showModal(type);
            });
        });
    }

    // 初期言語設定
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'ja';
    updateLanguage(savedLanguage);
});

// グローバルに公開
window.updateLanguage = updateLanguage;
window.showModal = showModal;
