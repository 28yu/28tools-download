// 言語切り替え機能（国旗絵文字版）
let currentLanguage = 'ja';

// バージョン別パスワード設定
const passwords = {
    '2021': 'tools2021',
    '2022': 'tools2022',
    '2023': 'tools2023',
    '2024': 'tools2024',
    '2025': 'tools2025',
    '2026': 'tools2026'
};

// 言語テキスト定義
const languageTexts = {
    ja: {
        mainTitle: '28 Tools',
        subtitle: 'Revit アドイン配布センター',
        featuresTitle: '機能一覧',
        versionTitle: 'REVITバージョンを選択',
        statusAvailable: 'ダウンロード可能',
        statusDevelopment: '開発中',
        statusPlanned: '開発予定',
        installGuide: 'インストールガイド',
        uninstallGuide: 'アンインストール',
        supportInfo: 'サポート情報',
        gridBubble: {
            title: '符号ON/OFF',
            description: '通り芯・レベルの符号表示をON/OFF'
        },
        sheetCreation: {
            title: 'シート一括作成',
            description: '図枠を指定して複数シートをまとめて作成'
        },
        viewCopy: {
            title: '3D視点コピペ',
            description: '3Dビューの視点を他のビューにコピー&ペースト'
        },
        sectionboxCopy: {
            title: '切断ボックスコピペ',
            description: '3Dビューの切断ボックス範囲をコピー&ペースト'
        },
        viewportPosition: {
            title: 'ビューポート位置コピペ',
            description: 'シート上のビューポート位置をコピー&ペースト'
        },
        cropboxCopy: {
            title: 'トリミング領域コピペ',
            description: 'ビューのトリミング領域をコピー&ペースト'
        }
    },
    en: {
        mainTitle: '28 Tools',
        subtitle: 'Revit Add-in Distribution Center',
        featuresTitle: 'Features',
        versionTitle: 'Select REVIT Version',
        statusAvailable: 'Available',
        statusDevelopment: 'In Development',
        statusPlanned: 'Planned',
        installGuide: 'Installation Guide',
        uninstallGuide: 'Uninstallation',
        supportInfo: 'Support Information',
        gridBubble: {
            title: 'Grid Bubble Toggle',
            description: 'Toggle grid and level bubble display ON/OFF'
        },
        sheetCreation: {
            title: 'Bulk Sheet Creation',
            description: 'Create multiple sheets with specified titleblocks'
        },
        viewCopy: {
            title: '3D View Copy/Paste',
            description: 'Copy and paste 3D view orientation to other views'
        },
        sectionboxCopy: {
            title: 'Section Box Copy/Paste',
            description: 'Copy and paste 3D view section box range'
        },
        viewportPosition: {
            title: 'Viewport Position Copy/Paste',
            description: 'Copy and paste viewport positions on sheets'
        },
        cropboxCopy: {
            title: 'Crop Box Copy/Paste',
            description: 'Copy and paste view crop regions'
        }
    },
    zh: {
        mainTitle: '28 Tools',
        subtitle: 'Revit 插件分发中心',
        featuresTitle: '功能列表',
        versionTitle: '选择REVIT版本',
        statusAvailable: '可用',
        statusDevelopment: '开发中',
        statusPlanned: '计划中',
        installGuide: '安装指南',
        uninstallGuide: '卸载',
        supportInfo: '支持信息',
        gridBubble: {
            title: '符号开关',
            description: '切换网格和标高符号显示开/关'
        },
        sheetCreation: {
            title: '批量创建图纸',
            description: '指定图框批量创建多个图纸'
        },
        viewCopy: {
            title: '3D视图复制粘贴',
            description: '将3D视图方向复制粘贴到其他视图'
        },
        sectionboxCopy: {
            title: '剖切框复制粘贴',
            description: '复制粘贴3D视图剖切框范围'
        },
        viewportPosition: {
            title: '视口位置复制粘贴',
            description: '复制粘贴图纸上的视口位置'
        },
        cropboxCopy: {
            title: '裁剪区域复制粘贴',
            description: '复制粘贴视图的裁剪区域'
        }
    }
};

