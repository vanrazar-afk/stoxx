import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sma, rsi, redStreakBeforeLast } from '../src/indicators.js';
import { scoreSentiment } from '../src/scoring/sentiment.js';
import { computeLevels } from '../src/scoring/levels.js';
import { buildReport } from '../src/rank.js';
import { mockUniverse } from '../src/providers/mock.js';
import type { Candle } from '../src/types.js';

const asOf = new Date('2026-11-06T21:00:00Z');
const c = (o: number, cl: number): Candle => ({ date: '2026-01-01', open: o, high: Math.max(o, cl) + 1, low: Math.min(o, cl) - 1, close: cl, volume: 1000 });

test('sma', () => {
  assert.deepEqual(sma([1, 2, 3, 4], 2), [null, 1.5, 2.5, 3.5]);
});

test('rsi of steadily rising series is 100', () => {
  const r = rsi(Array.from({ length: 30 }, (_, i) => i + 1));
  assert.equal(r.at(-1), 100);
});

test('red streak then green', () => {
  const s = redStreakBeforeLast([c(10, 11), c(11, 10), c(10, 9), c(9, 8), c(8, 9)]);
  assert.deepEqual(s, { lastGreen: true, redStreak: 3 });
});

test('sentiment: only good news → max, bad news → low', async () => {
  const mk = (h: string) => ({ headline: h, source: 'Reuters', url: '', datetime: asOf.toISOString() });
  const good = await scoreSentiment('X', [mk('X beats estimates, raises guidance'), mk('X shares surge on record demand')], asOf);
  const bad = await scoreSentiment('X', [mk('X misses estimates, shares plunge'), mk('X shares surge')], asOf);
  const none = await scoreSentiment('X', [], asOf);
  assert.ok(good.score > 30, `good ${good.score}`);
  assert.ok(bad.score <= 100 / 3 * 0.2 + 0.01, `bad ${bad.score}`);
  assert.ok(Math.abs(none.score - 100 / 6) < 0.1);
});

test('sentiment ignores sources outside the 10 outlets', async () => {
  const r = await scoreSentiment('X', [{ headline: 'X plunges', source: 'randomblog', url: '', datetime: asOf.toISOString() }], asOf);
  assert.equal(r.articles.length, 0);
});

test('levels: stop below entry, target above, R:R >= 1.5', () => {
  const u = mockUniverse(asOf)[0];
  const l = computeLevels(u.candles);
  assert.ok(l.stop < l.entry && l.target > l.entry);
  assert.ok(l.riskReward >= 1.5 && l.riskReward <= 3.01, `rr ${l.riskReward}`);
});

test('report: 50 ranked, scores 1..100, pillars sum', async () => {
  const r = await buildReport(mockUniverse(asOf), { asOf });
  assert.equal(r.top.length, 50);
  for (let i = 0; i < r.top.length; i++) {
    const s = r.top[i];
    assert.equal(s.rank, i + 1);
    assert.ok(s.score >= 1 && s.score <= 100);
    const sum = s.technical.score + s.fundamental.score + s.sentiment.score;
    assert.ok(Math.abs(sum - s.score) <= 1, `${s.symbol} ${sum} vs ${s.score}`);
    assert.ok(s.technical.score <= 33.34 && s.fundamental.score <= 33.34 && s.sentiment.score <= 33.34);
    if (i) assert.ok(r.top[i - 1].score >= s.score);
  }
});

import { parseCsv, parseYahooChart, parseFinnhubMetrics } from '../src/providers/free.js';

test('free: csv with quoted commas', () => {
  const rows = parseCsv('Symbol,Security,GICS Sector\nMMM,"3M, Inc.",Industrials\n');
  assert.deepEqual(rows[1], ['MMM', '3M, Inc.', 'Industrials']);
});

