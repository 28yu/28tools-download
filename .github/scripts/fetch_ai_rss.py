#!/usr/bin/env python3
"""
AIニュースRSS取得スクリプト
複数のRSSフィードから記事を取得してJSONに変換
"""

import feedparser
import json
from datetime import datetime
import sys
import re

# RSSフィードソース
RSS_FEEDS = [
    # 英語ソース
    {
        'url': 'https://openai.com/blog/rss.xml',
        'source': 'OpenAI Blog',
        'category': 'llm',
        'language': 'en'
    },
    {
        'url': 'https://blog.google/technology/ai/rss/',
        'source': 'Google AI Blog',
        'category': 'general',
        'language': 'en'
    },
    {
        'url': 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
        'source': 'The Verge AI',
        'category': 'general',
        'language': 'en'
    },
    {
        'url': 'https://www.technologyreview.com/feed/',
        'source': 'MIT Technology Review',
        'category': 'research',
        'language': 'en'
    },
    {
        'url': 'https://huggingface.co/blog/feed.xml',
        'source': 'Hugging Face Blog',
        'category': 'tools',
        'language': 'en'
    },
    # 日本語ソース
    {
        'url': 'https://ai-scholar.tech/feed',
        'source': 'AI-SCHOLAR',
        'category': 'research',
        'language': 'ja'
    },
    {
        'url': 'https://ainow.ai/feed/',
        'source': 'AINOW',
        'category': 'general',
        'language': 'ja'
    },
    {
        'url': 'https://www.itmedia.co.jp/news/subtop/aiplus/rss/index.xml',
        'source': 'ITmedia AI+',
        'category': 'general',
        'language': 'ja'
    },
]

def strip_html_tags(html):
    """HTMLタグを削除してプレーンテキストを返す"""
    if not html:
        return ''

    # HTMLタグを削除
    text = re.sub(r'<[^>]*>', '', html)

    # HTMLエンティティをデコード
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&quot;', '"')
    text = text.replace('&#8230;', '...')

    # 余分な空白を削除
    text = re.sub(r'\s+', ' ', text).strip()

    return text

def detect_language(text):
    """テキストから言語を検出（簡易版）"""
    if not text:
        return 'en'

    japanese_pattern = re.compile(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]')
    if japanese_pattern.search(text):
        return 'ja'

    chinese_pattern = re.compile(r'[\u4E00-\u9FFF]')
    if chinese_pattern.search(text) and not japanese_pattern.search(text):
        return 'zh'

    return 'en'

def fetch_feed(feed_config):
    """RSSフィードを取得してパース"""
    try:
        feed = feedparser.parse(feed_config['url'])
        articles = []

        for entry in feed.entries[:10]:  # 最新10件
            title = entry.get('title', 'No Title')
            raw_description = entry.get('summary', entry.get('description', ''))

            # HTMLタグを削除してプレーンテキストのみ抽出
            description = strip_html_tags(raw_description)[:200] + '...'

            # 言語を検出
            language = feed_config.get('language', detect_language(title))

            article = {
                'title': title,
                'link': entry.get('link', ''),
                'description': description,
                'publishedDate': entry.get('published', entry.get('updated', '')),
                'source': feed_config['source'],
                'category': feed_config['category'],
                'thumbnail': extract_thumbnail(entry),
                'language': language
            }
            articles.append(article)

        return articles
    except Exception as e:
        print(f"Error fetching {feed_config['source']}: {e}", file=sys.stderr)
        return []

def extract_thumbnail(entry):
    """エントリーからサムネイル画像を抽出"""
    # media:thumbnail を優先
    if hasattr(entry, 'media_thumbnail'):
        return entry.media_thumbnail[0]['url']

    # media:content
    if hasattr(entry, 'media_content'):
        for media in entry.media_content:
            if media.get('medium') == 'image':
                return media.get('url')

    # enclosure
    if hasattr(entry, 'enclosures'):
        for enc in entry.enclosures:
            if 'image' in enc.get('type', ''):
                return enc.get('href')

    # content:encoded から画像を抽出
    if hasattr(entry, 'content'):
        for content in entry.content:
            if content.get('type') in ['text/html', 'application/xhtml+xml']:
                content_html = content.get('value', '')
                img_pattern = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
                match = img_pattern.search(content_html)
                if match:
                    img_url = match.group(1)
                    if img_url.startswith('http://') or img_url.startswith('https://'):
                        return img_url

    # descriptionから<img>タグを抽出
    description = entry.get('summary', entry.get('description', ''))
    if description:
        img_pattern = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
        match = img_pattern.search(description)
        if match:
            img_url = match.group(1)
            if img_url.startswith('http://') or img_url.startswith('https://'):
                return img_url

    return None

def main():
    """メイン処理"""
    all_articles = []

    print("Fetching AI news RSS feeds...")
    for feed_config in RSS_FEEDS:
        print(f"- {feed_config['source']}")
        articles = fetch_feed(feed_config)
        all_articles.extend(articles)

    # 日付でソート（新しい順）
    all_articles.sort(key=lambda x: x['publishedDate'], reverse=True)

    # 最新50件に制限
    all_articles = all_articles[:50]

    # JSONとして出力
    output = {
        'lastUpdated': datetime.utcnow().isoformat(),
        'articles': all_articles
    }

    with open('data/ai-news.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✓ Saved {len(all_articles)} articles to data/ai-news.json")

if __name__ == '__main__':
    main()