// モーダルコンテンツ定義
const modalContents = {
    install: {
        ja: {
            title: 'インストールガイド',
            content: `
                <h3>自動インストール（推奨）</h3>
                <ol>
                    <li>ダウンロードしたZIPファイルを解凍</li>
                    <li>「自動インストール.bat」を右クリック</li>
                    <li>「管理者として実行」を選択</li>
                    <li>Revitを再起動</li>
                </ol>
                
                <h3>手動インストール</h3>
                <ol>
                    <li>以下のフォルダにファイルをコピー：<br>
                    <code>C:\\ProgramData\\Autodesk\\Revit\\Addins\\20XX\\</code></li>
                    <li>Tools28.dll と Tools28.addin をコピー</li>
                    <li>Revitを再起動</li>
                </ol>
                
                <div class="note">
                    <strong>💡 ポイント:</strong> 管理者権限が必要です。インストール後は28 Toolsタブが表示されます。
                </div>
            `
        },
        en: {
            title: 'Installation Guide',
            content: `
                <h3>Automatic Installation (Recommended)</h3>
                <ol>
                    <li>Extract the downloaded ZIP file</li>
                    <li>Right-click "自動インストール.bat"</li>
                    <li>Select "Run as administrator"</li>
                    <li>Restart Revit</li>
                </ol>
                
                <h3>Manual Installation</h3>
                <ol>
                    <li>Copy files to the following folder:<br>
                    <code>C:\\ProgramData\\Autodesk\\Revit\\Addins\\20XX\\</code></li>
                    <li>Copy Tools28.dll and Tools28.addin</li>
                    <li>Restart Revit</li>
                </ol>
                
                <div class="note">
                    <strong>💡 Tips:</strong> Administrator privileges required. The 28 Tools tab will appear after installation.
                </div>
            `
        },
        zh: {
            title: '安装指南',
            content: `
                <h3>自动安装（推荐）</h3>
                <ol>
                    <li>解压下载的ZIP文件</li>
                    <li>右键点击"自動インストール.bat"</li>
                    <li>选择"以管理员身份运行"</li>
                    <li>重启Revit</li>
                </ol>
                
                <h3>手动安装</h3>
                <ol>
                    <li>将文件复制到以下文件夹：<br>
                    <code>C:\\ProgramData\\Autodesk\\Revit\\Addins\\20XX\\</code></li>
                    <li>复制Tools28.dll和Tools28.addin</li>
                    <li>重启Revit</li>
                </ol>
                
                <div class="note">
                    <strong>💡 提示:</strong> 需要管理员权限。安装后将显示28 Tools选项卡。
                </div>
            `
        }
    },
    uninstall: {
        ja: {
            title: 'アンインストールガイド',
            content: `
                <h3>自動アンインストール（推奨）</h3>
                <ol>
                    <li>「アンインストール.bat」を右クリック</li>
                    <li>「管理者として実行」を選択</li>
                    <li>Revitを再起動</li>
                </ol>
                
                <h3>手動アンインストール</h3>
                <ol>
                    <li>以下のファイルを削除：<br>
                    <code>C:\\ProgramData\\Autodesk\\Revit\\Addins\\20XX\\Tools28.dll</code><br>
                    <code>C:\\ProgramData\\Autodesk\\Revit\\Addins\\20XX\\Tools28.addin</code></li>
                    <li>Revitを再起動</li>
                </ol>
                
                <div class="warning">
                    <strong>⚠️ 注意:</strong> アンインストール後は28 Toolsタブが表示されなくなります。
                </div>
            `
        },
        en: {
            title: 'Uninstallation Guide',
            content: `
                <h3>Automatic Uninstallation (Recommended)</h3>
                <ol>
                    <li>Right-click "アンインストール.bat"</li>
                    <li>Select "Run as administrator"</li>
                    <li>Restart Revit</li>
                </ol>
                
                <h3>Manual Uninstallation</h3>
                <ol>
                    <li>Delete the following files:<br>
                    <code>C:\\ProgramData\\Autodesk\\Revit\\Addins\\20XX\\Tools28.dll</code><br>
                    <code>C:\\ProgramData\\Autodesk\\Revit\\Addins\\20XX\\Tools28.addin</code></li>
                    <li>Restart Revit</li>
                </ol>
                
                <div class="warning">
                    <strong>⚠️ Warning:</strong> The 28 Tools tab will disappear after uninstallation.
                </div>
            `
        },
        zh: {
            title: '卸载指南',
            content: `
                <h3>自动卸载（推荐）</h3>
                <ol>
                    <li>右键点击"アンインストール.bat"</li>
                    <li>选择"以管理员身份运行"</li>
                    <li>重启Revit</li>
                </ol>
                
                <h3>手动卸载</h3>
                <ol>
                    <li>删除以下文件：<br>
                    <code>C:\\ProgramData\\Autodesk\\Revit\\Addins\\20XX\\Tools28.dll</code><br>
                    <code>C:\\ProgramData\\Autodesk\\Revit\\Addins\\20XX\\Tools28.addin</code></li>
                    <li>重启Revit</li>
                </ol>
                
                <div class="warning">
                    <strong>⚠️ 警告:</strong> 卸载后28 Tools选项卡将消失。
                </div>
            `
        }
    },
    support: {
        ja: {
            title: 'サポート情報',
            content: `
                <h3>よくある質問</h3>
                <p><strong>Q: アドインが表示されない</strong><br>
                A: 管理者権限でインストールされているか確認してください。</p>
                
                <p><strong>Q: エラーが発生する</strong><br>
                A: 対応するRevitバージョンを使用しているか確認してください。</p>
                
                <p><strong>Q: 機能が動作しない</strong><br>
                A: Revitを再起動してから再度お試しください。</p>
                
                <h3>システム要件</h3>
                <ul>
                    <li>Autodesk Revit 2021-2026</li>
                    <li>.NET Framework 4.8以上</li>
                    <li>Windows 10/11</li>
                    <li>管理者権限</li>
                </ul>
                
                <div class="note">
                    <strong>💡 ヒント:</strong> 問題が解決しない場合は、診断ツール.batを実行してください。
                </div>
            `
        },
        en: {
            title: 'Support Information',
            content: `
                <h3>Frequently Asked Questions</h3>
                <p><strong>Q: Add-in not showing</strong><br>
                A: Please check if it's installed with administrator privileges.</p>
                
                <p><strong>Q: Errors occur</strong><br>
                A: Please verify you're using a compatible Revit version.</p>
                
                <p><strong>Q: Functions not working</strong><br>
                A: Please restart Revit and try again.</p>
                
                <h3>System Requirements</h3>
                <ul>
                    <li>Autodesk Revit 2021-2026</li>
                    <li>.NET Framework 4.8 or higher</li>
                    <li>Windows 10/11</li>
                    <li>Administrator privileges</li>
                </ul>
                
                <div class="note">
                    <strong>💡 Tips:</strong> If issues persist, run the diagnostic tool.
                </div>
            `
        },
        zh: {
            title: '支持信息',
            content: `
                <h3>常见问题</h3>
                <p><strong>Q: 插件未显示</strong><br>
                A: 请检查是否以管理员权限安装。</p>
                
                <p><strong>Q: 出现错误</strong><br>
                A: 请确认使用的是兼容的Revit版本。</p>
                
                <p><strong>Q: 功能无法使用</strong><br>
                A: 请重启Revit后重试。</p>
                
                <h3>系统要求</h3>
                <ul>
                    <li>Autodesk Revit 2021-2026</li>
                    <li>.NET Framework 4.8或更高版本</li>
                    <li>Windows 10/11</li>
                    <li>管理员权限</li>
                </ul>
                
                <div class="note">
                    <strong>💡 提示:</strong> 如果问题仍然存在，请运行诊断工具。
                </div>
            `
        }
    }
};

