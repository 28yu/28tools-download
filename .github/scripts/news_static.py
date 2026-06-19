#!/usr/bin/env python3
"""
ニュースの静的書き出し（案A）共通モジュール

fetch_rss.py / fetch_ai_rss.py が JSON を書き出した後に呼び出し、
取得した最新記事を news.html / ai-news.html の静的 HTML 領域
(<!-- NEWS_STATIC_START --> ～ <!-- NEWS_STATIC_END -->) に焼き込む。

目的: 生 HTML 単体で記事一覧が読める状態にし、JS 無効環境・クローラー
（AdSense / 検索）でも「読み込み中...」ではなく実コンテンツを返す。
マニュアル本文の prerender (scripts/build-manuals/) と同じ思想。

既存の JS 描画 (js/news.js / js/ai-news.js) はそのまま残る。
焼き込み済みカードと同一マークアップを JS が同データで上書きするだけ。

stdlib のみで完結（feedparser 以外の新規依存なし）。冪等。
"""

import re
import html as html_lib
from datetime import datetime
from email.utils import parsedate_to_datetime

# js/news.js / js/ai-news.js の日本語ラベルと一致させる
NEWS_CATEGORY_LABELS = {
    'bim': 'BIM全般',
    'revit': 'Revit',
    'software': 'ソフトウェア',
    'architecture': '建築・設計',
}

AI_CATEGORY_LABELS = {
    'general': 'AI全般',
    'llm': 'LLM',
    'tools': 'AIツール',
    'research': '研究・開発',
}

# 焼き込むカード数（JS 側は全件を動的描画。静的はクローラー/初期表示用の代表分）
DEFAULT_LIMIT = 30


def _esc(text):
    """HTML エスケープ（属性・本文兼用）"""
    return html_lib.escape(text or '', quote=True)


def _fmt_published(date_string):
    """RSS の publishedDate (RFC822) を YYYY/MM/DD へ"""
    if not date_string:
        return '日付不明'
    try:
        return parsedate_to_datetime(date_string).strftime('%Y/%m/%d')
    except (TypeError, ValueError):
        return date_string


def _fmt_last_updated(iso_string):
    """lastUpdated (ISO 8601) を YYYY/MM/DD へ"""
    if not iso_string:
        return '不明'
    try:
        return datetime.fromisoformat(iso_string).strftime('%Y/%m/%d')
    except (TypeError, ValueError):
        return iso_string


def _sort_key(article):
    """js の renderNewsCards と同じ並び: 日本語優先 → 新着順"""
    is_ja = 0 if article.get('language') == 'ja' else 1
    dt = None
    try:
        dt = parsedate_to_datetime(article.get('publishedDate', ''))
    except (TypeError, ValueError):
        dt = None
    # 日付不明は最後尾へ。新しい順にするため負のタイムスタンプを使う
    ts = dt.timestamp() if dt else float('-inf')
    return (is_ja, -ts)


def _card_html(article, category_labels, ai=False):
    category = article.get('category', '')
    label = category_labels.get(category, 'その他')

    thumbnail = article.get('thumbnail')
    if thumbnail:
        thumb_inner = (
            f'<img src="{_esc(thumbnail)}" '
            f'alt="{_esc(article.get("title", ""))}" loading="lazy">'
        )
        thumb_class = ''
    else:
        thumb_inner = '<div class="no-image"></div>'
        thumb_class = 'no-image'

    description = _esc((article.get('description') or '').strip())
    link = _esc(article.get('link', ''))
    date = _fmt_published(article.get('publishedDate'))
    source = _esc(article.get('source', ''))

    if ai:
        is_foreign = bool(article.get('language')) and article.get('language') != 'ja'
        title_src = article.get('titleJa') if (is_foreign and article.get('titleJa')) else article.get('title', '')
        badge = '<span class="news-card-foreign-badge">🌐 海外サイト</span>' if is_foreign else ''
        badges = (
            f'<div class="news-card-badges">'
            f'<span class="news-card-category {category}">{label}</span>{badge}'
            f'</div>'
        )
    else:
        title_src = article.get('title', '')
        badges = f'<span class="news-card-category {category}">{label}</span>'

    title = _esc(title_src)

    return (
        f'<article class="news-card" data-category="{category}">\n'
        f'    <div class="news-card-thumbnail {thumb_class}">{thumb_inner}</div>\n'
        f'    <div class="news-card-body">\n'
        f'        {badges}\n'
        f'        <h3 class="news-card-title">'
        f'<a href="{link}" target="_blank" rel="noopener noreferrer">{title}</a></h3>\n'
        f'        <p class="news-card-description">{description}</p>\n'
        f'        <div class="news-card-meta">'
        f'<span class="news-card-date">{date}</span>'
        f'<span class="news-card-source">{source}</span></div>\n'
        f'    </div>\n'
        f'</article>'
    )


def inject_static_news(html_path, articles, last_updated, *, ai=False, limit=DEFAULT_LIMIT):
    """記事を HTML の静的領域へ焼き込む。変更があれば True を返す。"""
    category_labels = AI_CATEGORY_LABELS if ai else NEWS_CATEGORY_LABELS

    selected = sorted(articles, key=_sort_key)[:limit]
    if not selected:
        # 0 件は焼き込まない（古い結果や「読み込み中...」を残す方が安全）
        print(f"  ⚠ {html_path}: 焼き込む記事が 0 件のためスキップ")
        return False

    cards = '\n'.join(_card_html(a, category_labels, ai=ai) for a in selected)
    block = (
        '<!-- NEWS_STATIC_START : .github/scripts が自動生成。手動編集しない -->\n'
        f'{cards}\n'
        '            <!-- NEWS_STATIC_END -->'
    )

    with open(html_path, encoding='utf-8') as f:
        original = f.read()

    # マーカー間を置換（関数置換で本文中の \ や \g を素通し）
    new_html, n = re.subn(
        r'<!-- NEWS_STATIC_START.*?NEWS_STATIC_END -->',
        lambda _m: block,
        original,
        flags=re.S,
    )
    if n == 0:
        print(f"  ⚠ {html_path}: NEWS_STATIC マーカーが見つからない")
        return False

    # 最終更新日を焼き込む
    date_str = _esc(_fmt_last_updated(last_updated))
    new_html = re.sub(
        r'(<span id="last-update-time">).*?(</span>)',
        lambda m: m.group(1) + date_str + m.group(2),
        new_html,
        flags=re.S,
    )

    if new_html != original:
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print(f"  ✓ {html_path} に {len(selected)} 件を焼き込み")
        return True

    print(f"  = {html_path}: 変更なし")
    return False
