import type { DailyReport, StockInput, StockScore } from './types.js';
import { scoreTechnical } from './scoring/technical.js';
import { scoreFundamental, type SectorContext } from './scoring/fundamental.js';
import { scoreSentiment, type Classifier, lexiconClassifier } from './scoring/sentiment.js';
import { computeLevels } from './scoring/levels.js';
import { median, round, clamp, last } from './indicators.js';

export const METHODOLOGY_VERSION = '1.0.0';
export const DISCLAIMER =
  'המידע באפליקציה מבוסס על מודל כמותי אוטומטי ומוצג לצרכי מידע ולימוד בלבד. אין בו ייעוץ השקעות, שיווק השקעות או המלצה לקנות או למכור נייר ערך כלשהו, והוא אינו מותאם לנתונים ולצרכים של אדם מסוים. מסחר בניירות ערך כרוך בסיכון, לרבות אובדן הקרן. ביצועי עבר אינם מעידים על ביצועים עתידיים.';

export function sectorMedians(inputs: StockInput[]): Record<string, SectorContext> {
  const bySector = new Map<string, StockInput[]>();
  for (const s of inputs) {
    const k = s.profile.sector || 'Other';
    if (!bySector.has(k)) bySector.set(k, []);
    bySector.get(k)!.push(s);
  }
  const out: Record<string, SectorContext> = {};
  for (const [k, list] of bySector) {
    const vals = (fn: (s: StockInput) => number | null) =>
      list.map(fn).filter((x): x is number => x !== null && Number.isFinite(x));
    out[k] = {
      pe: median(vals((s) => s.fundamentals.pe).filter((p) => p > 0 && p < 200)),
      netMargin: median(vals((s) => s.fundamentals.netMargin)),
      revenueGrowthYoY: median(vals((s) => s.fundamentals.revenueGrowthYoY)),
    };
  }
  return out;
}

export async function scoreStock(
  s: StockInput,
  sector: SectorContext,
  asOf: Date,
  classify: Classifier = lexiconClassifier,
): Promise<Omit<StockScore, 'rank' | 'prevRank' | 'prevScore'>> {
  const technical = scoreTechnical(s.candles);
  const fundamental = scoreFundamental(s.fundamentals, sector, s.profile.sector);
  const sentiment = await scoreSentiment(s.profile.symbol, s.news, asOf, classify);
  const levels = computeLevels(s.candles);
  const closes = s.candles.map((c) => c.close);
  const price = last(closes);
  const prev = closes[closes.length - 2] ?? price;

  const flags: string[] = [];
  const e = s.fundamentals.nextEarningsDate;
  if (e) {
    const days = (new Date(e).getTime() - asOf.getTime()) / 864e5;
    if (days >= 0 && days <= 7) flags.push('earnings_soon');
  }
  if (sentiment.articles.length < 2) flags.push('low_news_coverage');
  if (technical.factors.find((f) => f.key === 'rsi')?.points === 0) flags.push('overbought');

  const score = Math.round(clamp(technical.score + fundamental.score + sentiment.score, 1, 100));
  return {
    symbol: s.profile.symbol,
    name: s.profile.name,
    sector: s.profile.sector,
    industry: s.profile.industry,
    price: round(price),
    changePct: round((price / prev - 1) * 100, 2),
    score,
    technical,
    fundamental,
    sentiment,
    levels,
    sparkline: closes.slice(-60).map((c) => round(c)),
    flags,
    analystTarget: s.fundamentals.analystTarget,
    nextEarningsDate: e,
  };
}

export async function buildReport(
  inputs: StockInput[],
  opts: { asOf: Date; previous?: DailyReport | null; classify?: Classifier; topN?: number; onProgress?: (i: number, n: number) => void },
): Promise<DailyReport> {
  const topN = opts.topN ?? 50;
  const medians = sectorMedians(inputs);
  const scored: Omit<StockScore, 'rank' | 'prevRank' | 'prevScore'>[] = [];
  let i = 0;
  for (const s of inputs) {
    if (s.candles.length < 210) continue; // need SMA200
    try {
      scored.push(await scoreStock(s, medians[s.profile.sector || 'Other'], opts.asOf, opts.classify));
    } catch (e) {
      console.warn(`skip ${s.profile.symbol}:`, (e as Error).message);
    }
    opts.onProgress?.(++i, inputs.length);
  }

  // Tie-breakers: higher score, then better risk/reward, then technical.
  scored.sort((a, b) => b.score - a.score || b.levels.riskReward - a.levels.riskReward || b.technical.score - a.technical.score);

  const prevMap = new Map(opts.previous?.top.map((t) => [t.symbol, t]) ?? []);
  const top: StockScore[] = scored.slice(0, topN).map((s, idx) => ({
    ...s,
    rank: idx + 1,
    prevRank: prevMap.get(s.symbol)?.rank ?? null,
    prevScore: prevMap.get(s.symbol)?.score ?? null,
  }));

  const quotes: DailyReport['quotes'] = {};
  for (const s of scored) quotes[s.symbol] = { price: s.price, changePct: s.changePct, name: s.name };

  const lastDate = inputs.find((x) => x.candles.length)?.candles.at(-1)?.date ?? opts.asOf.toISOString().slice(0, 10);
  return {
    generatedAt: new Date().toISOString(),
    asOf: lastDate,
    methodologyVersion: METHODOLOGY_VERSION,
    universeSize: scored.length,
    top,
    quotes,
    sectorMedians: medians,
    disclaimer: DISCLAIMER,
  };
}
