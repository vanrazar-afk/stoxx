/**
 * Google News RSS (free, no key). Each item carries the original publisher (<source>), which is how we
 * reach Bloomberg, Reuters, CNBC, WSJ, MarketWatch, Barron's, FT, Morningstar… without paid feeds.
 * Server-side only (the RSS endpoint has no CORS headers).
 */
import type { NewsItem } from '../types.js';

export function cleanCompanyName(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/,?\s+(inc\.?|incorporated|corp\.?|corporation|company|co\.?|holdings?|plc|ltd\.?|limited|group|n\.?v\.?|s\.?a\.?|the)$/gi, '')
    .replace(/,?\s+(inc\.?|corp\.?|corporation|company|holdings?|plc|ltd\.?)$/gi, '')
    .trim();
}

export function googleNewsUrl(name: string): string {
  const q = `"${cleanCompanyName(name)}" stock when:7d`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();

export function parseGoogleNewsRss(xml: string): NewsItem[] {
  const out: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    const get = (tag: string) => decode(it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? '');
    const source = get('source');
    let title = get('title');
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    const date = new Date(get('pubDate'));
    if (!title || Number.isNaN(date.getTime())) continue;
    out.push({ headline: title, source, url: get('link'), datetime: date.toISOString() });
  }
  return out;
}

export async function fetchGoogleNews(name: string): Promise<NewsItem[]> {
  const res = await fetch(googleNewsUrl(name), { headers: { 'User-Agent': 'Mozilla/5.0 (StoXX research engine)' } });
  if (!res.ok) throw new Error(`google news ${res.status}`);
  return parseGoogleNewsRss(await res.text());
}

/** Quote pages, price charts and forecast widgets are not news. */
export function isJunkHeadline(h: string): boolean {
  return /stock price|quote ?(&|and) history|price, news|price and chart|stock forecast|price forecast|price target & analyst ratings|earnings date|dividend history|\(\w+\) stock$/i.test(h);
}

/** Merge news lists, dropping near-duplicate headlines (same story syndicated twice). */
export function mergeNews(...lists: NewsItem[][]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const n of lists.flat()) {
    if (isJunkHeadline(n.headline)) continue;
    const key = n.headline.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out.sort((a, b) => b.datetime.localeCompare(a.datetime));
}
