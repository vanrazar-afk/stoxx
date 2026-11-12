import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop, Circle } from 'react-native-svg';
import { useChart } from '@/lib/data';
import { useT } from '@/lib/i18n';
import type { Series } from '@/lib/types';
import { colors, radius } from '@/lib/theme';
import { usd } from '@/lib/format';
import { T, N, Row, Card } from './ui';

type RangeKey = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y';
const RANGES: { key: RangeKey; he: string; en: string }[] = [
  { key: '1D', he: 'יום', en: '1D' },
  { key: '5D', he: '5 ימים', en: '5D' },
  { key: '1M', he: 'חודש', en: '1M' },
  { key: '6M', he: '6 חודשים', en: '6M' },
  { key: 'YTD', he: 'מתחילת השנה', en: 'YTD' },
  { key: '1Y', he: 'שנה', en: '1Y' },
  { key: '5Y', he: '5 שנים', en: '5Y' },
];

const nyDate = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

/** Price over time with the usual range tabs (1D … 5Y). Drag on the chart to read a price. */
export function PriceChart({ symbol }: { symbol: string }) {
  const t = useT();
  const { file, state } = useChart(symbol);
  const [range, setRange] = useState<RangeKey>('1D');
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const H = 190;

  const { series, base } = useMemo(() => {
    if (!file) return { series: [] as Series, base: null as number | null };
    const d = file.daily;
    const prevClose = d.length >= 2 ? d[d.length - 2][1] : null;
    switch (range) {
      case '1D': {
        const last = file.intraday.at(-1);
        if (!last) return { series: d.slice(-2), base: prevClose };
        const day = nyDate(last[0]);
        const s = file.intraday.filter((p) => nyDate(p[0]) === day);
        // Base = previous session close, like every quote app
        const prev = file.intraday.filter((p) => nyDate(p[0]) < day).at(-1)?.[1] ?? prevClose;
        return { series: s, base: prev };
      }
      case '5D':
        return { series: file.intraday.length ? file.intraday : d.slice(-5), base: null };
      case '1M':
        return { series: d.slice(-22), base: null };
      case '6M':
        return { series: d.slice(-126), base: null };
      case 'YTD': {
        const y = new Date().getFullYear();
        const start = Date.UTC(y, 0, 1) / 1000;
        const s = d.filter((p) => p[0] >= start);
        return { series: s.length > 1 ? s : d.slice(-22), base: d.filter((p) => p[0] < start).at(-1)?.[1] ?? null };
      }
      case '1Y':
        return { series: d, base: null };
      case '5Y':
        return { series: file.weekly.length ? file.weekly : d, base: null };
    }
  }, [file, range]);

  const first = base ?? series[0]?.[1] ?? 0;
  const lastPt = series.at(-1);
  const shown = hover !== null ? series[hover] : lastPt;
  const change = shown ? shown[1] - first : 0;
  const changePct = first ? (change / first) * 100 : 0;
  const up = change >= 0;
  const col = up ? colors.up : colors.down;

  const geom = useMemo(() => {
    if (series.length < 2 || !w) return null;
    const vals = series.map((p) => p[1]).concat(base ? [base] : []);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const x = (i: number) => (i / (series.length - 1)) * w;
    const y = (v: number) => 8 + (1 - (v - min) / span) * (H - 16);
    const d = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
    return { d, x, y };
  }, [series, w, base]);

  const fmtTs = (ts: number) => {
    const dt = new Date(ts * 1000);
    const loc = t.lang === 'he' ? 'he-IL' : 'en-US';
    if (range === '1D') return dt.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    if (range === '5D') return dt.toLocaleString(loc, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return dt.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: range === '5Y' || range === '1Y' ? '2-digit' : undefined });
  };

  const onMove = (lx: number) => {
    if (!geom || series.length < 2) return;
    // In RTL layouts the touch x is still measured from the chart's left edge
    const i = Math.round((Math.max(0, Math.min(w, lx)) / w) * (series.length - 1));
    setHover(i);
  };

  const rangeLabel = RANGES.find((r) => r.key === range)![t.lang];

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View>
          <T size={12} color={colors.textDim}>
            {t('price_history')}
          </T>
          {shown && (
            <>
              <N w="black" size={22}>
                {usd(shown[1])}
              </N>
              <N size={13} w="bold" color={col}>
                {up ? '+' : ''}
                {change.toFixed(2)} ({up ? '+' : ''}
                {changePct.toFixed(2)}%)
              </N>
            </>
          )}
        </View>
        {shown && (
          <T size={12} color={colors.textDim} style={{ marginTop: 4 }}>
            {hover !== null ? fmtTs(shown[0]) : rangeLabel}
          </T>
        )}
      </Row>

      <View
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        style={{ height: H, direction: 'ltr' } as object}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => onMove(e.nativeEvent.locationX)}
        onResponderMove={(e) => onMove(e.nativeEvent.locationX)}
        onResponderRelease={() => setHover(null)}
        onResponderTerminate={() => setHover(null)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={
          shown ? `${t('price_history')} ${rangeLabel}: ${usd(shown[1])}, ${up ? '+' : ''}${changePct.toFixed(2)}%` : t('chart_unavailable')
        }
      >
        {state === 'loading' && !file ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.brand2} />
          </View>
        ) : !geom ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <T size={13} color={colors.textDim}>
              {t('chart_unavailable')}
            </T>
          </View>
        ) : (
          <Svg width={w} height={H}>
            <Defs>
              <LinearGradient id={`pc-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={col} stopOpacity={0.28} />
                <Stop offset="1" stopColor={col} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {base !== null && (
              <Line x1={0} x2={w} y1={geom.y(base)} y2={geom.y(base)} stroke={colors.textMute} strokeDasharray="3 4" strokeWidth={1} />
            )}
            <Path d={`${geom.d} L${w},${H} L0,${H} Z`} fill={`url(#pc-${symbol})`} />
            <Path d={geom.d} stroke={col} strokeWidth={2} fill="none" strokeLinejoin="round" />
            {hover !== null && series[hover] && (
              <>
                <Line x1={geom.x(hover)} x2={geom.x(hover)} y1={0} y2={H} stroke={colors.textDim} strokeWidth={1} />
                <Circle cx={geom.x(hover)} cy={geom.y(series[hover][1])} r={4.5} fill={col} stroke={colors.bg} strokeWidth={2} />
              </>
            )}
          </Svg>
        )}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }} accessibilityRole="tablist">
        {RANGES.map((r) => {
          const active = r.key === range;
          return (
            <Pressable
              key={r.key}
              onPress={() => {
                setRange(r.key);
                setHover(null);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={r[t.lang]}
              style={{
                minHeight: 36,
                minWidth: 44,
                paddingHorizontal: 10,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: radius.sm,
                backgroundColor: active ? colors.cardHi : 'transparent',
                borderWidth: 1,
                borderColor: active ? colors.brand2 : colors.border,
              }}
            >
              <T size={12} w={active ? 'bold' : 'medium'} color={active ? colors.text : colors.textDim}>
                {r[t.lang]}
              </T>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
