/* ==============================
   AIニュースページ - JavaScript
   ============================== */

// グローバル変数
let allAiNewsData = [];
let currentAiCategory = 'all';

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    loadAiNewsData();
    setupAiCategoryFilter();
});

// ニュースデータの読み込み
async function loadAiNewsData() {
    const newsContainer = document.getElementById('news-container');
    const errorMessage = document.getElementById('error-message');
    const lastUpdateTime = document.getElementById('last-update-time');

    try {
        const response = await fetch('data/ai-news.json');

        if (!response.ok) {
            throw new Error('Failed to fetch AI news data');
        }

        const data = await response.json();
        allAiNewsData = data.articles || [];

        // 最終更新日時を表示
        if (data.lastUpdated) {
            lastUpdateTime.textContent = formatAiDate(data.lastUpdated);
        } else {
            lastUpdateTime.textContent = '不明';
        }

        // ニュースカードを表示
        renderAiNewsCards(allAiNewsData);

    } catch (error) {
        console.error('Error loading AI news:', error);
        newsContainer.style.display = 'none';
        errorMessage.style.display = 'block';
    }
}

// ニュースカードのレンダリング
function renderAiNewsCards(articles) {
    const newsContainer = document.getElementById('news-container');
    const emptyMessage = document.getElementById('empty-message');

    const userLanguage = window.currentLanguage || 'ja';

    // フィルタリング
    let filteredArticles = currentAiCategory === 'all'
        ? articles
        : articles.filter(article => article.category === currentAiCategory);

    // 言語でソート（ユーザーの言語を優先）
    filteredArticles.sort((a, b) => {
        const aLangMatch = a.language === userLanguage ? 1 : 0;
        const bLangMatch = b.language === userLanguage ? 1 : 0;

        if (aLangMatch !== bLangMatch) {
            return bLangMatch - aLangMatch;
        }

        return new Date(b.publishedDate) - new Date(a.publishedDate);
    });

    if (filteredArticles.length === 0) {
        newsContainer.innerHTML = '';
        emptyMessage.style.display = 'block';
        return;
    }

    emptyMessage.style.display = 'none';
    newsContainer.innerHTML = filteredArticles.map(article => createAiNewsCard(article)).join('');
}

// ニュースカードHTMLの生成
function createAiNewsCard(article) {
    const categoryLabel = getAiCategoryLabel(article.category);
    const thumbnailHTML = article.thumbnail
        ? `<img src="${article.thumbnail}" alt="${article.title}">`
        : '<div class="no-image"></div>';

    const cleanDescription = stripAiHtml(article.description || '');

    return `
        <article class="news-card" data-category="${article.category}">
            <div class="news-card-thumbnail ${article.thumbnail ? '' : 'no-image'}">
                ${thumbnailHTML}
            </div>
            <div class="news-card-body">
                <span class="news-card-category ${article.category}">${categoryLabel}</span>
                <h3 class="news-card-title">
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer">
                        ${escapeAiHtml(article.title)}
                    </a>
                </h3>
                <p class="news-card-description">${escapeAiHtml(cleanDescription)}</p>
                <div class="news-card-meta">
                    <span class="news-card-date">${formatAiDate(article.publishedDate)}</span>
                    <span class="news-card-source">${escapeAiHtml(article.source)}</span>
                </div>
            </div>
        </article>
    `;
}

// カテゴリフィルターの設定
function setupAiCategoryFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            currentAiCategory = this.getAttribute('data-category');
            renderAiNewsCards(allAiNewsData);
        });
    });
}

// カテゴリラベルの取得（多言語対応）
function getAiCategoryLabel(category) {
    const userLanguage = window.currentLanguage || 'ja';

    const labels = {
        'ja': {
            'general': 'AI全般',
            'llm': 'LLM',
            'tools': 'AIツール',
            'research': '研究・開発'
        },
        'en': {
            'general': 'AI General',
            'llm': 'LLM',
            'tools': 'AI Tools',
            'research': 'Research'
        },
        'zh': {
            'general': 'AI综合',
            'llm': 'LLM',
            'tools': 'AI工具',
            'research': '研究开发'
        }
    };

    return labels[userLanguage]?.[category] || labels['ja'][category] || 'その他';
}

// 日付フォーマット
function formatAiDate(dateString) {
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
function escapeAiHtml(text) {
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

// HTMLタグを削除してプレーンテキストを返す
function stripAiHtml(html) {
    if (!html) return '';

    let text = html.replace(/<[^>]*>/g, '');
    text = text.replace(/&[a-z]+;/gi, ' ');
    text = text.replace(/&#\d+;/g, ' ');

    try {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        text = textarea.value;
    } catch (e) {
        console.warn('Failed to decode HTML entities:', e);
    }

    text = text.replace(/\s+/g, ' ').trim();

    const maxLength = 150;
    if (text.length > maxLength) {
        text = text.substring(0, maxLength) + '...';
    }

    return text;
}
