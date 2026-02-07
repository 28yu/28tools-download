/* ==============================
   BIM業界ニュースページ - JavaScript
   ============================== */

// グローバル変数
let allNewsData = [];
let currentCategory = 'all';

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    loadNewsData();
    setupCategoryFilter();
});

// ニュースデータの読み込み
async function loadNewsData() {
    const newsContainer = document.getElementById('news-container');
    const errorMessage = document.getElementById('error-message');
    const lastUpdateTime = document.getElementById('last-update-time');

    try {
        // data/news.json からデータを取得
        const response = await fetch('data/news.json');

        if (!response.ok) {
            throw new Error('Failed to fetch news data');
        }

        const data = await response.json();
        allNewsData = data.articles || [];

        // 最終更新日時を表示
        if (data.lastUpdated) {
            lastUpdateTime.textContent = formatDate(data.lastUpdated);
        } else {
            lastUpdateTime.textContent = '不明';
        }

        // ニュースカードを表示
        renderNewsCards(allNewsData);

    } catch (error) {
        console.error('Error loading news:', error);
        newsContainer.style.display = 'none';
        errorMessage.style.display = 'block';
    }
}

// ニュースカードのレンダリング
function renderNewsCards(articles) {
    const newsContainer = document.getElementById('news-container');
    const emptyMessage = document.getElementById('empty-message');

    // 現在の言語を取得（main.jsのcurrentLanguageを参照）
    const userLanguage = window.currentLanguage || 'ja';

    // フィルタリング（カテゴリ）
    let filteredArticles = currentCategory === 'all'
        ? articles
        : articles.filter(article => article.category === currentCategory);

    // 言語でソート（ユーザーの言語を優先）
    filteredArticles.sort((a, b) => {
        const aLangMatch = a.language === userLanguage ? 1 : 0;
        const bLangMatch = b.language === userLanguage ? 1 : 0;

        if (aLangMatch !== bLangMatch) {
            return bLangMatch - aLangMatch; // ユーザー言語を優先
        }

        // 日付でソート（新しい順）
        return new Date(b.publishedDate) - new Date(a.publishedDate);
    });

    // 空の場合
    if (filteredArticles.length === 0) {
        newsContainer.innerHTML = '';
        emptyMessage.style.display = 'block';
        return;
    }

    emptyMessage.style.display = 'none';

    // カードを生成
    newsContainer.innerHTML = filteredArticles.map(article => createNewsCard(article)).join('');
}

// ニュースカードHTMLの生成
function createNewsCard(article) {
    const categoryLabel = getCategoryLabel(article.category);
    const thumbnailHTML = article.thumbnail
        ? `<img src="${article.thumbnail}" alt="${article.title}">`
        : '<div class="no-image"></div>';

    return `
        <article class="news-card" data-category="${article.category}">
            <div class="news-card-thumbnail ${article.thumbnail ? '' : 'no-image'}">
                ${thumbnailHTML}
            </div>
            <div class="news-card-body">
                <span class="news-card-category ${article.category}">${categoryLabel}</span>
                <h3 class="news-card-title">
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer">
                        ${escapeHtml(article.title)}
                    </a>
                </h3>
                <p class="news-card-description">${escapeHtml(article.description || '')}</p>
                <div class="news-card-meta">
                    <span class="news-card-date">${formatDate(article.publishedDate)}</span>
                    <span class="news-card-source">${escapeHtml(article.source)}</span>
                </div>
            </div>
        </article>
    `;
}

// カテゴリフィルターの設定
function setupCategoryFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // アクティブクラスの切り替え
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // カテゴリの変更
            currentCategory = this.getAttribute('data-category');

            // ニュースカードを再レンダリング
            renderNewsCards(allNewsData);
        });
    });
}

// カテゴリラベルの取得（多言語対応）
function getCategoryLabel(category) {
    const userLanguage = window.currentLanguage || 'ja';

    const labels = {
        'ja': {
            'bim': 'BIM全般',
            'revit': 'Revit',
            'software': 'ソフトウェア',
            'architecture': '建築・設計'
        },
        'en': {
            'bim': 'BIM General',
            'revit': 'Revit',
            'software': 'Software',
            'architecture': 'Architecture'
        },
        'zh': {
            'bim': 'BIM综合',
            'revit': 'Revit',
            'software': '软件',
            'architecture': '建筑设计'
        }
    };

    return labels[userLanguage]?.[category] || labels['ja'][category] || 'その他';
}

// 日付フォーマット
function formatDate(dateString) {
    if (!dateString) return '日付不明';

    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
    } catch (error) {
        return dateString;
    }
}

// HTMLエスケープ
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
