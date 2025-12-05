// マニュアルページ専用の多言語対応
const manualTranslations = {
    ja: {
        // 共通（メインサイトと同じ）
        'site-title': '28 Tools',
        'site-subtitle': 'Revit アドイン配布センター',
        
        // パンくず
        'breadcrumb-home': 'ホーム',
        'breadcrumb-current': '符号ON/OFF',
        
        // 機能ヘッダー
        'function-title': '符号ON/OFF',
        'function-description': '通り芯・レベルの符号表示をワンクリックで一括ON/OFF切り替え',
        
        // 機能概要
        'overview-title': '機能概要',
        'overview-text': 'この機能は、現在アクティブなビュー内のすべての通り芯（グリッド）とレベルの符号表示を一括で切り替えることができます。大量の通り芯やレベルがあるプロジェクトで、図面の見やすさを調整する際に非常に便利です。',
        'features-title': '主な特徴',
        'feature-1': 'ワンクリックで全ての通り芯・レベル符号を一括切り替え',
        'feature-2': '現在のアクティブビューのみに適用',
        'feature-3': '平面図、断面図、立面図すべてに対応',
        'feature-4': '元に戻す（Undo）機能で安全に操作可能',
        
        // 使用方法
        'usage-title': '使用方法',
        'step1-title': 'ビューを開く',
        'step1-text': '符号表示を変更したいビュー（平面図、断面図、立面図など）を開きます。',
        'step2-title': '28 Toolsを起動',
        'step2-text': 'Revitのアドインタブから「28 Tools」パネルを開きます。',
        'step3-title': '符号ON/OFFをクリック',
        'step3-text': '「符号ON/OFF」ボタンをクリックすると、現在のビュー内のすべての通り芯・レベル符号の表示が切り替わります。',
        'step4-title': '結果を確認',
        'step4-text': '符号が表示されていた場合は非表示に、非表示だった場合は表示に切り替わります。',
        
        // 注意事項
        'notes-title': '注意事項',
        'warning-title': '⚠️ 重要な注意点',
        'warning-1': 'この機能は現在アクティブなビューのみに適用されます',
        'warning-2': '他のビューの符号表示には影響しません',
        'warning-3': '3Dビューでは通り芯・レベルの符号表示設定が異なる場合があります',
        'tips-title': '💡 使用のコツ',
        'tip-1': '印刷用の図面では符号を非表示にして見やすくする',
        'tip-2': '作業中は符号を表示して位置関係を把握しやすくする',
        'tip-3': '間違えて切り替えた場合は Ctrl+Z で元に戻せます',
        
        // 戻るボタン
        'back-home': '← ホームに戻る',
        
        // フッター
        'footer-text': '© 2024 28 Tools. All rights reserved.'
    },
    
    en: {
        // 共通
        'site-title': '28 Tools',
        'site-subtitle': 'Revit Add-in Distribution Center',
        
        // Breadcrumb
        'breadcrumb-home': 'Home',
        'breadcrumb-current': 'Grid Bubble ON/OFF',
        
        // Function header
        'function-title': 'Grid Bubble ON/OFF',
        'function-description': 'Toggle grid and level bubble display with one click',
        
        // Overview
        'overview-title': 'Function Overview',
        'overview-text': 'This function allows you to toggle the bubble display of all grids and levels in the currently active view at once. It is very useful for adjusting drawing visibility in projects with many grids and levels.',
        'features-title': 'Key Features',
        'feature-1': 'Toggle all grid and level bubbles with one click',
        'feature-2': 'Applies only to the currently active view',
        'feature-3': 'Compatible with plan, section, and elevation views',
        'feature-4': 'Safe operation with Undo functionality',
        
        // Usage
        'usage-title': 'How to Use',
        'step1-title': 'Open View',
        'step1-text': 'Open the view (plan, section, elevation, etc.) where you want to change bubble display.',
        'step2-title': 'Launch 28 Tools',
        'step2-text': 'Open the "28 Tools" panel from the Add-ins tab in Revit.',
        'step3-title': 'Click Grid Bubble ON/OFF',
        'step3-text': 'Click the "Grid Bubble ON/OFF" button to toggle the display of all grid and level bubbles in the current view.',
        'step4-title': 'Check Results',
        'step4-text': 'Visible bubbles will be hidden, and hidden bubbles will be displayed.',
        
        // Notes
        'notes-title': 'Important Notes',
        'warning-title': '⚠️ Important Points',
        'warning-1': 'This function applies only to the currently active view',
        'warning-2': 'Does not affect bubble display in other views',
        'warning-3': '3D views may have different grid and level bubble display settings',
        'tips-title': '💡 Usage Tips',
        'tip-1': 'Hide bubbles in print drawings for better visibility',
        'tip-2': 'Show bubbles during work to understand spatial relationships',
        'tip-3': 'Use Ctrl+Z to undo if toggled by mistake',
        
        // Back button
        'back-home': '← Back to Home',
        
        // Footer
        'footer-text': '© 2024 28 Tools. All rights reserved.'
    },
    
    zh: {
        // 共通
        'site-title': '28 Tools',
        'site-subtitle': 'Revit 插件分发中心',
        
        // 面包屑导航
        'breadcrumb-home': '首页',
        'breadcrumb-current': '符号开关',
        
        // 功能标题
        'function-title': '符号开关',
        'function-description': '一键切换轴网和标高符号显示',
        
        // 功能概述
        'overview-title': '功能概述',
        'overview-text': '此功能可以一次性切换当前活动视图中所有轴网和标高的符号显示。在有大量轴网和标高的项目中，调整图纸可见性时非常有用。',
        'features-title': '主要特点',
        'feature-1': '一键切换所有轴网和标高符号',
        'feature-2': '仅适用于当前活动视图',
        'feature-3': '兼容平面图、剖面图和立面图',
        'feature-4': '支持撤销功能，操作安全',
        
        // 使用方法
        'usage-title': '使用方法',
        'step1-title': '打开视图',
        'step1-text': '打开要更改符号显示的视图（平面图、剖面图、立面图等）。',
        'step2-title': '启动28 Tools',
        'step2-text': '从Revit的加载项选项卡中打开"28 Tools"面板。',
        'step3-title': '点击符号开关',
        'step3-text': '点击"符号开关"按钮，当前视图中所有轴网和标高符号的显示将被切换。',
        'step4-title': '检查结果',
        'step4-text': '显示的符号将被隐藏，隐藏的符号将被显示。',
        
        // 注意事项
        'notes-title': '注意事项',
        'warning-title': '⚠️ 重要提示',
        'warning-1': '此功能仅适用于当前活动视图',
        'warning-2': '不会影响其他视图中的符号显示',
        'warning-3': '三维视图中的轴网和标高符号显示设置可能不同',
        'tips-title': '💡 使用技巧',
        'tip-1': '在打印图纸中隐藏符号以提高可见性',
        'tip-2': '工作时显示符号以了解空间关系',
        'tip-3': '如果误操作可使用Ctrl+Z撤销',
        
        // 返回按钮
        'back-home': '← 返回首页',
        
        // 页脚
        'footer-text': '© 2024 28 Tools. 版权所有。'
    }
};

// マニュアルページの言語切り替え機能
document.addEventListener('DOMContentLoaded', function() {
    // メインサイトの言語切り替え機能を待つ
    setTimeout(function() {
        // 既存のupdateLanguage関数を拡張
        const originalUpdateLanguage = window.updateLanguage;
        
        window.updateLanguage = function(lang) {
            // 元の関数を実行（ヘッダー・言語切り替え部分）
            if (originalUpdateLanguage) {
                originalUpdateLanguage(lang);
            }
            
            // マニュアル専用の翻訳を適用
            const elements = document.querySelectorAll('[data-lang]');
            elements.forEach(element => {
                const key = element.getAttribute('data-lang');
                if (manualTranslations[lang] && manualTranslations[lang][key]) {
                    element.textContent = manualTranslations[lang][key];
                }
            });
        };
        
        // 初期化時に現在の言語を適用
        const currentLang = localStorage.getItem('selectedLanguage') || 'ja';
        window.updateLanguage(currentLang);
    }, 100);
});
