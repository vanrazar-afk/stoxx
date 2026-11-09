/**
 * FREE data stack (no paid plans):
 *  - Universe + sectors: S&P 500 list from github.com/datasets/s-and-p-500-companies (open data)
 *  - Daily candles:      Yahoo Finance chart endpoint (no key). Unofficial — fine for testing / personal use;
 *                        replace with a licensed feed before a public commercial launch.
 *  - Fundamentals, analyst targets, earnings dates and news: Yahoo Finance too (see yahoo.ts).
 *  - More news (Bloomberg, Reuters, CNBC, WSJ…): Google News RSS (see googlenews.ts).
 *  - parseFinnhubMetrics is kept for an optional Finnhub integration.
 */
import type { Candle, CompanyProfile, Fundamentals, NewsItem, StockInput } from '../types.js';
import { isAboutCompany, loadYahooStock, yahooNodeSession } from './yahoo.js';
import { fetchGoogleNews, mergeNews } from './googlenews.js';

const UNIVERSE_CSV = 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv';
const YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart';
const UA = { 'User-Agent': 'Mozilla/5.0 (StoXX research engine)' };

// GICS → the sector names used across the app
const GICS: Record<string, string> = {
  'Information Technology': 'Technology',
  'Communication Services': 'Communication Services',
  'Consumer Discretionary': 'Consumer Cyclical',
  'Consumer Staples': 'Consumer Defensive',
  Financials: 'Financial Services',
  'Health Care': 'Healthcare',
  Energy: 'Energy',
  Industrials: 'Industrials',
  Materials: 'Basic Materials',
  'Real Estate': 'Real Estate',
  Utilities: 'Utilities',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function getJSON<T>(url: string, tries = 3): Promise<T> {
  for (let t = 1; ; t++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return (await res.json()) as T;
    if (t >= tries || (res.status !== 429 && res.status < 500)) throw new Error(`${res.status} ${url.replace(/token=[^&]+/, 'token=***')}`);
    await sleep(2000 * t);
  }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') (cur += '"'), i++;
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') row.push(cur), (cur = '');
    else if (ch === '\n') row.push(cur), rows.push(row), (row = []), (cur = '');
    else if (ch !== '\r') cur += ch;
  }
  if (cur || row.length) row.push(cur), rows.push(row);
  return rows;
}

export interface UniverseRow {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
}

export async function loadFreeUniverse(): Promise<UniverseRow[]> {
  const res = await fetch(UNIVERSE_CSV, { headers: UA });
  if (!res.ok) throw new Error(`universe ${res.status}`);
  const [, ...rows] = parseCsv(await res.text());
  return rows
    .filter((r) => r[0])
    .map((r) => ({ symbol: r[0].replace('.', '-'), name: r[1], sector: GICS[r[2]] ?? 'Other', industry: r[3] ?? '' }));
}

export function parseYahooChart(json: any): Candle[] {
  const r = json?.chart?.result?.[0];
  if (!r?.timestamp) return [];
  const q = r.indicators?.quote?.[0] ?? {};
  const out: Candle[] = [];
  r.timestamp.forEach((ts: number, i: number) => {
    const c = { open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i] ?? 0 };
    if ([c.open, c.high, c.low, c.close].every((v) => typeof v === 'number')) out.push({ date: ymd(new Date(ts * 1000)), ...c });
  });
  return out;
}

export function parseFinnhubMetrics(m: any, price: number, analystTarget: number | null, nextEarnings: string | null): Fundamentals {
  const pct = (x: unknown) => (num(x) === null ? null : (x as number) / 100);
  const fcfPerShare = num(m.freeCashFlowPerShareTTM);
  return {
    pe: num(m.peTTM) ?? num(m.peBasicExclExtraTTM) ?? num(m.peExclExtraTTM),
    forwardPe: num(m.forwardPE),
    peg: num(m.pegTTM),
    revenueGrowthYoY: pct(m.revenueGrowthTTMYoy),
    epsGrowthYoY: pct(m.epsGrowthTTMYoy),
    netMargin: pct(m.netProfitMarginTTM),
    roe: pct(m.roeTTM),
    debtToEquity: num(m['totalDebt/totalEquityQuarterly']) ?? num(m['totalDebt/totalEquityAnnual']),
    fcfYield: fcfPerShare !== null && price ? fcfPerShare / price : num(m.pfcfShareTTM) ? 1 / m.pfcfShareTTM : null,
    marketCap: num(m.marketCapitalization) !== null ? m.marketCapitalization * 1e6 : null,
    analystTarget,
    nextEarningsDate: nextEarnings,
  };
}

/**
 * Free stack, no API keys: S&P 500 list (GitHub open data) + Yahoo Finance (prices, fundamentals,
 * analyst targets, earnings dates, news with publisher). Runs fine on GitHub Actions.
 */
export async function loadFreeInputs(opts: { asOf: Date; limit?: number; concurrency?: number; log?: (s: string) => void }): Promise<StockInput[]> {
  const log = opts.log ?? console.log;
  let universe = await loadFreeUniverse();
  if (opts.limit) universe = universe.slice(0, opts.limit);
  log(`Universe: ${universe.length} (S&P 500)`);
  const { get, crumb } = await yahooNodeSession();
  log(crumb ? 'Yahoo session ready' : 'Yahoo crumb unavailable — fundamentals will be neutral');
  const out: StockInput[] = [];
  let idx = 0;
  let done = 0;
  const worker = async () => {
    while (idx < universe.length) {
      const u = universe[idx++];
      try {
        const input = await loadYahooStock(get, u, crumb, opts.asOf, (m) => log(m));
        try {
          const gn = (await fetchGoogleNews(u.name)).filter((n) => isAboutCompany(n.headline, u.symbol, u.name));
          input.news = mergeNews(input.news, gn);
        } catch (e) {
          log(`${u.symbol} google news: ${(e as Error).message}`);
        }
        out.push(input);
      } catch (e) {
        log(`skip ${u.symbol}: ${(e as Error).message}`);
      }
      if (++done % 50 === 0) log(`loaded ${done}/${universe.length}`);
    }
  };
  await Promise.all(Array.from({ length: opts.concurrency ?? 4 }, worker));
  return out;
}