// 言語名と国旗の対応
const languageInfo = {
    ja: { name: '🇯🇵 日本語', flag: '🇯🇵' },
    en: { name: '🇺🇸 English', flag: '🇺🇸' },
    zh: { name: '🇨🇳 中文', flag: '🇨🇳' }
};

// バージョン選択関数
function selectVersion(version, status) {
    // アクティブ状態の更新
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.tab').classList.add('active');
    
    // ダウンロード処理（開発予定以外）
    if (status !== 'planned') {
        downloadWithAuth(version);
    } else {
        alert(
            currentLanguage === 'ja' ? 'このバージョンは開発予定です。' :
            currentLanguage === 'en' ? 'This version is planned for future development.' :
            '此版本计划中。'
        );
    }
}

// パスワード認証付きダウンロード
function downloadWithAuth(version) {
    const password = prompt(
        currentLanguage === 'ja' ? 'パスワードを入力してください:' :
        currentLanguage === 'en' ? 'Please enter password:' :
        '请输入密码:'
    );
    
    if (password === passwords[version]) {
        // Google Analytics記録（実装時に有効化）
        // gtag('event', 'download', {'version': version});
        
        // ダウンロード実行（実装時に有効化）
        // window.location.href = `downloads/revit${version}.zip`;
        
        alert(
            currentLanguage === 'ja' ? `Revit ${version}版のダウンロードを開始します。` :
            currentLanguage === 'en' ? `Starting download for Revit ${version}.` :
            `开始下载 Revit ${version} 版本。`
        );
    } else {
        alert(
            currentLanguage === 'ja' ? 'パスワードが間違っています。' :
            currentLanguage === 'en' ? 'Incorrect password.' :
            '密码错误。'
        );
    }
}

