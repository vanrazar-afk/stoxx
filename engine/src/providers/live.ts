/**
 * Live data providers.
 *  - FMP (financialmodelingprep.com, "stable" API): universe, profiles, daily candles, consensus targets.
 *  - Finnhub (finnhub.io): fundamentals metrics, company news (with source), earnings calendar.
 *
 * IMPORTANT before going to production:
 *  1. Field names below follow the providers' public docs at the time of writing — verify them against
 *     your plan's live responses (run `npm run probe`).
 *  2. Redistributing data to app users requires a display / redistribution licence from each provider.
 *     Personal / free plans do NOT allow it.
 */
import type { Candle, CompanyProfile, Fundamentals, NewsItem, StockInput } from '../types.js';

const FMP = 'https://financialmodelingprep.com/stable';
const FINNHUB = 'https://finnhub.io/api/v1';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJSON<T>(url: string, tries = 3): Promise<T> {
  for (let t = 1; ; t++) {
    const res = await fetch(url);
    if (res.ok) return (await res.json()) as T;
    if (t >= tries || (res.status !== 429 && res.status < 500)) throw new Error(`${res.status} ${url.replace(/(apikey|token)=[^&]+/, '$1=***')}`);
    await sleep(1500 * t);
  }
}

/** Simple rate limiter: at most `perMinute` calls per minute. */
export function limiter(perMinute: number) {
  const gap = 60_000 / perMinute;
  let next = 0;
  return async () => {
    const now = Date.now();
    const wait = Math.max(0, next - now);
    next = Math.max(now, next) + gap;
    if (wait) await sleep(wait);
  };
}

const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export interface LiveConfig {
  fmpKey: string;
  finnhubKey: string;
  fmpPerMinute?: number;
  finnhubPerMinute?: number;
}

export async function loadUniverse(cfg: LiveConfig): Promise<string[]> {
  const [sp, ndx] = await Promise.all([
    getJSON<{ symbol: string }[]>(`${FMP}/sp500-constituent?apikey=${cfg.fmpKey}`),
    getJSON<{ symbol: string }[]>(`${FMP}/nasdaq-constituent?apikey=${cfg.fmpKey}`).catch(() => []),
  ]);
  return [...new Set([...sp, ...ndx].map((x) => x.symbol.replace('.', '-')))];
}

export async function loadStock(symbol: string, cfg: LiveConfig, asOf: Date, waitFmp: () => Promise<void>, waitFh: () => Promise<void>): Promise<StockInput> {
  const from = new Date(asOf.getTime() - 400 * 864e5);

  await waitFmp();
  const prof = (await getJSON<any[]>(`${FMP}/profile?symbol=${symbol}&apikey=${cfg.fmpKey}`))[0] ?? {};
  await waitFmp();
  const hist = await getJSON<any>(`${FMP}/historical-price-eod/full?symbol=${symbol}&from=${ymd(from)}&to=${ymd(asOf)}&apikey=${cfg.fmpKey}`);
  const rows: any[] = Array.isArray(hist) ? hist : hist.historical ?? [];
  const candles: Candle[] = rows
    .map((r) => ({ date: r.date, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume }))
    .sort((a, b) => a.date.localeCompare(b.date));
  await waitFmp();
  const target = (await getJSON<any[]>(`${FMP}/price-target-consensus?symbol=${symbol}&apikey=${cfg.fmpKey}`).catch(() => []))[0];

  await waitFh();
  const m = (await getJSON<any>(`${FINNHUB}/stock/metric?symbol=${symbol}&metric=all&token=${cfg.finnhubKey}`)).metric ?? {};
  await waitFh();
  const rawNews = await getJSON<any[]>(
    `${FINNHUB}/company-news?symbol=${symbol}&from=${ymd(new Date(asOf.getTime() - 8 * 864e5))}&to=${ymd(asOf)}&token=${cfg.finnhubKey}`,
  );
  await waitFh();
  const cal = await getJSON<any>(
    `${FINNHUB}/calendar/earnings?symbol=${symbol}&from=${ymd(asOf)}&to=${ymd(new Date(asOf.getTime() + 60 * 864e5))}&token=${cfg.finnhubKey}`,
  ).catch(() => ({ earningsCalendar: [] }));

  const price = candles.at(-1)?.close ?? 0;
  const pct = (x: unknown) => (num(x) === null ? null : (x as number) / 100); // Finnhub returns percents
  const profile: CompanyProfile = {
    symbol,
    name: prof.companyName ?? symbol,
    sector: prof.sector || 'Other',
    industry: prof.industry ?? '',
    exchange: prof.exchange ?? prof.exchangeShortName ?? '',
  };
  const mcap = num(prof.marketCap) ?? (num(m.marketCapitalization) !== null ? m.marketCapitalization * 1e6 : null);
  const fcfPerShare = num(m.freeCashFlowPerShareTTM) ?? num(m.cashFlowPerShareTTM);
  const fundamentals: Fundamentals = {
    pe: num(m.peTTM) ?? num(m.peBasicExclExtraTTM),
    forwardPe: num(m.forwardPE),
    peg: num(m.pegTTM) ?? num(m.pegRatio),
    revenueGrowthYoY: pct(m.revenueGrowthTTMYoy),
    epsGrowthYoY: pct(m.epsGrowthTTMYoy),
    netMargin: pct(m.netProfitMarginTTM),
    roe: pct(m.roeTTM),
    debtToEquity: num(m['totalDebt/totalEquityQuarterly']) ?? num(m['totalDebt/totalEquityAnnual']),
    fcfYield: fcfPerShare !== null && price ? fcfPerShare / price : null,
    marketCap: mcap,
    analystTarget: num(target?.targetConsensus),
    nextEarningsDate: cal.earningsCalendar?.[0]?.date ?? null,
  };
  const news: NewsItem[] = rawNews.map((n) => ({
    headline: n.headline,
    source: n.source ?? '',
    url: n.url,
    datetime: new Date((n.datetime ?? 0) * 1000).toISOString(),
    summary: n.summary,
  }));
  return { profile, candles, fundamentals, news };
}
