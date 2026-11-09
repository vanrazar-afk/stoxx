import type { Factor, Fundamentals, PillarResult } from '../types.js';
import { clamp, round } from '../indicators.js';
import { PILLAR_MAX } from './technical.js';

export interface SectorContext {
  pe: number | null; // sector median trailing P/E (positive earners only)
  netMargin: number | null;
  revenueGrowthYoY: number | null;
}

const pct = (x: number | null, d = 1) => (x === null ? 'אין נתון' : `${round(x * 100, d)}%`);

/**
 * Fundamental pillar (max 33.33 points) — evaluated RELATIVE to the stock's sector
 * so a 30 P/E software company is not punished vs a 10 P/E bank.
 *
 *  P/E relative to sector median        25
 *  PEG                                  15
 *  Revenue growth vs sector             15
 *  EPS growth                           10
 *  Net margin vs sector                 10
 *  Debt / Equity                        10
 *  Free-cash-flow yield                 10
 *  ROE                                   5
 */
export function scoreFundamental(f: Fundamentals, sector: SectorContext, sectorName: string): PillarResult {
  const factors: Factor[] = [];

  // P/E relative
  {
    let pts = 0;
    let v = 'אין נתון';
    if (f.pe !== null && f.pe <= 0) {
      v = 'הפסדית';
    } else if (f.pe !== null) {
      const rel = sector.pe ? f.pe / sector.pe : null;
      v = `${round(f.pe, 1)}${sector.pe ? ` (ענף ${round(sector.pe, 1)})` : ''}`;
      if (rel === null) pts = f.pe < 20 ? 15 : f.pe < 35 ? 8 : 2;
      else if (rel <= 0.7) pts = 25;
      else if (rel <= 0.9) pts = 20;
      else if (rel <= 1.1) pts = 14;
      else if (rel <= 1.4) pts = 7;
      else pts = 2;
    }
    factors.push({ key: 'pe', label: 'מכפיל רווח (P/E) מול הענף', value: v, points: pts, max: 25, signal: sig(pts, 25) });
  }

  // PEG
  {
    let pts = 0;
    if (f.peg !== null && f.peg > 0) pts = f.peg <= 1 ? 15 : f.peg <= 1.5 ? 10 : f.peg <= 2.5 ? 5 : 1;
    factors.push({ key: 'peg', label: 'PEG (מכפיל/צמיחה)', value: f.peg !== null ? `${round(f.peg, 2)}` : 'אין נתון', points: pts, max: 15, signal: sig(pts, 15) });
  }

  // Revenue growth vs sector
  {
    let pts = 0;
    const g = f.revenueGrowthYoY;
    if (g !== null) {
      const base = sector.revenueGrowthYoY ?? 0.05;
      if (g >= base + 0.1) pts = 15;
      else if (g >= base) pts = 11;
      else if (g >= 0) pts = 6;
      else pts = 0;
    }
    factors.push({ key: 'rev', label: 'צמיחה בהכנסות (שנתי)', value: pct(g), points: pts, max: 15, signal: sig(pts, 15) });
  }

  // EPS growth
  {
    const g = f.epsGrowthYoY;
    const pts = g === null ? 0 : g >= 0.2 ? 10 : g >= 0.08 ? 7 : g >= 0 ? 4 : 0;
    factors.push({ key: 'eps', label: 'צמיחה ברווח למניה', value: pct(g), points: pts, max: 10, signal: sig(pts, 10) });
  }

  // Net margin vs sector
  {
    const m = f.netMargin;
    let pts = 0;
    if (m !== null) {
      const base = sector.netMargin ?? 0.08;
      pts = m >= base * 1.3 ? 10 : m >= base ? 7 : m > 0 ? 3 : 0;
    }
    factors.push({ key: 'margin', label: 'שולי רווח נקי מול הענף', value: pct(m), points: pts, max: 10, signal: sig(pts, 10) });
  }

  // Debt/Equity — financials naturally carry leverage, soften there
  {
    const d = f.debtToEquity;
    const fin = /financ/i.test(sectorName);
    let pts = 0;
    if (d !== null) {
      if (fin) pts = d < 3 ? 8 : 4;
      else pts = d < 0.5 ? 10 : d < 1 ? 7 : d < 2 ? 3 : 0;
    }
    factors.push({ key: 'de', label: 'חוב להון', value: d !== null ? `${round(d, 2)}` : 'אין נתון', points: pts, max: 10, signal: sig(pts, 10) });
  }

  // FCF yield
  {
    const y = f.fcfYield;
    const pts = y === null ? 0 : y >= 0.06 ? 10 : y >= 0.03 ? 7 : y > 0 ? 4 : 0;
    factors.push({ key: 'fcf', label: 'תשואת תזרים חופשי', value: pct(y), points: pts, max: 10, signal: sig(pts, 10) });
  }

  // ROE
  {
    const r = f.roe;
    const pts = r === null ? 0 : r >= 0.2 ? 5 : r >= 0.1 ? 3 : r > 0 ? 1 : 0;
    factors.push({ key: 'roe', label: 'תשואה על ההון (ROE)', value: pct(r), points: pts, max: 5, signal: sig(pts, 5) });
  }

  const raw = factors.reduce((a, x) => a + x.points, 0);
  const score = round(clamp(raw, 0, 100) * (PILLAR_MAX / 100), 2);
  return { score, factors, summary: fundamentalSummary(factors, raw, sectorName) };
}

function sig(pts: number, max: number): Factor['signal'] {
  const r = pts / max;
  return r >= 0.6 ? 'positive' : r >= 0.3 ? 'neutral' : 'negative';
}

export const SECTOR_HE: Record<string, string> = {
  Technology: 'הטכנולוגיה',
  'Communication Services': 'התקשורת',
  'Consumer Cyclical': 'הצריכה המחזורית',
  'Consumer Defensive': 'הצריכה הבסיסית',
  'Financial Services': 'הפיננסים',
  Healthcare: 'הבריאות',
  Energy: 'האנרגיה',
  Industrials: 'התעשייה',
  'Basic Materials': 'חומרי הגלם',
  'Real Estate': 'הנדל"ן',
  Utilities: 'התשתיות',
};

function fundamentalSummary(f: Factor[], raw: number, sectorEn: string): string {
  const sector = SECTOR_HE[sectorEn] ?? sectorEn;
  const g = (k: string) => f.find((x) => x.key === k)!;
  const s: string[] = [];
  const pe = g('pe');
  if (pe.value === 'הפסדית') s.push('החברה אינה רווחית כרגע, ולכן מכפיל הרווח אינו רלוונטי.');
  else if (pe.points >= 20) s.push(`התמחור אטרקטיבי ביחס לענף ${sector}: מכפיל ${pe.value}.`);
  else if (pe.points <= 7) s.push(`התמחור גבוה ביחס לענף ${sector}: מכפיל ${pe.value}.`);
  else s.push(`התמחור דומה לממוצע בענף ${sector}.`);
  if (g('rev').points >= 11) s.push(`ההכנסות צומחות בקצב של ${g('rev').value}, מעל הענף.`);
  else if (g('rev').points === 0) s.push('ההכנסות מתכווצות.');
  if (g('de').points <= 3) s.push('רמת המינוף גבוהה יחסית.');
  if (g('fcf').points >= 7) s.push('החברה מייצרת תזרים מזומנים חופשי בריא.');
  s.push(raw >= 65 ? 'פרופיל פונדמנטלי חזק.' : raw >= 40 ? 'פרופיל פונדמנטלי סביר.' : 'פרופיל פונדמנטלי חלש.');
  return s.join(' ');
}
