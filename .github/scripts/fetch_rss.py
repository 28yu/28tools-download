#!/usr/bin/env python3
"""
BIM業界ニュースRSS取得スクリプト
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
        'url': 'https://aps.autodesk.com/blog/rss.xml',
        'source': 'Autodesk Platform Services',
        'category': 'software',
        'language': 'en'
    },
    {
        'url': 'https://www.buildingsmart.org/feed/',
        'source': 'buildingSMART International',
        'category': 'bim',
        'language': 'en'
    },
    {
        'url': 'https://graphisoft.com/feeds/blog',
        'source': 'GRAPHISOFT Blog',
        'category': 'software',
        'language': 'en'
    },
    # 日本語ソース
    # 以下のURLは無効のためコメントアウト（2026/02/07）
    # {
    #     'url': 'https://www.autodesk.co.jp/feeds/blogs',
    #     'source': 'Autodesk Japan',
    #     'category': 'software',
    #     'language': 'ja'
    # },
    # {
    #     'url': 'https://www.graphisoft.co.jp/feed/',
    #     'source': 'GRAPHISOFT Japan',
    #     'category': 'software',
    #     'language': 'ja'
    # },

    # 新しい日本語ソース（2026/02/07追加）
    {
        'url': 'https://news.build-app.jp/feed/',
        'source': 'BuildApp News',
        'category': 'architecture',
        'language': 'ja'
    },
    {
        'url': 'https://axconstdx.com/feed/',
        'source': '生成AIと建設DX',
        'category': 'bim',
        'language': 'ja'
    },
    {
        'url': 'https://adndevblog.typepad.com/technology_perspective/atom.xml',
        'source': 'Autodesk Developer Network Japan',
        'category': 'software',
        'language': 'ja'
    },
    {
        'url': 'https://bim-design.com/feed/',
        'source': 'BIM Design (Autodesk公式)',
        'category': 'software',
        'language': 'ja'
    },
    # 追加のフィードはここに記載
]

def detect_language(text):
    """テキストから言語を検出（簡易版）"""
    if not text:
        return 'en'

    # 日本語文字（ひらがな、カタカナ、漢字）が含まれているか
    japanese_pattern = re.compile(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]')
    if japanese_pattern.search(text):
        return 'ja'

    # 中国語文字が含まれているか（簡体字・繁体字）
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
            description = entry.get('summary', entry.get('description', ''))[:200] + '...'

            # 言語を検出（フィード設定に基づくか、タイトルから自動検出）
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

    # descriptionやsummaryから<img>タグを抽出（最後の手段）
    description = entry.get('summary', entry.get('description', ''))
    if description:
        # <img src="..." /> パターンを抽出
        img_pattern = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
        match = img_pattern.search(description)
        if match:
            img_url = match.group(1)
            # 相対URLを除外（http/httpsで始まるもののみ）
            if img_url.startswith('http://') or img_url.startswith('https://'):
                return img_url

    return None

def main():
    """メイン処理"""
    all_articles = []

    print("Fetching RSS feeds...")
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

    with open('data/news.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✓ Saved {len(all_articles)} articles to data/news.json")

if __name__ == '__main__':
    main()
