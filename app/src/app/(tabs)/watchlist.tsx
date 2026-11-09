import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useApp } from '@/lib/store';
import { useData } from '@/lib/data';
import { colors, radius, space } from '@/lib/theme';
import { usd } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { T, N, Row, Card, Delta } from '@/components/ui';
import { StockRow } from '@/components/StockRow';

export default function Watchlist() {
  const t = useT();
  const list = useApp((s) => s.watchlist);
  const toggle = useApp((s) => s.toggleWatch);
  const { report, bySymbol } = useData();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(s) => s}
        contentContainerStyle={{ padding: space(4), gap: 10 }}
        ListHeaderComponent={
          <View style={{ marginBottom: space(2) }}>
            <T w="black" size={26}>{t('wl_title')}</T>
            <T size={13} color={colors.textDim}>{t('wl_sub')}</T>
          </View>
        }
        ListEmptyComponent={
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: space(8) }}>
            <Feather name="star" size={36} color={colors.textMute} />
            <T color={colors.textDim} style={{ textAlign: 'center' }}>{t('wl_empty')}</T>
          </Card>
        }
        renderItem={({ item }) => {
          const s = bySymbol(item);
          if (s) return <StockRow s={s} />;
          const q = report.quotes[item];
          return (
            <Pressable onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: item } })} style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border }}>
              <Row style={{ gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <N w="bold" size={16}>{item}</N>
                  <T size={12} color={colors.textMute}>{q?.name ?? ''} · {t('wl_not_top')}</T>
                </View>
                {q && (
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <N w="bold">{usd(q.price)}</N>
                    <Delta value={q.changePct} size={11} />
                  </View>
                )}
                <Pressable onPress={() => toggle(item)} hitSlop={10}>
                  <Feather name="x" size={18} color={colors.textMute} />
                </Pressable>
              </Row>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
