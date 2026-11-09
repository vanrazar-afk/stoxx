import type { Candle, Levels } from '../types.js';
import { atr, sma, last, round } from '../indicators.js';

/**
 * Technical exit levels (NOT a forecast):
 *  - Stop:   2×ATR(14) under the close, or just under SMA100 if that support is closer (min 1×ATR).
 *  - Target: nearest meaningful resistance (60-day / 52-week high) if it offers ≥1.5R,
 *            otherwise a 2R projection. Capped at 3R so targets stay realistic.
 */
export function computeLevels(candles: Candle[]): Levels {
  const entry = last(candles).close;
  const a = atr(candles, 14) || entry * 0.02;
  const s100 = last(sma(candles.map((c) => c.close), 100));

  let stop = entry - 2 * a;
  let method = 'סטופ: 2×ATR מתחת למחיר';
  if (s100 !== null && s100 < entry && s100 * 0.99 > stop && entry - s100 * 0.99 >= a) {
    stop = s100 * 0.99;
    method = 'סטופ: מתחת לממוצע 100';
  }
  const risk = entry - stop;

  const hi60 = Math.max(...candles.slice(-60).map((c) => c.high));
  const hi252 = Math.max(...candles.slice(-252).map((c) => c.high));
  const candidates = [hi60, hi252].filter((h) => h >= entry + 1.5 * risk && h <= entry + 3 * risk).sort((x, y) => x - y);
  let target: number;
  if (candidates.length) {
    target = candidates[0];
    method += candidates[0] === hi60 ? ' · יעד: שיא 60 יום (התנגדות)' : ' · יעד: שיא 52 שבועות (התנגדות)';
  } else {
    target = entry + 2 * risk;
    method += ' · יעד: יחס סיכוי/סיכון 1:2';
  }

  return {
    entry: round(entry),
    target: round(target),
    stop: round(stop),
    riskReward: round((target - entry) / risk, 2),
    atr: round(a),
    method,
  };
}