// モーダル表示関数
function showModal(type) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    const content = modalContents[type][currentLanguage];
    modalTitle.textContent = content.title;
    modalBody.innerHTML = content.content;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // スクロール無効化
}

// モーダル閉じる関数
function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // スクロール有効化
}

// 言語切り替え関数
function switchLanguage(lang) {
    currentLanguage = lang;
    
    // ローカルストレージに保存
    localStorage.setItem('28tools-language', lang);
    
    // テキストを更新
    updateTexts();
    
    // ドロップダウンを閉じる
    toggleLanguageMenu(false);
    
    // アクティブ状態を更新
    updateActiveLanguage();
    
    // ボタンの表示を更新
    updateLanguageButton();
}

// テキスト更新関数
function updateTexts() {
    const texts = languageTexts[currentLanguage];
    
    document.querySelectorAll('[data-lang]').forEach(element => {
        const key = element.getAttribute('data-lang');
        const keys = key.split('.');
        let value = texts;
        
        for (const k of keys) {
            value = value[k];
            if (!value) break;
        }
        
        if (value) {
            element.textContent = value;
        }
    });
}

// 言語ボタンの表示更新
function updateLanguageButton() {
    const info = languageInfo[currentLanguage];
    document.querySelector('.lang-flag').textContent = info.flag;
    document.querySelector('.lang-text').textContent = info.name.split(' ')[1]; // 国旗絵文字を除いた言語名
}

// ドロップダウン切り替え
function toggleLanguageMenu(show = null) {
    const menu = document.getElementById('langMenu');
    const btn = document.querySelector('.lang-btn');
    
    if (show === null) {
        show = !menu.classList.contains('show');
    }
    
    if (show) {
        menu.classList.add('show');
        btn.classList.add('open');
    } else {
        menu.classList.remove('show');
        btn.classList.remove('open');
    }
}

// アクティブ言語の更新
function updateActiveLanguage() {
    document.querySelectorAll('.lang-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const activeOption = document.querySelector(`[onclick="switchLanguage('${currentLanguage}')"]`);
    if (activeOption) {
        activeOption.classList.add('active');
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    // 保存された言語を読み込み
    const savedLang = localStorage.getItem('28tools-language');
    if (savedLang && languageTexts[savedLang]) {
        currentLanguage = savedLang;
    }
    
    // 初期表示を設定
    updateTexts();
    updateActiveLanguage();
    updateLanguageButton();
    
    // 外部クリックでメニューを閉じる
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.language-switcher')) {
            toggleLanguageMenu(false);
        }
    });
    
    // モーダル外クリックで閉じる
    document.getElementById('modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});
