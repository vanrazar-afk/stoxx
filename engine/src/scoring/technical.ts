import type { Candle, Factor, PillarResult } from '../types.js';
import { sma, rsi, macd, redStreakBeforeLast, last, clamp, round } from '../indicators.js';

export const PILLAR_MAX = 100 / 3;

/**
 * Technical pillar (max 33.33 points).
 * Raw points out of 100, then scaled to a third of the total score.
 *
 *  1. Long-term trend: price above SMA200                       15
 *  2. Trend structure: SMA50 above SMA200 (golden alignment)     10
 *  3. Pullback to SMA100: price approaching SMA100 from above    20
 *  4. Reversal candles: >=2 red days followed by a green day     20
 *  5. RSI(14) in a healthy zone / recovering from oversold        15
 *  6. MACD histogram turning up                                   10
 *  7. Volume confirmation on the last day                         10
 */
export function scoreTechnical(candles: Candle[]): PillarResult {
  const closes = candles.map((c) => c.close);
  const price = last(closes);
  const s50 = last(sma(closes, 50));
  const s100 = last(sma(closes, 100));
  const s200 = last(sma(closes, 200));
  const r = rsi(closes, 14);
  const rNow = last(r);
  const rMin5 = Math.min(...(r.slice(-6, -1).filter((x) => x !== null) as number[]));
  const { hist } = macd(closes);
  const hNow = last(hist);
  const hPrev = hist[hist.length - 2];
  const vol20 = sma(candles.map((c) => c.volume), 20);
  const avgVol = vol20[vol20.length - 2];
  const lastVol = last(candles).volume;
  const { lastGreen, redStreak } = redStreakBeforeLast(candles);

  const factors: Factor[] = [];

  // 1. above SMA200
  {
    const ok = s200 !== null && price > s200;
    const dist = s200 ? (price / s200 - 1) * 100 : 0;
    factors.push({
      key: 'sma200',
      label: 'מחיר מעל ממוצע 200',
      value: s200 ? `${round(dist, 1)}%` : 'אין נתון',
      points: ok ? 15 : 0,
      max: 15,
      signal: ok ? 'positive' : 'negative',
    });
  }

  // 2. SMA50 > SMA200
  {
    const ok = s50 !== null && s200 !== null && s50 > s200;
    factors.push({
      key: 'golden',
      label: 'ממוצע 50 מעל ממוצע 200',
      value: ok ? 'כן' : 'לא',
      points: ok ? 10 : 0,
      max: 10,
      signal: ok ? 'positive' : 'negative',
    });
  }

  // 3. Approaching SMA100 from above: best when 0%–3% above, partial up to 6%, small if just under (testing support)
  {
    let pts = 0;
    let sig: Factor['signal'] = 'neutral';
    const d = s100 ? (price / s100 - 1) * 100 : NaN;
    if (Number.isFinite(d)) {
      if (d >= 0 && d <= 3) pts = 20;
      else if (d > 3 && d <= 6) pts = 12;
      else if (d < 0 && d >= -2) pts = 8; // testing support from below
      else if (d > 6 && d <= 12) pts = 5;
      sig = pts >= 12 ? 'positive' : pts === 0 ? 'negative' : 'neutral';
    }
    factors.push({
      key: 'sma100',
      label: 'מרחק מממוצע 100',
      value: Number.isFinite(d) ? `${d >= 0 ? '+' : ''}${round(d, 1)}%` : 'אין נתון',
      points: pts,
      max: 20,
      signal: sig,
    });
  }

  // 4. Red streak then green day
  {
    let pts = 0;
    if (lastGreen && redStreak >= 3) pts = 20;
    else if (lastGreen && redStreak === 2) pts = 14;
    else if (lastGreen && redStreak === 1) pts = 6;
    factors.push({
      key: 'candles',
      label: 'נרות אדומים לפני יום ירוק אחרון',
      value: lastGreen ? `${redStreak} אדומים ← ירוק` : 'היום האחרון אינו ירוק',
      points: pts,
      max: 20,
      signal: pts >= 14 ? 'positive' : pts > 0 ? 'neutral' : 'negative',
    });
  }

  // 5. RSI
  {
    let pts = 0;
    let note = '';
    if (rNow !== null) {
      if (rMin5 < 35 && rNow > rMin5 + 5 && rNow < 60) {
        pts = 15;
        note = 'יציאה ממכירת יתר';
      } else if (rNow >= 40 && rNow <= 60) {
        pts = 11;
        note = 'אזור מאוזן';
      } else if (rNow > 60 && rNow <= 70) {
        pts = 6;
        note = 'מומנטום חזק';
      } else if (rNow > 70) {
        pts = 0;
        note = 'קניית יתר';
      } else {
        pts = 4;
        note = 'חלש';
      }
    }
    factors.push({
      key: 'rsi',
      label: 'RSI(14)',
      value: rNow !== null ? `${round(rNow, 0)} · ${note}` : 'אין נתון',
      points: pts,
      max: 15,
      signal: pts >= 11 ? 'positive' : pts >= 4 ? 'neutral' : 'negative',
    });
  }

  // 6. MACD histogram turning up
  {
    let pts = 0;
    let v = 'אין נתון';
    if (hNow !== null && hPrev !== null) {
      if (hPrev <= 0 && hNow > 0) {
        pts = 10;
        v = 'חצייה כלפי מעלה';
      } else if (hNow > hPrev) {
        pts = 6;
        v = 'משתפר';
      } else {
        v = 'נחלש';
      }
    }
    factors.push({ key: 'macd', label: 'MACD', value: v, points: pts, max: 10, signal: pts >= 6 ? 'positive' : 'negative' });
  }

  // 7. Volume
  {
    const ratio = avgVol ? lastVol / avgVol : 0;
    let pts = 0;
    if (lastGreen && ratio >= 1.3) pts = 10;
    else if (lastGreen && ratio >= 1.0) pts = 6;
    else if (ratio >= 1.0) pts = 2;
    factors.push({
      key: 'volume',
      label: 'מחזור יומי מול ממוצע 20',
      value: avgVol ? `x${round(ratio, 2)}` : 'אין נתון',
      points: pts,
      max: 10,
      signal: pts >= 6 ? 'positive' : pts > 0 ? 'neutral' : 'negative',
    });
  }

  const raw = factors.reduce((a, f) => a + f.points, 0);
  const score = round(clamp(raw, 0, 100) * (PILLAR_MAX / 100), 2);
  return { score, factors, summary: technicalSummary(factors, raw) };
}

