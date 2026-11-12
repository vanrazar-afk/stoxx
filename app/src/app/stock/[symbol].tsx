import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Feather from '@expo/vector-icons/Feather';
import { useData } from '@/lib/data';
import { useApp } from '@/lib/store';
import type { Factor, PillarResult, StockScore } from '@/lib/types';
import { colors, pillarMeta, radius, space } from '@/lib/theme';
import { useT, sectorName, factorLabel, factorValue, levelsMethod, pillarSummary, sentimentSummary } from '@/lib/i18n';
import { fmtDate, pct, timeAgo, usd } from '@/lib/format';
import { T, N, Row, Card, Delta, Button, SectionTitle, Disclaimer, DemoBanner } from '@/components/ui';
import { ScoreRing, PillarBar, LevelsChart } from '@/components/charts';
import { PriceChart } from '@/components/PriceChart';

const SOURCE_NAMES: Record<string, string> = {
  reuters: 'Reuters', bloomberg: 'Bloomberg', wsj: 'WSJ', ft: 'Financial Times', cnbc: 'CNBC',
  marketwatch: 'MarketWatch', barrons: "Barron's", yahoo: 'Yahoo Finance', seekingalpha: 'Seeking Alpha', benzinga: 'Benzinga',
};

export default function StockScreen() {
  const t = useT();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { bySymbol, isDemo, report } = useData();
  const s = bySymbol(symbol);
  void report;
  const watching = useApp((st) => st.watchlist.includes(symbol));
  const toggleWatch = useApp((st) => st.toggleWatch);
  const { width } = useWindowDimensions();

  const starButton = (sym: string) => () => (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        toggleWatch(sym);
      }}
      hitSlop={12}
      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="button"
      accessibilityState={{ selected: watching }}
      accessibilityLabel={watching ? t('watch_remove') : t('watch_add')}
    >
      <Feather name="star" size={22} color={watching ? colors.warn : colors.textDim} />
    </Pressable>
  );

  if (!s) {
    // A stock outside today's top 50: price history only, clearly marked "no score"
    const q = report.quotes[symbol];
    return (
      <>
        <Stack.Screen options={{ title: symbol, headerRight: starButton(symbol) }} />
        <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12), maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          <Card style={{ gap: 6 }}>
            <Row style={{ gap: space(4) }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <T size={12} w="bold" color={colors.textDim} style={{ textAlign: 'center' }}>
                  {t('no_score')}
                </T>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T w="black" size={22} numberOfLines={2} accessibilityRole="header">
                  {q?.name ?? symbol}
                </T>
                {q?.sector && (
                  <T size={13} color={colors.textDim}>
                    {sectorName(q.sector, t.lang)}
                  </T>
                )}
                {q && (
                  <Row style={{ gap: 8, marginTop: 4 }}>
                    <N w="bold" size={22}>
                      {usd(q.price)}
                    </N>
                    <Delta value={q.changePct} />
                  </Row>
                )}
              </View>
            </Row>
            <T size={13} color={colors.textDim} style={{ marginTop: 8 }}>
              {t('unscored_note')}
            </T>
          </Card>
          <PriceChart symbol={symbol} />
          <Button label={t('add_to_portfolio')} icon="plus" onPress={() => router.push({ pathname: '/add-holding', params: { symbol } })} />
          <Disclaimer />
        </ScrollView>
      </>
    );
  }

  const chartW = Math.min(width, 720) - space(8) - space(8);

  return (
    <>
      <Stack.Screen
        options={{
          title: s.symbol,
          headerRight: starButton(s.symbol),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12), maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        {isDemo && <DemoBanner />}

        {/* Header */}
        <Card style={{ gap: space(3) }}>
          <Row style={{ gap: space(4) }}>
            <ScoreRing score={s.score} size={92} pillars={[s.technical.score, s.fundamental.score, s.sentiment.score]} />
            <View style={{ flex: 1, gap: 2 }}>
              <T w="black" size={22} numberOfLines={1}>{s.name}</T>
              <T size={13} color={colors.textDim}>{sectorName(s.sector, t.lang)} · {s.industry}</T>
              <Row style={{ gap: 8, marginTop: 4 }}>
                <N w="bold" size={22}>{usd(s.price)}</N>
                <Delta value={s.changePct} />
              </Row>
            </View>
          </Row>
          <Row style={{ gap: 8, flexWrap: 'wrap' }}>
            <Badge icon="hash" text={t('rank_of', { n: s.rank })} />
            {s.prevScore !== null && <Badge icon="activity" text={t('score_yesterday', { n: s.prevScore })} />}
            {s.flags.includes('earnings_soon') && s.nextEarningsDate && <Badge icon="calendar" text={t('earnings_on', { d: fmtDate(s.nextEarningsDate, t.lang) })} color={colors.warn} />}
            {s.flags.includes('overbought') && <Badge icon="alert-triangle" text={t('overbought')} color={colors.down} />}
            {s.flags.includes('low_news_coverage') && <Badge icon="volume-x" text={t('low_news')} color={colors.textDim} />}
          </Row>
          <View style={{ gap: 10, marginTop: 4 }}>
            <PillarBar label={t('p_tech')} value={s.technical.score} color={colors.tech} />
            <PillarBar label={t('p_fund')} value={s.fundamental.score} color={colors.fund} />
            <PillarBar label={t('p_sent')} value={s.sentiment.score} color={colors.sent} />
          </View>
        </Card>

        <PriceChart symbol={s.symbol} />

        {/* Levels */}
        <Card>
          <SectionTitle title={t('levels_title')} icon="crosshair" color={colors.brand2} />
          <LevelsChart labels={[t('target'), t('stop')]} data={s.sparkline} entry={s.levels.entry} target={s.levels.target} stop={s.levels.stop} width={chartW} />
          <Row style={{ gap: 8, marginTop: space(3) }}>
            <Level label={t('last_price')} value={usd(s.levels.entry)} color={colors.text} />
            <Level label={t('exit_target')} value={usd(s.levels.target)} sub={pct((s.levels.target / s.price - 1) * 100, 1)} color={colors.up} />
            <Level label={t('stop')} value={usd(s.levels.stop)} sub={pct((s.levels.stop / s.price - 1) * 100, 1)} color={colors.down} />
          </Row>
          <T size={12} color={colors.textMute} style={{ marginTop: 10 }}>
            {levelsMethod(s.levels.method, t.lang)} · {t('rr')} 1:{s.levels.riskReward} · ATR {usd(s.levels.atr)}
            {s.analystTarget ? ` · ${t('analyst_avg')} ${usd(s.analystTarget)}` : ''}
          </T>
        </Card>

        <Pillar title={t('p_tech')} k="technical" p={s.technical} sector={s.sector} />
        <Pillar title={t('p_fund')} k="fundamental" p={s.fundamental} sector={s.sector} />
        <Sentiment s={s} />

        <Button label={t('add_to_portfolio')} icon="plus" onPress={() => router.push({ pathname: '/add-holding', params: { symbol: s.symbol } })} />
        <Disclaimer />
      </ScrollView>
    </>
  );
}

