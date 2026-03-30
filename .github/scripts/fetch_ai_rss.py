#!/usr/bin/env python3
"""
AIニュースRSS取得スクリプト
複数のRSSフィードから記事を取得してJSONに変換
サムネイルが取得できない場合はソースページのOGP画像を取得
海外記事のタイトルを日本語に自動翻訳
"""

import feedparser
import json
from datetime import datetime
import sys
import re
import urllib.request
import urllib.error
import urllib.parse
import time

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
        'url': 'https://www.publickey1.jp/atom.xml',
        'source': 'Publickey',
        'category': 'tools',
        'language': 'ja'
    },
    {
        'url': 'https://www.itmedia.co.jp/news/subtop/aiplus/rss/index.xml',
        'source': 'ITmedia AI+',
        'category': 'general',
        'language': 'ja'
    },
    {
        'url': 'https://weel.co.jp/feed/',
        'source': 'WEEL',
        'category': 'tools',
        'language': 'ja'
    },
    {
        'url': 'https://atmarkit.itmedia.co.jp/ait/subtop/ai/rss.xml',
        'source': '@IT AI',
        'category': 'research',
        'language': 'ja'
    },
]

# OGP画像取得時のUser-Agent
USER_AGENT = 'Mozilla/5.0 (compatible; 28ToolsBot/1.0)'

def strip_html_tags(html):
    """HTMLタグを削除してプレーンテキストを返す"""
    if not html:
        return ''

    text = re.sub(r'<[^>]*>', '', html)

    text = text.replace('&nbsp;', ' ')
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&quot;', '"')
    text = text.replace('&#8230;', '...')

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

def fetch_ogp_image(url):
    """ページのOGP画像（og:image）を取得する"""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=10) as response:
            # 最初の50KBだけ読む（<head>内のOGPタグは十分取得できる）
            html = response.read(50000).decode('utf-8', errors='ignore')

        # og:image を抽出
        og_pattern = re.compile(
            r'<meta\s+(?:[^>]*?)property=["\']og:image["\']'
            r'\s+(?:[^>]*?)content=["\']([^"\']+)["\']',
            re.IGNORECASE
        )
        match = og_pattern.search(html)
        if match:
            return match.group(1)

        # content が先に来るパターン
        og_pattern2 = re.compile(
            r'<meta\s+(?:[^>]*?)content=["\']([^"\']+)["\']'
            r'\s+(?:[^>]*?)property=["\']og:image["\']',
            re.IGNORECASE
        )
        match2 = og_pattern2.search(html)
        if match2:
            return match2.group(1)

    except Exception as e:
        print(f"  ⚠ OGP fetch failed for {url}: {e}", file=sys.stderr)

    return None

def translate_to_japanese(text):
    """Google Translate（無料）でテキストを日本語に翻訳する"""
    if not text:
        return text

    try:
        # Google Translate の非公式API（無料）
        encoded_text = urllib.parse.quote(text)
        url = (
            f'https://translate.googleapis.com/translate_a/single'
            f'?client=gtx&sl=auto&tl=ja&dt=t&q={encoded_text}'
        )
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))

        # レスポンスから翻訳テキストを抽出
        translated = ''
        if result and result[0]:
            for segment in result[0]:
                if segment[0]:
                    translated += segment[0]

        return translated if translated else text

    except Exception as e:
        print(f"  ⚠ Translation failed: {e}", file=sys.stderr)
        return text


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

def fetch_feed(feed_config):
    """RSSフィードを取得してパース"""
    try:
        feed = feedparser.parse(feed_config['url'])
        articles = []

        for entry in feed.entries[:15]:  # 最新15件（100件対応のため増加）
            title = entry.get('title', 'No Title')
            raw_description = entry.get('summary', entry.get('description', ''))

            description = strip_html_tags(raw_description)[:200] + '...'

            language = feed_config.get('language', detect_language(title))

            # サムネイル取得（RSS内 → OGPフォールバック）
            thumbnail = extract_thumbnail(entry)
            link = entry.get('link', '')

            if not thumbnail and link:
                print(f"  🔍 Fetching OGP image for: {title[:50]}...")
                thumbnail = fetch_ogp_image(link)
                time.sleep(0.5)  # サーバー負荷軽減

            # 海外記事のタイトルを日本語に翻訳
            title_ja = None
            if language != 'ja':
                print(f"  🌐 Translating: {title[:60]}...")
                title_ja = translate_to_japanese(title)
                time.sleep(0.3)  # API負荷軽減

            article = {
                'title': title,
                'titleJa': title_ja,
                'link': link,
                'description': description,
                'publishedDate': entry.get('published', entry.get('updated', '')),
                'source': feed_config['source'],
                'category': feed_config['category'],
                'thumbnail': thumbnail,
                'language': language
            }
            articles.append(article)

        return articles
    except Exception as e:
        print(f"Error fetching {feed_config['source']}: {e}", file=sys.stderr)
        return []

def main():
    """メイン処理"""
    all_articles = []

    print("Fetching AI news RSS feeds...")
    for feed_config in RSS_FEEDS:
        print(f"- {feed_config['source']}")
        articles = fetch_feed(feed_config)
        all_articles.extend(articles)

    # 日本語と海外記事を分離
    ja_articles = [a for a in all_articles if a['language'] == 'ja']
    foreign_articles = [a for a in all_articles if a['language'] != 'ja']

    # それぞれ日付でソート（新しい順）
    ja_articles.sort(key=lambda x: x['publishedDate'], reverse=True)
    foreign_articles.sort(key=lambda x: x['publishedDate'], reverse=True)

    # 海外記事は全体の3割に制限（100件なら最大30件）
    max_total = 100
    max_foreign = int(max_total * 0.3)  # 30件
    max_ja = max_total - min(len(foreign_articles), max_foreign)

    ja_articles = ja_articles[:max_ja]
    foreign_articles = foreign_articles[:max_foreign]

    # 合算して日付でソート
    combined = ja_articles + foreign_articles
    combined.sort(key=lambda x: x['publishedDate'], reverse=True)
    combined = combined[:max_total]

    print(f"  📊 日本語: {len(ja_articles)}件 / 海外: {len(foreign_articles)}件")

    # JSONとして出力
    output = {
        'lastUpdated': datetime.utcnow().isoformat(),
        'articles': combined
    }

    with open('data/ai-news.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✓ Saved {len(combined)} articles to data/ai-news.json")

if __name__ == '__main__':
    main()
