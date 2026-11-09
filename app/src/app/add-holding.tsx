import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/lib/store';
import { useData } from '@/lib/data';
import { colors, fonts, radius, space } from '@/lib/theme';
import { usd } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { T, N, Button } from '@/components/ui';

export default function AddHolding() {
  const t = useT();
  const params = useLocalSearchParams<{ symbol?: string }>();
  const { report } = useData();
  const addLot = useApp((s) => s.addLot);
  const [symbol, setSymbol] = useState((params.symbol ?? '').toUpperCase());
  const quote = report.quotes[symbol];
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState(quote ? String(quote.price) : '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const q = symbol.trim().toUpperCase();
    if (!q || report.quotes[q]) return [];
    return Object.entries(report.quotes)
      .filter(([s, v]) => s.startsWith(q) || v.name.toUpperCase().includes(q))
      .slice(0, 5);
  }, [symbol, report]);

  const save = () => {
    const q = Number(qty.replace(',', '.'));
    const p = Number(price.replace(',', '.'));
    if (!/^[A-Z.\-]{1,10}$/.test(symbol)) return setErr(t('err_symbol'));
    if (!(q > 0)) return setErr(t('err_qty'));
    if (!(p > 0)) return setErr(t('err_price'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setErr(t('err_date'));
    addLot({ symbol, name: quote?.name ?? symbol, qty: q, price: p, date });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(4) }} keyboardShouldPersistTaps="handled">
        <Field label={t('ah_symbol')}>
          <Input value={symbol} onChangeText={(v) => setSymbol(v.toUpperCase())} placeholder="AAPL" autoCapitalize="characters" />
          {quote && (
            <T size={12} color={colors.textDim}>
              {quote.name} · {t('ah_last')} <N size={12} w="bold">{usd(quote.price)}</N>
            </T>
          )}
          {suggestions.map(([s, v]) => (
            <Pressable key={s} onPress={() => { setSymbol(s); setPrice(String(v.price)); }} style={{ paddingVertical: 8 }}>
              <T size={13}><N w="bold" size={13}>{s}</N> · {v.name}</T>
            </Pressable>
          ))}
        </Field>
        <Field label={t('ah_qty')}>
          <Input value={qty} onChangeText={setQty} placeholder="10" keyboardType="decimal-pad" />
        </Field>
        <Field label={t('ah_price')}>
          <Input value={price} onChangeText={setPrice} placeholder="150.00" keyboardType="decimal-pad" />
        </Field>
        <Field label={t('ah_date')}>
          <Input value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        </Field>
        {err && <T color={colors.down}>{err}</T>}
        <Button label={t('ah_save')} icon="check" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T size={13} w="medium" color={colors.textDim}>{label}</T>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.textMute}
      {...props}
      style={{ backgroundColor: colors.card, color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.medium, fontSize: 16, textAlign: 'right' }}
    />
  );
}