function Badge({ icon, text, color = colors.brand2 }: { icon: keyof typeof Feather.glyphMap; text: string; color?: string }) {
  return (
    <Row style={{ gap: 5, backgroundColor: colors.bgElevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      <Feather name={icon} size={12} color={color} />
      <T size={12} color={color}>{text}</T>
    </Row>
  );
}

function Level({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: 10, gap: 2 }}>
      <T size={11} color={colors.textDim}>{label}</T>
      <N w="bold" size={15} color={color}>{value}</N>
      {sub && <N size={11} color={color}>{sub}</N>}
    </View>
  );
}

function Pillar({ title, k, p, sector }: { title: string; k: 'technical' | 'fundamental'; p: PillarResult; sector: string }) {
  const t = useT();
  const meta = pillarMeta[k];
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <SectionTitle
        title={title}
        icon={meta.icon}
        color={meta.color}
        right={
          <Pressable onPress={() => setOpen((o) => !o)} hitSlop={10}>
            <Row style={{ gap: 6 }}>
              <N w="black" size={18} color={meta.color}>{p.score.toFixed(1)}</N>
              <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
            </Row>
          </Pressable>
        }
      />
      <T size={14} color={colors.textDim} style={{ marginBottom: space(3) }}>{pillarSummary(k, p, sector, t.lang)}</T>
      {open && <FactorTable factors={p.factors} color={meta.color} />}
    </Card>
  );
}

