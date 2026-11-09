import { useMemo } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useApp, type Lot } from '@/lib/store';
import { useData } from '@/lib/data';
import { colors, radius, scoreColor, space } from '@/lib/theme';
import { useT, sectorName } from '@/lib/i18n';
import { pct, usd, usdCompact } from '@/lib/format';
import { T, N, Row, Card, Button, SectionTitle, Disclaimer, Delta } from '@/components/ui';
import { ScoreRing } from '@/components/charts';

const PALETTE = ['#7C5CFF', '#3DD6F5', '#2BD98B', '#FFB547', '#FF5C7A', '#A78BFA', '#5EEAD4', '#F472B6', '#FACC15', '#60A5FA'];

interface Position {
  symbol: string;
  name: string;
  qty: number;
  cost: number;
  price: number | null;
  dayPct: number;
  score: number | null;
  sector: string;
  lots: Lot[];
}

export default function Portfolio() {
  const t = useT();
  const lots = useApp((s) => s.lots);
  const removeLot = useApp((s) => s.removeLot);
  const { report, bySymbol } = useData();

  const positions = useMemo<Position[]>(() => {
    const m = new Map<string, Position>();
    for (const l of lots) {
      const q = report.quotes[l.symbol];
      const top = bySymbol(l.symbol);
      const p = m.get(l.symbol) ?? {
        symbol: l.symbol,
        name: q?.name ?? l.name,
        qty: 0,
        cost: 0,
        price: q?.price ?? null,
        dayPct: q?.changePct ?? 0,
        score: top?.score ?? null,
        sector: top?.sector ?? 'Other',
        lots: [],
      };
      p.qty += l.qty;
      p.cost += l.qty * l.price;
      p.lots.push(l);
      m.set(l.symbol, p);
    }
    return [...m.values()];
  }, [lots, report, bySymbol]);

  const value = positions.reduce((a, p) => a + p.qty * (p.price ?? p.cost / p.qty), 0);
  const cost = positions.reduce((a, p) => a + p.cost, 0);
  const pl = value - cost;
  const dayPl = positions.reduce((a, p) => a + (p.price ? p.qty * p.price * (p.dayPct / (100 + p.dayPct)) : 0), 0);
  const scored = positions.filter((p) => p.score !== null && p.price);
  const scoredValue = scored.reduce((a, p) => a + p.qty * p.price!, 0);
  const portfolioScore = scoredValue ? Math.round(scored.reduce((a, p) => a + p.score! * p.qty * p.price!, 0) / scoredValue) : null;

  const bySector = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of positions) m.set(p.sector, (m.get(p.sector) ?? 0) + p.qty * (p.price ?? p.cost / p.qty));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [positions]);

  const confirmRemove = (p: Position) => {
    const doIt = () => p.lots.forEach((l) => removeLot(l.id));
    if (Platform.OS === 'web') {
      doIt(); // web: browsers in sandboxed previews block confirm()
    } else {
      Alert.alert(t('pf_delete_t'), t('pf_delete_b', { s: p.symbol }), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: doIt },
      ]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12) }}>
        <LinearGradient colors={['#123A4A', '#141C33']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ borderRadius: radius.xl, padding: space(5), gap: 6 }}>
          <T size={13} color={colors.textDim}>{t('pf_value')}</T>
          <N w="black" size={34}>{usd(value)}</N>
          <Row style={{ gap: 10, flexWrap: 'wrap' }}>
            <N w="bold" color={pl >= 0 ? colors.up : colors.down}>
              {pl >= 0 ? '+' : ''}{usd(pl)} ({cost ? pct((pl / cost) * 100) : '0%'})
            </N>
            <T size={13} color={colors.textDim}>{t('pf_total')}</T>
            <N w="bold" color={dayPl >= 0 ? colors.up : colors.down}>{dayPl >= 0 ? '+' : ''}{usd(dayPl)}</N>
            <T size={13} color={colors.textDim}>{t('pf_today')}</T>
          </Row>
        </LinearGradient>

        {positions.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: space(3), paddingVertical: space(8) }}>
            <Feather name="briefcase" size={40} color={colors.textMute} />
            <T w="bold" size={17}>{t('pf_empty_t')}</T>
            <T color={colors.textDim} style={{ textAlign: 'center' }}>{t('pf_empty_b')}</T>
          </Card>
        ) : (
          <>
            <Row style={{ gap: space(3) }}>
              <Card style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                {portfolioScore !== null ? <ScoreRing score={portfolioScore} size={64} /> : <Feather name="minus-circle" size={40} color={colors.textMute} />}
                <T size={12} color={colors.textDim} style={{ textAlign: 'center' }}>{t('pf_score')}</T>
                <T size={10} color={colors.textMute} style={{ textAlign: 'center' }}>{t('pf_score_sub')}</T>
              </Card>
              <Card style={{ flex: 2, gap: 8 }}>
                <T size={12} color={colors.textDim}>{t('pf_sectors')}</T>
                <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                  {bySector.map(([s, v], i) => <View key={s} style={{ flex: v, backgroundColor: PALETTE[i % PALETTE.length] }} />)}
                </View>
                {bySector.slice(0, 4).map(([s, v], i) => (
                  <Row key={s} style={{ gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PALETTE[i % PALETTE.length] }} />
                    <T size={12} style={{ flex: 1 }}>{sectorName(s, t.lang)}</T>
                    <N size={12} color={colors.textDim}>{((v / value) * 100).toFixed(0)}%</N>
                  </Row>
                ))}
              </Card>
            </Row>

            <View>
              <SectionTitle title={t('pf_holdings')} icon="list" />
              <View style={{ gap: 10 }}>
                {positions.map((p) => {
                  const mv = p.qty * (p.price ?? p.cost / p.qty);
                  const ppl = mv - p.cost;
                  return (
                    <Pressable
                      key={p.symbol}
                      onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: p.symbol } })}
                      onLongPress={() => confirmRemove(p)}
                      style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 6 }}
                    >
                      <Row style={{ gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Row style={{ gap: 8 }}>
                            <N w="bold" size={16}>{p.symbol}</N>
                            {p.score !== null && (
                              <View style={{ paddingHorizontal: 6, borderRadius: 6, backgroundColor: colors.bgElevated }}>
                                <N size={11} w="bold" color={scoreColor(p.score)}>{p.score}</N>
                              </View>
                            )}
                          </Row>
                          <T size={12} color={colors.textDim} numberOfLines={1}>{p.name}</T>
                          <Row style={{ gap: 4 }}>
                            <N size={12} color={colors.textDim}>{p.qty}</N>
                            <T size={12} color={colors.textDim}>{t('pf_units')} · {t('pf_avg_cost')}</T>
                            <N size={12} color={colors.textDim}>{usd(p.cost / p.qty)}</N>
                          </Row>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <N w="bold">{usdCompact(mv)}</N>
                          <N size={12} w="bold" color={ppl >= 0 ? colors.up : colors.down}>
                            {ppl >= 0 ? '+' : ''}{usd(ppl)} ({pct((ppl / p.cost) * 100, 1)})
                          </N>
                        </View>
                        <Pressable onPress={() => confirmRemove(p)} hitSlop={10} accessibilityLabel={`${t('delete')} ${p.symbol}`}>
                          <Feather name="trash-2" size={16} color={colors.textMute} />
                        </Pressable>
                      </Row>
                      {p.price === null ? (
                        <T size={11} color={colors.warn}>{t('pf_no_quote')}</T>
                      ) : (
                        <Row style={{ gap: 6 }}>
                          <T size={11} color={colors.textMute}>{t('pf_day_change')}</T>
                          <Delta value={p.dayPct} size={11} />
                        </Row>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        <Button label={t('pf_add')} icon="plus" onPress={() => router.push('/add-holding')} />
        <T size={11} color={colors.textMute} style={{ textAlign: 'center' }}>{t('pf_local')}</T>
        <Disclaimer compact />
      </ScrollView>
    </SafeAreaView>
  );
}
