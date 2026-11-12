import { Pressable, StyleSheet, Text, View, type TextProps, type ViewProps, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts, radius, space } from '@/lib/theme';
import { useT, useLang } from '@/lib/i18n';

type Weight = 'regular' | 'medium' | 'bold' | 'black';

export function T({ w = 'regular', size = 15, color = colors.text, style, ...p }: TextProps & { w?: Weight; size?: number; color?: string }) {
  return <Text {...p} style={[{ fontFamily: fonts[w], fontSize: size, color, lineHeight: Math.round(size * 1.4) }, style]} />;
}

/** Numbers / tickers render LTR inside RTL layouts */
export function N(props: TextProps & { w?: Weight; size?: number; color?: string }) {
  return <T {...props} style={[{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }, props.style]} />;
}

export function Card({ style, ...p }: ViewProps) {
  return <View {...p} style={[styles.card, style]} />;
}

export function Row({ style, ...p }: ViewProps & { style?: ViewStyle | ViewStyle[] }) {
  return <View {...p} style={[{ flexDirection: 'row', alignItems: 'center' }, style]} />;
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: color ?? colors.brand, borderColor: color ?? colors.brand }]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      <T size={13} w="medium" color={active ? '#fff' : colors.textDim}>
        {label}
      </T>
    </Pressable>
  );
}

export function Delta({ value, size = 13, suffix = '%' }: { value: number; size?: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <View style={[styles.delta, { backgroundColor: up ? colors.upBg : colors.downBg }]} accessible accessibilityLabel={`${up ? '+' : '−'}${Math.abs(value).toFixed(2)}${suffix}`}>
      <N size={size} w="bold" color={up ? colors.up : colors.down}>
        {up ? '▲' : '▼'} {Math.abs(value).toFixed(2)}
        {suffix}
      </N>
    </View>
  );
}

export function Button({ label, icon, onPress, variant = 'primary', style }: { label: string; icon?: keyof typeof Feather.glyphMap; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger'; style?: ViewStyle }) {
  const bg = variant === 'primary' ? colors.brand : variant === 'danger' ? colors.downBg : colors.cardHi;
  const fg = variant === 'danger' ? colors.down : '#fff';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: pressed ? 0.8 : 1 }, style]} accessibilityRole="button">
      {icon && <Feather name={icon} size={17} color={fg} />}
      <T w="bold" color={fg}>
        {label}
      </T>
    </Pressable>
  );
}

export function SectionTitle({ title, icon, color = colors.text, right }: { title: string; icon?: keyof typeof Feather.glyphMap; color?: string; right?: React.ReactNode }) {
  return (
    <Row style={{ gap: 8, marginBottom: space(3) }}>
      {icon && <Feather name={icon} size={18} color={color} />}
      <T w="bold" size={17} style={{ flex: 1 }}>
        {title}
      </T>
      {right}
    </Row>
  );
}

export function DemoBanner() {
  const t = useT();
  return (
    <View style={styles.demo}>
      <Feather name="alert-triangle" size={14} color={colors.warn} />
      <T size={12} color={colors.warn} style={{ flex: 1 }}>
        {t('demo_banner')}
      </T>
    </View>
  );
}

export function Disclaimer({ compact }: { compact?: boolean }) {
  const t = useT();
  return (
    <T size={compact ? 11 : 12} color={colors.textMute} style={{ marginTop: space(4) }}>
      {t('disclaimer')}
    </T>
  );
}

/** Small HE | EN switch */
export function LangToggle() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup">
      {(['he', 'en'] as const).map((l) => (
        <Pressable
          key={l}
          onPress={() => setLang(l)}
          style={[styles.toggleBtn, lang === l && { backgroundColor: colors.brand }]}
          accessibilityRole="radio"
          accessibilityState={{ selected: lang === l }}
        >
          <T size={12} w="bold" color={lang === l ? '#fff' : colors.textDim}>
            {l === 'he' ? 'עב' : 'EN'}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: colors.border },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated },
  delta: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 18, borderRadius: radius.md },
  toggle: { flexDirection: 'row', backgroundColor: colors.bgElevated, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: colors.border },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  demo: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.warnBg, padding: 10, borderRadius: radius.sm, marginBottom: space(3) },
});
