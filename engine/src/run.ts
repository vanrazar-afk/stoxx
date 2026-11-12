/**
 * Daily job.
 *   npm run daily          → FREE stack (Yahoo Finance, no keys), or paid FMP if FMP_API_KEY is set
 *   npm run daily -- --mock → synthetic demo data
 * Output: out/daily.json (+ dated archive out/history/YYYY-MM-DD.json)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { buildReport } from './rank.js';
import { mockUniverse } from './providers/mock.js';
import { loadStock, loadUniverse, limiter } from './providers/live.js';
import { loadFreeInputs } from './providers/free.js';
import { claudeClassifier, lexiconClassifier } from './scoring/sentiment.js';
import type { ChartFile, DailyReport, NewsItem, StockInput } from './types.js';
import { mergeNews } from './providers/googlenews.js';
import { isAboutCompany } from './providers/yahoo.js';

const args = new Set(process.argv.slice(2));
const outDir = process.env.OUT_DIR ?? 'out';

async function main() {
  const asOf = new Date();
  let inputs: StockInput[];

  const inputsArg = process.argv.find((a) => a.startsWith('--inputs='));
  if (inputsArg) {
    // Pre-collected inputs (e.g. gathered in a browser) — optionally merged with extra news
    inputs = JSON.parse(await readFile(inputsArg.split('=')[1], 'utf8'));
    const newsArg = process.argv.find((a) => a.startsWith('--news='));
    if (newsArg) {
      const extra: Record<string, NewsItem[]> = JSON.parse(await readFile(newsArg.split('=')[1], 'utf8'));
      for (const s of inputs) s.news = mergeNews(s.news, (extra[s.profile.symbol] ?? []).filter((n) => isAboutCompany(n.headline, s.profile.symbol, s.profile.name)));
    }
  } else if (args.has('--mock')) {
    inputs = mockUniverse(new Date('2026-11-06T21:00:00Z'));
  } else if (!process.env.FMP_API_KEY) {
    // Free stack, no keys: Yahoo Finance + open S&P 500 list
    inputs = await loadFreeInputs({ asOf, limit: Number(process.env.UNIVERSE_LIMIT ?? 0) });
    if (inputs.length < 60) throw new Error(`Only ${inputs.length} stocks loaded — aborting so yesterday's report stays online.`);
  } else {
    const fmpKey = process.env.FMP_API_KEY;
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (!fmpKey || !finnhubKey) throw new Error('Set FMP_API_KEY and FINNHUB_API_KEY (or run with --mock)');
    const cfg = { fmpKey, finnhubKey };
    const waitFmp = limiter(Number(process.env.FMP_PER_MIN ?? 280));
    const waitFh = limiter(Number(process.env.FINNHUB_PER_MIN ?? 55));
    const limit = Number(process.env.UNIVERSE_LIMIT ?? 0);
    let symbols = await loadUniverse(cfg);
    if (limit) symbols = symbols.slice(0, limit);
    console.log(`Universe: ${symbols.length} symbols`);
    inputs = [];
    for (const [i, s] of symbols.entries()) {
      try {
        inputs.push(await loadStock(s, cfg, asOf, waitFmp, waitFh));
      } catch (e) {
        console.warn(`load ${s} failed: ${(e as Error).message}`);
      }
      if (i % 25 === 0) console.log(`loaded ${i + 1}/${symbols.length}`);
    }
  }

  // "Previous" = the last report of an EARLIER market day, so intraday refreshes don't reset rank moves.
  let previous: DailyReport | null = null;
  const readJson = async (f: string) => JSON.parse(await readFile(f, 'utf8')) as DailyReport;
  const lastRun = await readJson(`${outDir}/daily.json`).catch(() => null);
  const lastPrev = await readJson(`${outDir}/prev.json`).catch(() => null);
  const todayAsOf = inputs.find((x) => x.candles.length)?.candles.at(-1)?.date;
  if (lastRun && lastRun.asOf !== todayAsOf) previous = lastRun;
  else if (lastPrev) previous = lastPrev;
  if (args.has('--mock') && !previous) {
    // Demo: build "yesterday" from the same data minus the last candle, so rank moves are meaningful.
    const y = inputs.map((s) => ({ ...s, candles: s.candles.slice(0, -1) }));
    previous = await buildReport(y, { asOf: new Date('2026-11-05T21:00:00Z') });
  }

  const classify = process.env.ANTHROPIC_API_KEY ? claudeClassifier(process.env.ANTHROPIC_API_KEY) : lexiconClassifier;
  const report = await buildReport(inputs, { asOf: args.has('--mock') ? new Date('2026-11-06T21:00:00Z') : asOf, previous, classify });

  report.source = args.has('--mock') ? 'demo' : 'live';
  report.dataProvider = args.has('--mock') ? undefined : 'Yahoo Finance + Google News (free) · S&P 500 list: github.com/datasets';
  await mkdir(`${outDir}/history`, { recursive: true });
  const json = JSON.stringify(report);
  if (previous) await writeFile(`${outDir}/prev.json`, JSON.stringify(previous));
  await writeFile(`${outDir}/daily.json`, json);
  await writeFile(`${outDir}/history/${report.asOf}.json`, json);
  // One chart file per stock (price-range chart in the app)
  await mkdir(`${outDir}/charts`, { recursive: true });
  let charts = 0;
  for (const s of inputs) {
    if (!s.candles.length) continue;
    const file: ChartFile = {
      symbol: s.profile.symbol,
      updatedAt: report.generatedAt,
      intraday: s.charts?.intraday ?? [],
      daily: s.candles.slice(-260).map((c) => [Math.floor(new Date(`${c.date}T21:00:00Z`).getTime() / 1000), Math.round(c.close * 100) / 100]),
      weekly: s.charts?.weekly ?? [],
    };
    await writeFile(`${outDir}/charts/${s.profile.symbol}.json`, JSON.stringify(file));
    charts++;
  }
  console.log(`charts written: ${charts}`);
  console.log(`Top ${report.top.length} of ${report.universeSize} written. #1 ${report.top[0]?.symbol} (${report.top[0]?.score})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
