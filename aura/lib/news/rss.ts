import { FetchError, fetchWithRetry } from '@/lib/utils/retry';
import type { RssFeed, SearchLang } from './bias-sources';
import type { NewsArticle } from './aggregator';

interface RawItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
}

interface FetchOpts {
  feeds: RssFeed[];
  lang: SearchLang;
  categories: string[];
  categoryKeywords: string[];
  limit: number;
  /** Per-feed fetch timeout. Short — a slow feed shouldn't poison the search. */
  perFeedTimeoutMs?: number;
}

/**
 * Fetches articles from the supplied RSS feeds in parallel. The
 * caller — usually the aggregator — picks which feeds to pass based
 * on the (language, bias, categories) tuple via
 * rssFeedsForRequest(). Each feed runs with its own timeout; a
 * single slow or 404ing feed never sinks the whole search.
 */
export async function fetchRssArticles(
  opts: FetchOpts
): Promise<NewsArticle[]> {
  const feeds = opts.feeds;
  if (feeds.length === 0) return [];

  const timeoutMs = opts.perFeedTimeoutMs ?? 6000;
  const settled = await Promise.allSettled(
    feeds.map((feed) => fetchSingleFeed(feed, opts, timeoutMs))
  );

  const all: NewsArticle[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      all.push(...result.value);
    }
  }

  all.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  return all.slice(0, opts.limit);
}

async function fetchSingleFeed(
  feed: RssFeed,
  opts: FetchOpts,
  timeoutMs: number
): Promise<NewsArticle[]> {
  try {
    const res = await fetchWithRetry(
      feed.url,
      {
        headers: {
          'user-agent': 'AURA-NewsBot/1.0 (+https://aurapress.app)',
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        },
      },
      { timeoutMs, delays: [], retryOn: [], failFast: [400, 401, 403, 404, 429] }
    );
    const xml = await res.text();
    const items = parseFeed(xml);
    // Generalist feeds carry every topic — keyword-filter their items
    // to the user's selected categories. Vertical feeds are already
    // on-topic (we picked them BECAUSE they cover the category), so
    // skip the filter and trust the whole feed.
    const filtered = feed.isVertical
      ? items
      : items.filter((item) => matchesCategory(item, opts.categoryKeywords));
    return filtered.map(
      (item): NewsArticle => ({
        title: item.title,
        description: item.description,
        source: feed.source,
        publishedAt: normalizeDate(item.pubDate),
        url: item.link,
        category: opts.categories[0] ?? 'general',
        originalLanguage: opts.lang,
        image: item.image,
      })
    );
  } catch (err) {
    if (err instanceof FetchError) {
      console.warn('[news] RSS feed failed', feed.source, err.status, err.message);
    } else {
      console.warn(
        '[news] RSS feed failed',
        feed.source,
        err instanceof Error ? err.message : err
      );
    }
    return [];
  }
}

function matchesCategory(item: RawItem, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  return keywords.some((k) => k && haystack.includes(k.toLowerCase()));
}

/** Atom-or-RSS parser. Tolerates either format and returns a flat list. */
function parseFeed(xml: string): RawItem[] {
  const rssItems = matchAll(xml, /<item\b[\s\S]*?<\/item>/gi);
  if (rssItems.length > 0) return rssItems.map(parseRssItem);

  const atomEntries = matchAll(xml, /<entry\b[\s\S]*?<\/entry>/gi);
  return atomEntries.map(parseAtomEntry);
}

function parseRssItem(block: string): RawItem {
  return {
    title: cleanText(extractTag(block, 'title')),
    link: cleanText(extractTag(block, 'link')),
    description: cleanText(
      extractTag(block, 'description') ||
        extractTag(block, 'content:encoded') ||
        ''
    ),
    pubDate:
      extractTag(block, 'pubDate') ||
      extractTag(block, 'dc:date') ||
      '',
    image: extractImage(block),
  };
}

function parseAtomEntry(block: string): RawItem {
  // Atom uses <link href="..."/> as an attribute, not text content.
  // Prefer rel="alternate" when present; otherwise take the first
  // link element.
  const altMatch = block.match(
    /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i
  );
  const firstMatch = block.match(/<link[^>]*href="([^"]+)"/i);
  return {
    title: cleanText(extractTag(block, 'title')),
    link: altMatch?.[1] ?? firstMatch?.[1] ?? '',
    description: cleanText(
      extractTag(block, 'summary') ||
        extractTag(block, 'content') ||
        ''
    ),
    pubDate:
      extractTag(block, 'updated') || extractTag(block, 'published') || '',
    image: extractImage(block),
  };
}

function extractTag(xml: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i');
  const m = xml.match(re);
  return m?.[1] ?? '';
}

function extractImage(block: string): string | undefined {
  const enclosure = block.match(
    /<enclosure[^>]*type="image\/[^"]*"[^>]*url="([^"]+)"/i
  );
  if (enclosure) return enclosure[1];
  const media = block.match(/<media:content[^>]*url="([^"]+)"/i);
  if (media) return media[1];
  const img = block.match(/<img[^>]*src="([^"]+)"/i);
  if (img) return img[1];
  return undefined;
}

function cleanText(raw: string): string {
  // Strip CDATA wrapper, drop residual HTML tags, decode common entities.
  const noCdata = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  const noTags = noCdata.replace(/<[^>]+>/g, ' ');
  const decoded = decodeEntities(noTags);
  return decoded.replace(/\s+/g, ' ').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return new Date().toISOString();
  return new Date(ts).toISOString();
}

function matchAll(s: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  // Defensive copy to ensure global flag.
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(s)) !== null) {
    out.push(m[0]);
  }
  return out;
}
