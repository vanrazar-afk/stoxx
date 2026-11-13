// Mirror of engine/src/types.ts — keep in sync.

export interface Candle {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Fundamentals {
  pe: number | null; // trailing P/E
  forwardPe: number | null;
  peg: number | null;
  revenueGrowthYoY: number | null; // 0.12 = 12%
  epsGrowthYoY: number | null;
  netMargin: number | null; // 0.2 = 20%
  roe: number | null;
  debtToEquity: number | null;
  fcfYield: number | null; // free cash flow / market cap
  marketCap: number | null;
  analystTarget: number | null; // consensus price target
  nextEarningsDate: string | null;
}

export interface NewsItem {
  headline: string;
  source: string; // normalized source key, e.g. "reuters"
  url: string;
  datetime: string; // ISO
  summary?: string;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
}

/** Price history for the range chart: [unix seconds, price] pairs. */
export type Series = [number, number][];
export interface ChartSet {
  intraday: Series; // last ~5 sessions, 15-minute bars (→ 1D and 5D ranges)
  weekly: Series; // ~5 years, weekly closes (→ 5Y range)
}

export interface StockInput {
  profile: CompanyProfile;
  candles: Candle[]; // oldest -> newest, >= 260 trading days recommended
  fundamentals: Fundamentals;
  news: NewsItem[];
  charts?: ChartSet;
}

/** data/charts/<SYMBOL>.json — one small file per stock, loaded when its page opens. */
export interface ChartFile {
  symbol: string;
  updatedAt: string;
  intraday: Series;
  daily: Series; // ~1 year of daily closes (→ 1M, 6M, YTD, 1Y)
  weekly: Series;
}

export interface Factor {
  key: string;
  label: string; // Hebrew label shown in the app table
  value: string; // human-readable value
  points: number; // earned
  max: number; // possible
  signal: 'positive' | 'neutral' | 'negative';
}

export interface PillarResult {
  score: number; // 0 .. 33.33
  factors: Factor[];
  summary: string; // Hebrew analyst-style summary
}

export interface ScoredNews extends NewsItem {
  publisher?: string; // display name
  sentiment: number; // -1 .. 1
  label: 'positive' | 'neutral' | 'negative';
}

export interface SentimentResult extends PillarResult {
  articles: ScoredNews[];
  positive: number;
  negative: number;
  neutral: number;
  sourcesCovered: string[];
}

export interface Levels {
  entry: number; // last close
  target: number; // technical exit (take-profit)
  stop: number; // risk level
  riskReward: number;
  atr: number;
  method: string; // Hebrew explanation
}

export interface StockScore {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  changePct: number; // last day %
  score: number; // 1..100
  rank: number;
  prevRank: number | null;
  prevScore: number | null;
  technical: PillarResult;
  fundamental: PillarResult;
  sentiment: SentimentResult;
  levels: Levels;
  sparkline: number[]; // last 60 closes
  flags: string[]; // e.g. "earnings_soon", "low_news_coverage"
  analystTarget: number | null;
  nextEarningsDate: string | null;
}

/** Compact ranking row for every scored stock (the full analysis lives in data/stocks/<SYMBOL>.json). */
export interface RankEntry {
  symbol: string;
  rank: number;
  score: number;
  t: number; // technical pillar
  f: number; // fundamental pillar
  s: number; // sentiment pillar
  prevRank: number | null;
}

export interface DailyReport {
  generatedAt: string;
  asOf: string; // market date of the last candle
  methodologyVersion: string;
  universeSize: number;
  top: StockScore[]; // top 50 (full detail)
  ranks?: RankEntry[]; // ALL scored stocks, best first (S&P 500)
  mode?: 'full' | 'quick'; // quick = prices/technicals refreshed, news & fundamentals from the last full run
  fullAt?: string; // when news & fundamentals were last fetched
  quotes: Record<string, { price: number; changePct: number; name: string; sector?: string }>; // whole universe (S&P 500)
  sectorMedians: Record<string, { pe: number | null; netMargin: number | null; revenueGrowthYoY: number | null }>;
  disclaimer: string;
  source?: 'demo' | 'live-snapshot' | 'live';
  dataProvider?: string;
}
