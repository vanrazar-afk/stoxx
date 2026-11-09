import type { Factor, NewsItem, ScoredNews, SentimentResult } from '../types.js';
import { clamp, round } from '../indicators.js';
import { PILLAR_MAX } from './technical.js';

/**
 * The 12 major financial-news outlets (tier 1) the sentiment pillar listens to, plus secondary media (tier 2).
 * News is pulled from licensed news APIs (Finnhub / Marketaux / Benzinga…) that aggregate these
 * outlets — NOT scraped from the sites themselves (scraping breaks their terms of use).
 * `weight` lets wire services count a bit more than opinion-heavy outlets.
 */
export const NEWS_SOURCES: Record<string, { name: string; weight: number; tier: 1 | 2; match: RegExp }> = {
  // Tier 1 — the 10 major financial outlets
  reuters: { name: 'Reuters', weight: 1.2, tier: 1, match: /reuters/i },
  bloomberg: { name: 'Bloomberg', weight: 1.2, tier: 1, match: /bloomberg/i },
  wsj: { name: 'Wall Street Journal', weight: 1.1, tier: 1, match: /wsj|wall street journal|dow jones/i },
  ft: { name: 'Financial Times', weight: 1.1, tier: 1, match: /financial times|\bft\.com|^ft$/i },
  cnbc: { name: 'CNBC', weight: 1.0, tier: 1, match: /cnbc/i },
  marketwatch: { name: 'MarketWatch', weight: 1.0, tier: 1, match: /marketwatch/i },
  barrons: { name: "Barron's", weight: 1.0, tier: 1, match: /barron/i },
  yahoo: { name: 'Yahoo Finance', weight: 0.9, tier: 1, match: /yahoo/i },
  seekingalpha: { name: 'Seeking Alpha', weight: 0.8, tier: 1, match: /seeking ?alpha/i },
  benzinga: { name: 'Benzinga', weight: 0.8, tier: 1, match: /benzinga/i },
  morningstar: { name: 'Morningstar', weight: 0.9, tier: 1, match: /morningstar/i },
  economist: { name: 'The Economist', weight: 1.0, tier: 1, match: /economist/i },
  // Tier 2 — secondary financial media, half weight (free feeds carry many of these)
  investing: { name: 'Investing.com', weight: 0.5, tier: 2, match: /investing\.com/i },
  fool: { name: 'Motley Fool', weight: 0.5, tier: 2, match: /motley fool/i },
  zacks: { name: 'Zacks', weight: 0.5, tier: 2, match: /zacks/i },
  thestreet: { name: 'TheStreet', weight: 0.5, tier: 2, match: /thestreet/i },
  mtnews: { name: 'MT Newswires', weight: 0.6, tier: 2, match: /mt newswires/i },
  ap: { name: 'AP / AFP', weight: 0.7, tier: 2, match: /^(ap|afp|associated press)$/i },
  fortune: { name: 'Fortune', weight: 0.6, tier: 2, match: /fortune/i },
  forbes: { name: 'Forbes', weight: 0.5, tier: 2, match: /forbes/i },
  ibd: { name: "Investor's Business Daily", weight: 0.6, tier: 2, match: /investor'?s business daily/i },
  businessinsider: { name: 'Business Insider', weight: 0.5, tier: 2, match: /business insider/i },
  // Deliberately excluded: company press releases (Business Wire, PR Newswire, GlobeNewswire, CNW…)
};

export function normalizeSource(raw: string): string | null {
  for (const [key, s] of Object.entries(NEWS_SOURCES)) if (s.match.test(raw)) return key;
  return null;
}

// Compact finance lexicon (inspired by Loughran–McDonald). Used when no LLM key is configured.
const POS = [
  'beat', 'beats', 'tops', 'record', 'surge', 'surges', 'soar', 'soars', 'jumps', 'rally', 'upgrade', 'upgraded',
  'outperform', 'raises guidance', 'raised guidance', 'raises outlook', 'strong demand', 'buyback', 'repurchase',
  'dividend increase', 'approval', 'approved', 'wins', 'contract', 'partnership', 'expands', 'growth', 'profit rises',
  'exceeds', 'bullish', 'all-time high', 'breakthrough', 'overweight', 'price target raised', 'accelerat', 'buy rating', 'outperforming', 'strong', 'higher', 'gains', 'raises', 'lifts',
];
const NEG = [
  'miss', 'misses', 'plunge', 'plunges', 'sinks', 'tumble', 'tumbles', 'falls', 'drops', 'downgrade', 'downgraded',
  'underperform', 'cuts guidance', 'cut guidance', 'lowers outlook', 'warning', 'warns', 'lawsuit', 'sued', 'probe',
  'investigation', 'sec charges', 'fraud', 'recall', 'layoffs', 'bankruptcy', 'default', 'loss widens', 'weak demand',
  'bearish', 'halted', 'resigns', 'antitrust', 'fine', 'fined', 'underweight', 'price target cut', 'slump', 'decline', 'fell', 'weakness', 'lower', 'slides', 'sell rating', 'concern', 'pressure', 'lags', 'tumbled', 'plunged', 'cut to',
];

export function lexiconSentiment(text: string): number {
  // Analyst price-target moves: "...to $190 From $186" → direction decides
  const pt = text.match(/to \$([\d,.]+)\s+from \$([\d,.]+)/i);
  if (pt) {
    const to = parseFloat(pt[1].replace(/,/g, ''));
    const from = parseFloat(pt[2].replace(/,/g, ''));
    if (to > from) return 0.6;
    if (to < from) return -0.6;
  }
  const t = ` ${text.toLowerCase()} `;
  let p = 0;
  let n = 0;
  for (const w of POS) if (t.includes(w)) p++;
  for (const w of NEG) if (t.includes(w)) n++;
  if (p + n === 0) return 0;
  return clamp((p - n) / (p + n), -1, 1);
}

export type Classifier = (items: NewsItem[], symbol: string) => Promise<number[]>;

export const lexiconClassifier: Classifier = async (items) =>
  items.map((i) => lexiconSentiment(`${i.headline} ${i.summary ?? ''}`));

/**
 * Sentiment pillar (max 33.33).
 * Weighted net sentiment over the last 7 days from the 10 outlets, mapped linearly:
 *   all positive → 33.33 · all negative → 0 · balanced/no news → ~16.7
 * Recency: today's news counts 1.0, decaying to ~0.4 after 7 days.
 * A single strongly negative headline from a top wire is enough to pull the pillar down hard.
 */
export async function scoreSentiment(
  symbol: string,
  news: NewsItem[],
  asOf: Date,
  classify: Classifier = lexiconClassifier,
): Promise<SentimentResult> {
  const weekAgo = asOf.getTime() - 7 * 864e5;
  const relevant = news
    .map((n) => ({ ...n, source: normalizeSource(n.source) ?? '' }))
    .filter((n) => n.source && new Date(n.datetime).getTime() >= weekAgo)
    .slice(0, 40);

  const scores = relevant.length ? await classify(relevant, symbol) : [];
  const articles: ScoredNews[] = relevant.map((n, i) => {
    const s = scores[i] ?? 0;
    return { ...n, publisher: NEWS_SOURCES[n.source].name, sentiment: round(s, 2), label: s > 0.15 ? 'positive' : s < -0.15 ? 'negative' : 'neutral' };
  });

  let wSum = 0;
  let acc = 0;
  for (const a of articles) {
    const ageDays = (asOf.getTime() - new Date(a.datetime).getTime()) / 864e5;
    const recency = Math.max(0.4, 1 - ageDays * 0.085);
    const w = NEWS_SOURCES[a.source].weight * recency * (a.label === 'negative' ? 1.5 : 1); // bad news weighs more
    wSum += w;
    acc += w * a.sentiment;
  }
  const net = wSum ? acc / wSum : 0; // -1..1
  const positive = articles.filter((a) => a.label === 'positive').length;
  const negative = articles.filter((a) => a.label === 'negative').length;
  const neutral = articles.length - positive - negative;
  const sourcesCovered = [...new Set(articles.map((a) => a.source))];
  const tier1Covered = sourcesCovered.filter((k) => NEWS_SOURCES[k].tier === 1).length;

  // Linear map (net -1..1 → 0..max). Pure good news → max, pure bad news → min.
  let score = ((net + 1) / 2) * PILLAR_MAX;
  if (articles.length > 0 && negative === 0 && positive > 0) score = Math.max(score, PILLAR_MAX * 0.92);
  if (negative > 0 && negative >= positive) score = Math.min(score, PILLAR_MAX * 0.2);
  // Thin coverage: a single positive headline is weak evidence, so pull the upside toward neutral
  // until there are ~3 relevant articles. Bad news is never softened.
  const neutralScore = PILLAR_MAX / 2;
  const confidence = Math.min(1, 0.5 + articles.length / 6);
  if (score > neutralScore) score = neutralScore + (score - neutralScore) * confidence;
  score = round(clamp(score, 0, PILLAR_MAX), 2);

  const factors: Factor[] = [
    { key: 'net', label: 'סנטימנט נטו (7 ימים)', value: `${round(net * 100, 0)}`, points: round(score, 1), max: round(PILLAR_MAX, 1), signal: net > 0.15 ? 'positive' : net < -0.15 ? 'negative' : 'neutral' },
    { key: 'pos', label: 'כתבות חיוביות', value: `${positive}`, points: 0, max: 0, signal: 'positive' },
    { key: 'neg', label: 'כתבות שליליות', value: `${negative}`, points: 0, max: 0, signal: negative ? 'negative' : 'neutral' },
    { key: 'src', label: 'מקורות מרכזיים שסיקרו', value: `${tier1Covered}/12 (+${sourcesCovered.length - tier1Covered} משניים)`, points: 0, max: 0, signal: tier1Covered >= 2 ? 'positive' : 'neutral' },
  ];

  let summary: string;
  if (!articles.length) summary = 'לא נמצא סיקור משמעותי במקורות החדשות המרכזיים בשבוע האחרון — הציון ניטרלי.';
  else if (negative === 0 && positive > 0) summary = `הסיקור בשבוע האחרון חיובי באופן גורף (${positive === 1 ? 'כתבה חיובית אחת' : `${positive} כתבות חיוביות`}, ללא כתבות שליליות).`;
  else if (negative >= positive) summary = `נמצאו חדשות שליליות משמעותיות (${negative} שליליות מול ${positive} חיוביות) — הציון בשליש זה נמוך.`;
  else summary = `הסיקור חיובי ברובו (${positive} חיוביות, ${negative} שליליות, ${neutral} ניטרליות).`;

  return { score, factors, summary, articles, positive, negative, neutral, sourcesCovered };
}

/**
 * Optional: LLM classifier using the Claude API (set ANTHROPIC_API_KEY).
 * Far more accurate than keyword matching on nuanced headlines.
 */
export function claudeClassifier(apiKey: string, model = 'claude-haiku-5-5'): Classifier {
  return async (items, symbol) => {
    const list = items.map((n, i) => `${i}. ${n.headline}`).join('\n');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Rate the impact of each headline on ${symbol} shareholders from -1 (very negative) to 1 (very positive); 0 if irrelevant or neutral. Reply ONLY with a JSON array of numbers, same order.\n\n${list}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const data = (await res.json()) as { content: { text: string }[] };
    const arr = JSON.parse(data.content[0].text.match(/\[[\s\S]*\]/)?.[0] ?? '[]') as number[];
    return items.map((_, i) => clamp(Number(arr[i]) || 0, -1, 1));
  };
}