function FactorTable({ factors, color }: { factors: Factor[]; color: string }) {
  const t = useT();
  return (
    <View style={{ borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <Row style={{ backgroundColor: colors.bgElevated, paddingVertical: 8, paddingHorizontal: 10 }}>
        <T size={11} w="bold" color={colors.textMute} style={{ flex: 1.4 }}>{t('col_metric')}</T>
        <T size={11} w="bold" color={colors.textMute} style={{ flex: 1.2 }}>{t('col_value')}</T>
        <T size={11} w="bold" color={colors.textMute} style={{ width: 54 }}>{t('col_points')}</T>
      </Row>
      {factors.map((f, i) => (
        <Row key={f.key} style={{ paddingVertical: 9, paddingHorizontal: 10, backgroundColor: i % 2 ? colors.card : colors.cardHi, gap: 6 }}>
          <Row style={{ flex: 1.4, gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: f.signal === 'positive' ? colors.up : f.signal === 'negative' ? colors.down : colors.warn }} />
            <T size={12} style={{ flex: 1 }}>{factorLabel(f, t.lang)}</T>
          </Row>
          <T size={12} color={colors.textDim} style={{ flex: 1.2 }}>{factorValue(f, t.lang)}</T>
          <N size={12} w="bold" color={f.max && f.points / f.max >= 0.6 ? color : colors.textDim} style={{ width: 54 }}>
            {f.max ? `${f.points}/${f.max}` : '—'}
          </N>
        </Row>
      ))}
    </View>
  );
}

function Sentiment({ s }: { s: StockScore }) {
  const t = useT();
  const r = s.sentiment;
  const total = Math.max(1, r.positive + r.negative + r.neutral);
  return (
    <Card>
      <SectionTitle title={t('p_sent')} icon="message-circle" color={colors.sent} right={<N w="black" size={18} color={colors.sent}>{r.score.toFixed(1)}</N>} />
      <T size={14} color={colors.textDim} style={{ marginBottom: space(3) }}>{sentimentSummary(r, t.lang)}</T>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.border, marginBottom: 6 }}>
        <View style={{ flex: r.positive / total, backgroundColor: colors.up }} />
        <View style={{ flex: r.neutral / total, backgroundColor: colors.textMute }} />
        <View style={{ flex: r.negative / total, backgroundColor: colors.down }} />
      </View>
      <Row style={{ gap: 14, marginBottom: space(3) }}>
        <T size={12} color={colors.up}>● {t('positive')} {r.positive}</T>
        <T size={12} color={colors.textDim}>● {t('neutral')} {r.neutral}</T>
        <T size={12} color={colors.down}>● {t('negative')} {r.negative}</T>
        <T size={12} color={colors.textMute} style={{ flex: 1, textAlign: t.lang === 'he' ? 'left' : 'right' }}>{t('sources_n', { n: r.sourcesCovered.length })}</T>
      </Row>
      {r.articles.slice(0, 8).map((a, i) => (
        <Pressable
          key={i}
          onPress={() => !a.url.includes('example.com') && WebBrowser.openBrowserAsync(a.url)}
          style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, gap: 4 }}
        >
          <Row style={{ gap: 8 }}>
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: a.label === 'positive' ? colors.upBg : a.label === 'negative' ? colors.downBg : colors.bgElevated }}>
              <T size={10} w="bold" color={a.label === 'positive' ? colors.up : a.label === 'negative' ? colors.down : colors.textDim}>
                {t(a.label)}
              </T>
            </View>
            <T size={11} color={colors.textMute}>{a.publisher ?? SOURCE_NAMES[a.source] ?? a.source} · {timeAgo(a.datetime, t.lang)}</T>
          </Row>
          <T size={13} style={{ writingDirection: 'ltr', textAlign: 'left' }}>{a.headline}</T>
        </Pressable>
      ))}
      {!r.articles.length && <T size={13} color={colors.textMute}>{t('no_articles')}</T>}
    </Card>
  );
}
