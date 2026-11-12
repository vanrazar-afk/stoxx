/**
 * Deterministic synthetic data for development, tests and the app's offline demo mode.
 * Prices, fundamentals and headlines are GENERATED — not real market data.
 */
import type { Candle, NewsItem, StockInput } from '../types.js';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UNIVERSE: [string, string, string, string][] = [
  ['AAPL', 'Apple', 'Technology', 'Consumer Electronics'],
  ['MSFT', 'Microsoft', 'Technology', 'Software'],
  ['NVDA', 'NVIDIA', 'Technology', 'Semiconductors'],
  ['AMZN', 'Amazon', 'Consumer Cyclical', 'Internet Retail'],
  ['GOOGL', 'Alphabet', 'Communication Services', 'Internet Content'],
  ['META', 'Meta Platforms', 'Communication Services', 'Internet Content'],
  ['TSLA', 'Tesla', 'Consumer Cyclical', 'Auto Manufacturers'],
  ['AVGO', 'Broadcom', 'Technology', 'Semiconductors'],
  ['JPM', 'JPMorgan Chase', 'Financial Services', 'Banks'],
  ['V', 'Visa', 'Financial Services', 'Credit Services'],
  ['MA', 'Mastercard', 'Financial Services', 'Credit Services'],
  ['UNH', 'UnitedHealth', 'Healthcare', 'Healthcare Plans'],
  ['LLY', 'Eli Lilly', 'Healthcare', 'Drug Manufacturers'],
  ['JNJ', 'Johnson & Johnson', 'Healthcare', 'Drug Manufacturers'],
  ['XOM', 'Exxon Mobil', 'Energy', 'Oil & Gas'],
  ['CVX', 'Chevron', 'Energy', 'Oil & Gas'],
  ['WMT', 'Walmart', 'Consumer Defensive', 'Discount Stores'],
  ['COST', 'Costco', 'Consumer Defensive', 'Discount Stores'],
  ['PG', 'Procter & Gamble', 'Consumer Defensive', 'Household Products'],
  ['KO', 'Coca-Cola', 'Consumer Defensive', 'Beverages'],
  ['PEP', 'PepsiCo', 'Consumer Defensive', 'Beverages'],
  ['HD', 'Home Depot', 'Consumer Cyclical', 'Home Improvement'],
  ['MRK', 'Merck', 'Healthcare', 'Drug Manufacturers'],
  ['ABBV', 'AbbVie', 'Healthcare', 'Drug Manufacturers'],
  ['BAC', 'Bank of America', 'Financial Services', 'Banks'],
  ['ORCL', 'Oracle', 'Technology', 'Software'],
  ['CRM', 'Salesforce', 'Technology', 'Software'],
  ['ADBE', 'Adobe', 'Technology', 'Software'],
  ['AMD', 'AMD', 'Technology', 'Semiconductors'],
  ['NFLX', 'Netflix', 'Communication Services', 'Entertainment'],
  ['INTC', 'Intel', 'Technology', 'Semiconductors'],
  ['CSCO', 'Cisco', 'Technology', 'Communication Equipment'],
  ['QCOM', 'Qualcomm', 'Technology', 'Semiconductors'],
  ['TXN', 'Texas Instruments', 'Technology', 'Semiconductors'],
  ['DIS', 'Disney', 'Communication Services', 'Entertainment'],
  ['NKE', 'Nike', 'Consumer Cyclical', 'Footwear'],
  ['MCD', "McDonald's", 'Consumer Cyclical', 'Restaurants'],
  ['SBUX', 'Starbucks', 'Consumer Cyclical', 'Restaurants'],
  ['BA', 'Boeing', 'Industrials', 'Aerospace & Defense'],
  ['CAT', 'Caterpillar', 'Industrials', 'Machinery'],
  ['GE', 'GE Aerospace', 'Industrials', 'Aerospace & Defense'],
  ['HON', 'Honeywell', 'Industrials', 'Conglomerates'],
  ['UPS', 'UPS', 'Industrials', 'Logistics'],
  ['LMT', 'Lockheed Martin', 'Industrials', 'Aerospace & Defense'],
  ['GS', 'Goldman Sachs', 'Financial Services', 'Capital Markets'],
  ['MS', 'Morgan Stanley', 'Financial Services', 'Capital Markets'],
  ['BLK', 'BlackRock', 'Financial Services', 'Asset Management'],
  ['PFE', 'Pfizer', 'Healthcare', 'Drug Manufacturers'],
  ['TMO', 'Thermo Fisher', 'Healthcare', 'Diagnostics'],
  ['ABT', 'Abbott', 'Healthcare', 'Medical Devices'],
  ['ISRG', 'Intuitive Surgical', 'Healthcare', 'Medical Devices'],
  ['NEE', 'NextEra Energy', 'Utilities', 'Utilities'],
  ['DUK', 'Duke Energy', 'Utilities', 'Utilities'],
  ['LIN', 'Linde', 'Basic Materials', 'Chemicals'],
  ['FCX', 'Freeport-McMoRan', 'Basic Materials', 'Copper'],
  ['PLD', 'Prologis', 'Real Estate', 'REIT'],
  ['AMT', 'American Tower', 'Real Estate', 'REIT'],
  ['CMCSA', 'Comcast', 'Communication Services', 'Telecom'],
  ['T', 'AT&T', 'Communication Services', 'Telecom'],
  ['VZ', 'Verizon', 'Communication Services', 'Telecom'],
  ['PYPL', 'PayPal', 'Financial Services', 'Credit Services'],
  ['UBER', 'Uber', 'Technology', 'Software'],
  ['SHOP', 'Shopify', 'Technology', 'Software'],
  ['NOW', 'ServiceNow', 'Technology', 'Software'],
  ['PANW', 'Palo Alto Networks', 'Technology', 'Software'],
  ['CRWD', 'CrowdStrike', 'Technology', 'Software'],
  ['MU', 'Micron', 'Technology', 'Semiconductors'],
  ['AMAT', 'Applied Materials', 'Technology', 'Semiconductors'],
  ['DE', 'Deere', 'Industrials', 'Machinery'],
  ['RTX', 'RTX', 'Industrials', 'Aerospace & Defense'],
  ['SCHW', 'Charles Schwab', 'Financial Services', 'Capital Markets'],
  ['C', 'Citigroup', 'Financial Services', 'Banks'],
  ['WFC', 'Wells Fargo', 'Financial Services', 'Banks'],
  ['COP', 'ConocoPhillips', 'Energy', 'Oil & Gas'],
  ['SLB', 'SLB', 'Energy', 'Oil Services'],
  ['TGT', 'Target', 'Consumer Defensive', 'Discount Stores'],
  ['LOW', "Lowe's", 'Consumer Cyclical', 'Home Improvement'],
  ['BKNG', 'Booking Holdings', 'Consumer Cyclical', 'Travel Services'],
  ['ABNB', 'Airbnb', 'Consumer Cyclical', 'Travel Services'],
  ['TEVA', 'Teva', 'Healthcare', 'Drug Manufacturers'],
];

