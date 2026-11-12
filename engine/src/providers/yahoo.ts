/**
 * Key-less Yahoo Finance loader shared by the Node engine (GitHub Actions) and the in-browser run.
 * Prices: /v8/finance/chart · Fundamentals + analyst target + earnings date: /v10/finance/quoteSummary (needs crumb)
 * News (with publisher): /v1/finance/search
 * Unofficial endpoints — fine for personal use/testing; use a licensed feed for a commercial launch.
 */
import type { Candle, ChartSet, Fundamentals, NewsItem, Series, StockInput } from '../types.js';

export type GetJSON = (path: string) => Promise<any>;

const raw = (x: any): number | null =>
  x && typeof x.raw === 'number' && Number.isFinite(x.raw) ? x.raw : typeof x === 'number' && Number.isFinite(x) ? x : null;

export function parseQuoteSummary(m: any): Fundamentals {
  const sd = m.summaryDetail ?? {}, ks = m.defaultKeyStatistics ?? {}, fd = m.financialData ?? {}, ce = m.calendarEvents ?? {};
  const mcap = raw(sd.marketCap);
  const fcf = raw(fd.freeCashflow);
  const ed = ce.earnings?.earningsDate?.[0];
  const de = raw(fd.debtToEquity);
  const eps = raw(ks.trailingEps);
  return {
    pe: raw(sd.trailingPE) ?? (eps !== null && eps < 0 ? -1 : null),
    forwardPe: raw(sd.forwardPE) ?? raw(ks.forwardPE),
    peg: raw(ks.pegRatio) ?? raw(ks.trailingPegRatio),
    revenueGrowthYoY: raw(fd.revenueGrowth),
    epsGrowthYoY: raw(fd.earningsGrowth),
    netMargin: raw(fd.profitMargins),
    roe: raw(fd.returnOnEquity),
    debtToEquity: de !== null ? de / 100 : null, // Yahoo reports D/E in %
    fcfYield: fcf !== null && mcap ? fcf / mcap : null,
    marketCap: mcap,
    analystTarget: raw(fd.targetMeanPrice),
    nextEarningsDate: ed && raw(ed) ? new Date(raw(ed)! * 1000).toISOString().slice(0, 10) : null,
  };
}

/** Keep only headlines that actually name the company (ticker or its distinctive first name word). */
export function isAboutCompany(headline: string, symbol: string, name: string): boolean {
  const tick = symbol.replace('-', '.');
  if (tick.length >= 2 && new RegExp(`(^|[^A-Za-z])${tick.replace('.', '\\.')}([^A-Za-z]|$)`).test(headline)) return true;
  const word = name.replace(/^the\s+/i, '').split(/[\s,.&]+/)[0];
  return word.length >= 3 && new RegExp(`\\b${word.replace(/[^A-Za-z0-9]/g, '')}`, 'i').test(headline);
}

function toSeries(json: any): Series {
  const r = json?.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const c: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
  const out: Series = [];
  ts.forEach((t, i) => {
    const v = c[i];
    if (typeof v === 'number' && Number.isFinite(v)) out.push([t, Math.round(v * 100) / 100]);
  });
  return out;
}

/** Intraday (5 sessions, 15m) + 5-year weekly series for the price-range chart. */
export async function loadYahooCharts(get: GetJSON, symbol: string): Promise<ChartSet> {
  const [intra, weekly] = await Promise.all([
    get(`/v8/finance/chart/${symbol}?range=5d&interval=15m`).then(toSeries).catch(() => [] as Series),
    get(`/v8/finance/chart/${symbol}?range=5y&interval=1wk`).then(toSeries).catch(() => [] as Series),
  ]);
  return { intraday: intra, weekly };
}

export async function loadYahooStock(
  get: GetJSON,
  u: { symbol: string; name: string; sector: string; industry: string },
  crumb: string | null,
  asOf: Date,
  onError: (msg: string) => void = () => {},
): Promise<StockInput> {
  const p1 = Math.floor((asOf.getTime() - 420 * 864e5) / 1000);
  const p2 = Math.floor(asOf.getTime() / 1000) + 86400;
  const chart = await get(`/v8/finance/chart/${u.symbol}?period1=${p1}&period2=${p2}&interval=1d`);
  const r = chart.chart.result[0];
  const q = r.indicators.quote[0];
  const candles: Candle[] = [];
  r.timestamp.forEach((ts: number, i: number) => {
    const c = { open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i] ?? 0 };
    if ([c.open, c.high, c.low, c.close].every((v) => typeof v === 'number'))
      candles.push({ date: new Date(ts * 1000).toISOString().slice(0, 10), ...c });
  });

  let fundamentals: Fundamentals = {
    pe: null, forwardPe: null, peg: null, revenueGrowthYoY: null, epsGrowthYoY: null, netMargin: null,
    roe: null, debtToEquity: null, fcfYield: null, marketCap: null, analystTarget: null, nextEarningsDate: null,
  };
  if (crumb) {
    try {
      const qs = await get(`/v10/finance/quoteSummary/${u.symbol}?modules=summaryDetail,defaultKeyStatistics,financialData,calendarEvents&crumb=${encodeURIComponent(crumb)}`);
      fundamentals = parseQuoteSummary(qs.quoteSummary.result[0]);
    } catch (e) {
      onError(`${u.symbol} fundamentals: ${(e as Error).message}`);
    }
  }

  let news: NewsItem[] = [];
  try {
    const s = await get(`/v1/finance/search?q=${u.symbol}&quotesCount=0&newsCount=15`);
    news = (s.news ?? [])
      .filter((n: any) => !Array.isArray(n.relatedTickers) || n.relatedTickers.includes(u.symbol))
      .filter((n: any) => isAboutCompany(n.title ?? '', u.symbol, u.name))
      .map((n: any) => ({
        headline: n.title,
        source: n.publisher ?? '',
        url: n.link,
        datetime: new Date((n.providerPublishTime ?? 0) * 1000).toISOString(),
      }));
  } catch (e) {
    onError(`${u.symbol} news: ${(e as Error).message}`);
  }
  return { profile: { symbol: u.symbol, name: u.name, sector: u.sector, industry: u.industry, exchange: '' }, candles, fundamentals, news };
}

/** Node: obtain Yahoo cookie + crumb (same handshake a browser does). */
export async function yahooNodeSession(): Promise<{ get: GetJSON; crumb: string | null }> {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
  let cookie = '';
  try {
    const r = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
    cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  } catch {}
  let crumb: string | null = null;
  try {
    const r = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, cookie } });
    if (r.ok) crumb = (await r.text()).trim() || null;
  } catch {}
  const get: GetJSON = async (path) => {
    for (let t = 1; ; t++) {
      const r = await fetch(`https://query1.finance.yahoo.com${path}`, { headers: { 'User-Agent': UA, cookie } });
      if (r.ok) return r.json();
      if (t >= 3) throw new Error(`${r.status}`);
      await new Promise((res) => setTimeout(res, 1500 * t * (r.status === 429 ? 3 : 1)));
    }
  };
  return { get, crumb };
}
