import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import type { StockScore } from '@/lib/types';
import { colors, radius } from '@/lib/theme';
import { useT, sectorName } from '@/lib/i18n';
import { usd } from '@/lib/format';
import { T, N, Row, Delta } from './ui';
import { ScoreRing, Sparkline } from './charts';

export function RankMove({ rank, prevRank }: { rank: number; prevRank: number | null }) {
  const t = useT();
  if (prevRank === null) return <T size={10} w="bold" color={colors.brand2}>{t('new_badge')}</T>;
  const d = prevRank - rank;
  if (d === 0) return <T size={10} color={colors.textMute}>—</T>;
  return (
    <N size={10} w="bold" color={d > 0 ? colors.up : colors.down}>
      {d > 0 ? '▲' : '▼'}
      {Math.abs(d)}
    </N>
  );
}

export function StockRow({ s }: { s: StockScore }) {
  const t = useT();
  const upside = ((s.levels.target / s.price - 1) * 100).toFixed(1);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: s.symbol } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cardHi }]}
      accessibilityRole="button"
      accessibilityLabel={`${s.name}, #${s.rank}, ${s.score}`}
    >
      <View style={styles.rank}>
        <N w="black" size={15} color={colors.textDim}>
          {s.rank}
        </N>
        <RankMove rank={s.rank} prevRank={s.prevRank} />
      </View>
      <ScoreRing score={s.score} size={46} pillars={[s.technical.score, s.fundamental.score, s.sentiment.score]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Row style={{ gap: 6 }}>
          <N w="bold" size={16}>
            {s.symbol}
          </N>
          {s.flags.includes('earnings_soon') && <Feather name="calendar" size={12} color={colors.warn} />}
        </Row>
        <T size={12} color={colors.textDim} numberOfLines={1}>
          {s.name} · {sectorName(s.sector, t.lang)}
        </T>
        <Row style={{ gap: 10, flexWrap: 'wrap', rowGap: 0 }}>
          <Row style={{ gap: 4 }}>
            <T size={11} color={colors.textMute}>{t('target')}</T>
            <N size={11} w="bold" color={colors.up}>{usd(s.levels.target)}</N>
            <N size={10} color={colors.textMute}>(+{upside}%)</N>
          </Row>
          <Row style={{ gap: 4 }}>
            <T size={11} color={colors.textMute}>{t('stop')}</T>
            <N size={11} w="bold" color={colors.down}>{usd(s.levels.stop)}</N>
          </Row>
        </Row>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4, width: 76 }}>
        <Sparkline data={s.sparkline.slice(-30)} width={64} height={24} />
        <N w="bold" size={14}>
          {usd(s.price)}
        </N>
        <Delta value={s.changePct} size={11} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  rank: { width: 26, alignItems: 'center', gap: 2 },
});