const SOURCES = ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'Yahoo Finance', 'WSJ', "Barron's", 'Financial Times', 'Seeking Alpha', 'Benzinga'];
const POS_T = [
  '{n} beats quarterly estimates, raises guidance',
  '{n} shares jump on strong demand',
  'Analyst upgrade: {n} to outperform',
  '{n} announces $5B buyback program',
  '{n} wins major contract, expands partnership',
];
const NEG_T = [
  '{n} misses revenue estimates, shares fall',
  '{n} downgraded on weak demand',
  'Regulators open probe into {n}',
  '{n} cuts guidance amid slowing sales',
];
const NEU_T = ['{n} to present at industry conference', '{n} names new board member', 'What to watch in {n} earnings next month'];

function genCandles(r: () => number, days: number, start: number, drift: number, vol: number, endDate: Date, pattern: number): Candle[] {
  const out: Candle[] = [];
  let p = start;
  const d = new Date(endDate);
  const dates: string[] = [];
  while (dates.length < days) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) dates.unshift(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  for (let i = 0; i < days; i++) {
    let ret = drift + vol * (r() * 2 - 1) * 1.7;
    // Pattern injection on the final days: red streak then green
    const fromEnd = days - 1 - i;
    if (pattern > 0 && fromEnd >= 1 && fromEnd <= pattern) ret = -Math.abs(vol) * (0.6 + r() * 0.6);
    if (pattern > 0 && fromEnd === 0) ret = Math.abs(vol) * (1 + r());
    const open = p * (1 + (r() - 0.5) * vol * 0.4);
    const close = Math.max(1, p * (1 + ret));
    const isUp = ret >= 0;
    const o = isUp ? Math.min(open, close * 0.998) : Math.max(open, close * 1.002);
    const high = Math.max(o, close) * (1 + r() * vol * 0.6);
    const low = Math.min(o, close) * (1 - r() * vol * 0.6);
    const volume = Math.round(5e6 * (0.6 + r()) * (fromEnd === 0 && pattern ? 1.6 : 1));
    out.push({ date: dates[i], open: +o.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume });
    p = close;
  }
  return out;
}

