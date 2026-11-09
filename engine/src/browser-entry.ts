/**
 * Runs the whole engine INSIDE a browser tab on query1.finance.yahoo.com (same-origin → no CORS),
 * using only free, key-less Yahoo endpoints + the open S&P 500 list. Result: window.__stoxx.report
 * Bundle: npx esbuild src/browser-entry.ts --bundle --format=iife --outfile=out/browser-engine.js
 */
import { buildReport } from './rank.js';
import { parseCsv } from './providers/free.js';
import type { StockInput } from './types.js';
import { loadYahooStock } from './providers/yahoo.js';

const GICS: Record<string, string> = {
  'Information Technology': 'Technology', 'Communication Services': 'Communication Services',
  'Consumer Discretionary': 'Consumer Cyclical', 'Consumer Staples': 'Consumer Defensive',
  Financials: 'Financial Services', 'Health Care': 'Healthcare', Energy: 'Energy', Industrials: 'Industrials',
  Materials: 'Basic Materials', 'Real Estate': 'Real Estate', Utilities: 'Utilities',
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const state: any = ((window as any).__stoxx = { done: 0, total: 0, errors: [] as string[], status: 'starting', report: null });

const get = async (url: string, tries = 3): Promise<any> => {
  for (let t = 1; ; t++) {
    const r = await fetch(url, { credentials: 'include' });
    if (r.ok) return r.json();
    if (t >= tries) throw new Error(`${r.status}`);
    await sleep(1500 * t * (r.status === 429 ? 3 : 1));
  }
};

export async function run(opts: { crumb: string; limit?: number; concurrency?: number }) {
  const asOf = new Date();
  state.status = 'universe';
  const csv = await (await fetch('https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv')).text();
  let uni = parseCsv(csv).slice(1).filter((r) => r[0]).map((r) => ({ sym: r[0].replace('.', '-'), name: r[1], sector: GICS[r[2]] ?? 'Other', industry: r[3] ?? '' }));
  if (opts.limit) uni = uni.slice(0, opts.limit);
  state.total = uni.length;
  state.status = 'loading';
  const inputs: StockInput[] = [];
  let idx = 0;
  const worker = async () => {
    while (idx < uni.length) {
      const u = uni[idx++];
      try {
        inputs.push(await loadYahooStock(get, { symbol: u.sym, name: u.name, sector: u.sector, industry: u.industry }, opts.crumb, asOf, (m) => state.errors.push(m)));
      } catch (e) {
        state.errors.push(`${u.sym}: ${(e as Error).message}`);
      }
      state.done++;
    }
  };
  await Promise.all(Array.from({ length: opts.concurrency ?? 5 }, worker));
  state.status = 'scoring';
  const report = await buildReport(inputs, { asOf });
  report.source = 'live-snapshot';
  report.dataProvider = 'Yahoo Finance (free, unofficial) · S&P 500 constituents: github.com/datasets';
  state.report = report;
  state.json = JSON.stringify(report);
  state.status = 'done';
  return { loaded: inputs.length, top1: report.top[0]?.symbol };
}

(window as any).__stoxxRun = run;
