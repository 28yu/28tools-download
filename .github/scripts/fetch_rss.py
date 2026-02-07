#!/usr/bin/env python3
"""
BIM業界ニュースRSS取得スクリプト
複数のRSSフィードから記事を取得してJSONに変換
"""

import feedparser
import json
from datetime import datetime
import sys

# RSSフィードソース
RSS_FEEDS = [
    {
        'url': 'https://aps.autodesk.com/blog/rss.xml',
        'source': 'Autodesk Platform Services',
        'category': 'software'
    },
    {
        'url': 'https://www.buildingsmart.org/feed/',
        'source': 'buildingSMART International',
        'category': 'bim'
    },
    {
        'url': 'https://graphisoft.com/feeds/blog',
        'source': 'GRAPHISOFT Blog',
        'category': 'software'
    },
    # 追加のフィードはここに記載
]

def fetch_feed(feed_config):
    """RSSフィードを取得してパース"""
    try:
        feed = feedparser.parse(feed_config['url'])
        articles = []

        for entry in feed.entries[:10]:  # 最新10件
            article = {
                'title': entry.get('title', 'No Title'),
                'link': entry.get('link', ''),
                'description': entry.get('summary', entry.get('description', ''))[:200] + '...',
                'publishedDate': entry.get('published', entry.get('updated', '')),
                'source': feed_config['source'],
                'category': feed_config['category'],
                'thumbnail': extract_thumbnail(entry)
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
