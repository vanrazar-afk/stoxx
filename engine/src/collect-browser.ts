/**
 * Browser-side COLLECTORS (no scoring): used to gather data from a normal browser when a server can't reach
 * the sources. Run __collectYahoo on a query1.finance.yahoo.com page and __collectGoogle on a news.google.com page;
 * the gzipped+base64 results are then scored by the Node engine (`npm run daily -- --inputs=… --news=…`).
 */
import { parseCsv } from './providers/free.js';
import { loadYahooStock } from './providers/yahoo.js';
import { googleNewsUrl, parseGoogleNewsRss } from './providers/googlenews.js';

const GICS: Record<string, string> = {
  'Information Technology': 'Technology', 'Communication Services': 'Communication Services',
  'Consumer Discretionary': 'Consumer Cyclical', 'Consumer Staples': 'Consumer Defensive',
  Financials: 'Financial Services', 'Health Care': 'Healthcare', Energy: 'Energy', Industrials: 'Industrials',
  Materials: 'Basic Materials', 'Real Estate': 'Real Estate', Utilities: 'Utilities',
};
const W = window as any;
const st = (W.__col = { done: 0, total: 0, errors: [] as string[], status: 'idle', b64: '' });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function universe(limit?: number) {
  const csv = await (await fetch('https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv')).text();
  const u = parseCsv(csv).slice(1).filter((r) => r[0]).map((r) => ({ symbol: r[0].replace('.', '-'), name: r[1], sector: GICS[r[2]] ?? 'Other', industry: r[3] ?? '' }));
  return limit ? u.slice(0, limit) : u;
}

async function pack(obj: unknown) {
  const cs = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = new Uint8Array(await new Response(cs).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
  return btoa(bin);
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

W.__collectYahoo = async (opts: { crumb: string; limit?: number; concurrency?: number }) => {
  st.status = 'loading'; st.done = 0; st.errors = [];
  const u = await universe(opts.limit);
  st.total = u.length;
  const get = async (url: string) => {
    for (let t = 1; ; t++) {
      const r = await fetch(url, { credentials: 'include' });
      if (r.ok) return r.json();
      if (t >= 3) throw new Error(`${r.status}`);
      await sleep(1500 * t * (r.status === 429 ? 3 : 1));
    }
  };
  const inputs: any[] = [];
  const asOf = new Date();
  await pool(u, opts.concurrency ?? 6, async (x) => {
    try {
      const s = await loadYahooStock(get, x, opts.crumb, asOf, (m) => st.errors.push(m));
      s.candles = s.candles.slice(-280);
      inputs.push(s);
    } catch (e) { st.errors.push(`${x.symbol}: ${(e as Error).message}`); }
    st.done++;
  });
  st.b64 = await pack(inputs);
  st.status = 'done';
  return { loaded: inputs.length, b64: st.b64.length };
};

W.__collectGoogle = async (opts: { limit?: number; concurrency?: number }) => {
  st.status = 'loading'; st.done = 0; st.errors = [];
  const u = await universe(opts.limit);
  st.total = u.length;
  const out: Record<string, any[]> = {};
  await pool(u, opts.concurrency ?? 3, async (x) => {
    try {
      const url = googleNewsUrl(x.name).replace('https://news.google.com', '');
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status}`);
      out[x.symbol] = parseGoogleNewsRss(await r.text()).slice(0, 25);
    } catch (e) { st.errors.push(`${x.symbol}: ${(e as Error).message}`); }
    st.done++;
    await sleep(150);
  });
  st.b64 = await pack(out);
  st.status = 'done';
  return { symbols: Object.keys(out).length, b64: st.b64.length };
};
