import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, SectionList, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useData } from '@/lib/data';
import { colors, fonts, radius, space } from '@/lib/theme';
import { fmtDate, timeAgo } from '@/lib/format';
import { useT, sectorName } from '@/lib/i18n';
import { T, N, Row, Chip, DemoBanner, Disclaimer, LangToggle } from '@/components/ui';
import { StockRow, UnscoredRow } from '@/components/StockRow';
import type { StockScore } from '@/lib/types';

type Sort = 'score' | 'technical' | 'fundamental' | 'sentiment';

export default function TopRanking() {
  const t = useT();
  const { report, isDemo, loading, refresh, error } = useData();
  const [q, setQ] = useState('');
  const [sector, setSector] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('score');

  const SORTS: { key: Sort; label: string }[] = [
    { key: 'score', label: t('sort_score') },
    { key: 'technical', label: t('sort_tech') },
    { key: 'fundamental', label: t('sort_fund') },
    { key: 'sentiment', label: t('sort_sent') },
  ];

  const sectors = useMemo(() => [...new Set(report.top.map((s) => s.sector))], [report]);
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const v = report.top.filter(
      (s) => (!sector || s.sector === sector) && (!ql || s.symbol.toLowerCase().includes(ql) || s.name.toLowerCase().includes(ql)),
    );
    const key = (s: (typeof v)[number]) => (sort === 'score' ? s.score : s[sort].score);
    return [...v].sort((a, b) => key(b) - key(a) || a.rank - b.rank);
  }, [report, q, sector, sort]);

  // Every other S&P 500 stock: listed without a score
  const others = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const inTop = new Set(report.top.map((s) => s.symbol));
    return Object.entries(report.quotes)
      .filter(([sym, v]) => !inTop.has(sym))
      .filter(([sym, v]) => (!sector || v.sector === sector) && (!ql || sym.toLowerCase().includes(ql) || v.name.toLowerCase().includes(ql)))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([symbol, v]) => ({ symbol, ...v }));
  }, [report, q, sector]);

  type OtherRow = (typeof others)[number];
  const sections = [
    { key: 'top', data: list as (StockScore | OtherRow)[] },
    ...(others.length ? [{ key: 'others', data: others as (StockScore | OtherRow)[] }] : []),
  ];

  const avg = Math.round(report.top.reduce((a, s) => a + s.score, 0) / Math.max(1, report.top.length));
  const hasPrev = report.top.some((s) => s.prevRank !== null);
  const newcomers = report.top.filter((s) => s.prevRank === null).length;

  const Header = (
    <View style={{ gap: space(4), marginBottom: space(3) }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T w="black" size={22} color={colors.brand2}>
          StoXX
        </T>
        <LangToggle />
      </Row>

      <LinearGradient colors={['#2A1F6E', '#141C33']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ borderRadius: radius.xl, padding: space(5), gap: space(3) }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T size={13} color={colors.textDim}>
              {t('daily_rank')} · {fmtDate(report.asOf, t.lang)}
            </T>
            <T w="black" size={26}>
              {t('top50_title')}
            </T>
            {!isDemo && (
              <T size={12} color={colors.textMute}>
                {t('updated')} {timeAgo(report.generatedAt, t.lang)}
              </T>
            )}
          </View>
          <Feather name="award" size={30} color={colors.brand2} />
        </Row>
        <Row style={{ gap: space(3) }}>
          <Stat label={t('avg_score')} value={`${avg}`} />
          <Stat label={t('scanned')} value={`${report.universeSize}`} />
          <Stat label={t('newcomers')} value={hasPrev ? `${newcomers}` : '—'} />
        </Row>
      </LinearGradient>

      {isDemo && <DemoBanner />}
      {error && (
        <T size={12} color={colors.warn}>
          {t('load_error')}
        </T>
      )}

      <Row style={{ backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: colors.border }}>
        <Feather name="search" size={18} color={colors.textMute} accessibilityElementsHidden importantForAccessibility="no" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('search_ph')}
          accessibilityLabel={t('search_ph')}
          placeholderTextColor={colors.textMute}
          style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, paddingVertical: 11, fontSize: 15, textAlign: t.lang === 'he' ? 'right' : 'left' }}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {SORTS.map((s) => (
          <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={t('all_sectors')} active={!sector} onPress={() => setSector(null)} color={colors.cardHi} />
        {sectors.map((s) => (
          <Chip key={s} label={sectorName(s, t.lang)} active={sector === s} onPress={() => setSector(sector === s ? null : s)} color={colors.cardHi} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.symbol}
        renderItem={({ item, section }) =>
          section.key === 'top' ? (
            <StockRow s={item as StockScore} />
          ) : (
            <UnscoredRow {...(item as OtherRow)} />
          )
        }
        renderSectionHeader={({ section }) =>
          section.key === 'others' ? (
            <View style={{ paddingTop: space(6), paddingBottom: space(2), backgroundColor: colors.bg }} accessibilityRole="header">
              <T w="bold" size={18}>
                {t('unscored_title')} · {others.length}
              </T>
              <T size={12} color={colors.textDim}>
                {t('unscored_sub')}
              </T>
            </View>
          ) : null
        }
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={Header}
        ListEmptyComponent={<T color={colors.textDim} style={{ textAlign: 'center', marginTop: 40 }}>{t('no_results')}</T>}
        ListFooterComponent={<Disclaimer />}
        initialNumToRender={20}
        windowSize={11}
        contentContainerStyle={{ padding: space(4), paddingBottom: space(10), maxWidth: 760, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brand2} />}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.md, padding: 10 }}>
      <N w="black" size={20}>
        {value}
      </N>
      <T size={11} color={colors.textDim}>
        {label}
      </T>
    </View>
  );
}