function technicalSummary(f: Factor[], raw: number): string {
  const get = (k: string) => f.find((x) => x.key === k)!;
  const parts: string[] = [];
  const trendUp = get('sma200').points > 0 && get('golden').points > 0;
  parts.push(trendUp ? 'המניה במגמה עולה ארוכת טווח (מעל ממוצע 200, וממוצע 50 מעליו).' : get('sma200').points > 0 ? 'המחיר מעל ממוצע 200, אך מבנה הממוצעים עדיין לא אישר מגמה עולה מלאה.' : 'המחיר מתחת לממוצע 200 — המגמה ארוכת הטווח חלשה.');
  if (get('sma100').points >= 12) parts.push(`המחיר מתקרב לממוצע 100 (${get('sma100').value}), אזור שמשמש לעיתים קרובות כתמיכה.`);
  if (get('candles').points >= 14) parts.push(`נרשם דפוס היפוך אפשרי: ${get('candles').value}.`);
  if (get('rsi').points === 0) parts.push('RSI מעיד על קניית יתר — סיכון לתיקון.');
  parts.push(raw >= 70 ? 'תמונה טכנית חיובית.' : raw >= 45 ? 'תמונה טכנית מעורבת.' : 'תמונה טכנית חלשה.');
  return parts.join(' ');
}