export function mockUniverse(asOf = new Date(), seed = 42): StockInput[] {
  return UNIVERSE.map(([symbol, name, sector, industry], idx) => {
    const r = rng(seed * 1000 + idx * 7919);
    const drift = (r() - 0.35) * 0.0016;
    const vol = 0.008 + r() * 0.018;
    const start = 20 + r() * 480;
    const pattern = r() < 0.35 ? 2 + Math.floor(r() * 3) : 0;
    const candles = genCandles(r, 300, start, drift, vol, asOf, pattern);
    const mood = r(); // news mood
    const news: NewsItem[] = [];
    const count = Math.floor(r() * 7);
    for (let k = 0; k < count; k++) {
      const roll = r();
      const pool = roll < mood * 0.9 ? POS_T : roll > 0.85 ? NEG_T : NEU_T;
      const t = pool[Math.floor(r() * pool.length)].replace('{n}', name);
      news.push({
        headline: t,
        source: SOURCES[Math.floor(r() * SOURCES.length)],
        url: `https://example.com/demo/${symbol.toLowerCase()}/${k}`,
        datetime: new Date(asOf.getTime() - r() * 6 * 864e5).toISOString(),
      });
    }
    const pe = r() < 0.08 ? -5 : 8 + r() * 45;
    // Synthetic range-chart series (demo only)
    const last = candles.at(-1)!;
    const endTs = Math.floor(new Date(`${last.date}T21:00:00Z`).getTime() / 1000);
    const intraday: [number, number][] = [];
    let p = candles.at(-6)!.close;
    for (let d = 4; d >= 0; d--) {
      const dayClose = candles.at(-1 - d)!.close;
      for (let k = 0; k < 26; k++) {
        p += (dayClose - p) / (26 - k) + (r() - 0.5) * vol * p * 0.3;
        intraday.push([endTs - d * 86400 - (25 - k) * 900 - 6.5 * 3600 + 23400, +p.toFixed(2)]);
      }
    }
    const weekly: [number, number][] = [];
    let w = last.close / (1 + drift * 1260 + 0.0001);
    for (let k = 259; k >= 0; k--) {
      w *= 1 + drift * 5 + vol * 2 * (r() - 0.5);
      weekly.push([endTs - k * 7 * 86400, +Math.max(1, w).toFixed(2)]);
    }
    weekly[weekly.length - 1][1] = last.close;
    return {
      charts: { intraday, weekly },
      profile: { symbol, name, sector, industry, exchange: 'NASDAQ' },
      candles,
      fundamentals: {
        pe: +pe.toFixed(1),
        forwardPe: pe > 0 ? +(pe * (0.75 + r() * 0.3)).toFixed(1) : null,
        peg: pe > 0 ? +(0.5 + r() * 2.8).toFixed(2) : null,
        revenueGrowthYoY: +((r() - 0.2) * 0.4).toFixed(3),
        epsGrowthYoY: +((r() - 0.25) * 0.6).toFixed(3),
        netMargin: +((r() - 0.05) * 0.35).toFixed(3),
        roe: +((r() - 0.05) * 0.45).toFixed(3),
        debtToEquity: +(r() * 2.5).toFixed(2),
        fcfYield: +((r() - 0.15) * 0.09).toFixed(3),
        marketCap: Math.round((20 + r() * 2500) * 1e9),
        analystTarget: +(candles.at(-1)!.close * (0.9 + r() * 0.4)).toFixed(2),
        nextEarningsDate: r() < 0.15 ? new Date(asOf.getTime() + (1 + r() * 5) * 864e5).toISOString().slice(0, 10) : null,
      },
      news,
    };
  });
}