test('free: yahoo chart parsing skips null bars', () => {
  const j = { chart: { result: [{ timestamp: [1762300800, 1762387200], indicators: { quote: [{ open: [1, null], high: [2, 3], low: [0.5, 1], close: [1.5, 2], volume: [10, 20] }] } }] } };
  const c = parseYahooChart(j);
  assert.equal(c.length, 1);
  assert.equal(c[0].close, 1.5);
});

test('free: finnhub metrics → fractions', () => {
  const f = parseFinnhubMetrics({ peTTM: 25, revenueGrowthTTMYoy: 12, netProfitMarginTTM: 20, freeCashFlowPerShareTTM: 5 }, 100, null, null);
  assert.equal(f.pe, 25);
  assert.equal(f.revenueGrowthYoY, 0.12);
  assert.equal(f.netMargin, 0.2);
  assert.equal(f.fcfYield, 0.05);
});

import { parseQuoteSummary, isAboutCompany } from '../src/providers/yahoo.js';
test('yahoo: headline relevance', () => {
  assert.ok(isAboutCompany('Marathon Petroleum beats estimates', 'MPC', 'Marathon Petroleum'));
  assert.ok(isAboutCompany('Why MPC stock jumped', 'MPC', 'Marathon Petroleum'));
  assert.ok(!isAboutCompany('Can Cenovus Improve Refining Margins?', 'MPC', 'Marathon Petroleum'));
  assert.ok(isAboutCompany('Meta unveils new AI model', 'META', 'Meta Platforms'));
  assert.ok(!isAboutCompany('A guide to stocks', 'A', 'Agilent Technologies'));
});
test('yahoo: quoteSummary → fundamentals', () => {
  const f = parseQuoteSummary({
    summaryDetail: { trailingPE: { raw: 20 }, marketCap: { raw: 1e9 } },
    financialData: { revenueGrowth: { raw: 0.1 }, debtToEquity: { raw: 150 }, freeCashflow: { raw: 5e7 }, targetMeanPrice: { raw: 120 } },
    defaultKeyStatistics: {}, calendarEvents: { earnings: { earningsDate: [{ raw: 1763000000 }] } },
  });
  assert.equal(f.pe, 20); assert.equal(f.debtToEquity, 1.5); assert.equal(f.fcfYield, 0.05); assert.equal(f.analystTarget, 120);
  assert.match(f.nextEarningsDate!, /^2025-11-1/);
});

import { lexiconSentiment } from '../src/scoring/sentiment.js';
test('lexicon: price target direction', () => {
  assert.ok(lexiconSentiment('UBS Adjusts EOG Price Target to $190 From $186, Maintains Buy') > 0);
  assert.ok(lexiconSentiment('Citi Adjusts XYZ Price Target to $90 From $110') < 0);
});

import { parseGoogleNewsRss, cleanCompanyName, mergeNews } from '../src/providers/googlenews.js';
test('google news: parse rss + clean name + dedupe', () => {
  const xml = `<rss><channel><item><title>Apple beats estimates - Bloomberg</title><link>https://news.google.com/x</link><pubDate>Mon, 09 Nov 2026 15:00:00 GMT</pubDate><source url="https://www.bloomberg.com">Bloomberg</source></item></channel></rss>`;
  const n = parseGoogleNewsRss(xml);
  assert.equal(n.length, 1);
  assert.equal(n[0].headline, 'Apple beats estimates');
  assert.equal(n[0].source, 'Bloomberg');
  assert.equal(cleanCompanyName('Apple Inc.'), 'Apple');
  assert.equal(cleanCompanyName('Marathon Petroleum Corporation'), 'Marathon Petroleum');
  assert.equal(mergeNews(n, n).length, 1);
});

import { isJunkHeadline } from '../src/providers/googlenews.js';
test('google news: junk filter', () => {
  assert.ok(isJunkHeadline('Abbott Laboratories (ABT) Stock Price, News, Quote & History'));
  assert.ok(!isJunkHeadline('3M stock soars after settlement'));
});
