import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import type { ChartFile, DailyReport, StockScore } from './types';
// Bundled fallback: a real market snapshot (or synthetic demo data, flagged by `source`)
import demo from '../data/demo-daily.json';

/**
 * Where the daily report comes from:
 *   1. EXPO_PUBLIC_DATA_URL env var, or app.json → extra.dataUrl  (the published engine output)
 *   2. Otherwise → bundled demo file (synthetic data, clearly labelled in the UI)
 */
const DATA_URL: string = process.env.EXPO_PUBLIC_DATA_URL || (Constants.expoConfig?.extra?.dataUrl as string) || '';
const CACHE_KEY = 'stoxx-report-cache';
/** Folder that holds daily.json and charts/<SYMBOL>.json */
export const DATA_BASE = DATA_URL ? DATA_URL.replace(/[^/]*$/, '') : '';

const chartCache = new Map<string, { at: number; file: ChartFile }>();

/** Loads the per-stock price-history file (refreshed by the engine every ~20 minutes). */
export function useChart(symbol: string) {
  const [file, setFile] = useState<ChartFile | null>(chartCache.get(symbol)?.file ?? null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>(chartCache.has(symbol) ? 'ready' : 'loading');
  useEffect(() => {
    let alive = true;
    const hit = chartCache.get(symbol);
    if (hit && Date.now() - hit.at < 5 * 60 * 1000) return;
    if (!DATA_BASE) {
      setState('unavailable');
      return;
    }
    fetch(`${DATA_BASE}charts/${encodeURIComponent(symbol)}.json?t=${Math.floor(Date.now() / 300000)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((f: ChartFile) => {
        chartCache.set(symbol, { at: Date.now(), file: f });
        if (alive) {
          setFile(f);
          setState('ready');
        }
      })
      .catch(() => alive && !hit && setState('unavailable'));
    return () => {
      alive = false;
    };
  }, [symbol]);
  return { file, state };
}

interface DataState {
  report: DailyReport;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  bySymbol: (s: string) => StockScore | undefined;
}

const Ctx = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [report, setReport] = useState<DailyReport>(demo as unknown as DailyReport);
  const [isDemo, setIsDemo] = useState(!DATA_URL && (demo as { source?: string }).source !== 'live-snapshot');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!DATA_URL) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${DATA_URL}${DATA_URL.includes('?') ? '&' : '?'}t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DailyReport;
      setReport(json);
      setIsDemo(false);
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(json)).catch(() => {});
    } catch (e) {
      setError('load_error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!DATA_URL) return;
      const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
      if (cached) {
        setReport(JSON.parse(cached));
        setIsDemo(false);
      }
      refresh();
    })();
  }, [refresh]);

  // Keep fresh: re-check every 10 minutes while open, and whenever the app returns to the foreground.
  useEffect(() => {
    if (!DATA_URL) return;
    const id = setInterval(refresh, 10 * 60 * 1000);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refresh());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [refresh]);

  const bySymbol = useCallback((s: string) => report.top.find((t) => t.symbol === s), [report]);

  return <Ctx.Provider value={{ report, isDemo, loading, error, refresh, bySymbol }}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}
