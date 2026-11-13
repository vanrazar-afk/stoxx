import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { T, Row } from '@/components/ui';
import { ActivityIndicator } from 'react-native';
import { Logo } from '@/components/Logo';
import { colors, radius, space } from '@/lib/theme';
import { useApp } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { LangToggle } from '@/components/ui';

const POINTS = [
  { icon: 'award', title: 'ob_p1_t', body: 'ob_p1_b' },
  { icon: 'layers', title: 'ob_p2_t', body: 'ob_p2_b' },
  { icon: 'briefcase', title: 'ob_p3_t', body: 'ob_p3_b' },
] as const;

export default function Onboarding() {
  const t = useT();
  const accept = useApp((s) => s.acceptDisclaimer);
  const [checked, setChecked] = useState(false);
  const [hint, setHint] = useState(false);
  const auth = useAuth();
  const account = useApp((s) => s.account);
  const acceptedAt = useApp((s) => s.disclaimerAcceptedAt);
  useEffect(() => {
    if (account && acceptedAt) router.replace('/');
  }, [account, acceptedAt]);

  return (
    <LinearGradient colors={['#1B1446', colors.bg, colors.bg]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space(6), gap: space(5), maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <View style={{ alignItems: 'flex-end' }}>
            <LangToggle />
          </View>
          <View style={{ alignItems: 'center', gap: space(3), marginTop: space(6) }}>
            <Logo size={104} />
            <T w="black" size={34} style={{ letterSpacing: 2 }}>
              VOLTIX
            </T>
            <T color={colors.textDim} style={{ textAlign: 'center' }}>
              {t('ob_tagline')}
            </T>
          </View>

          {POINTS.map((p) => (
            <Row key={p.title} style={{ gap: 14, alignItems: 'flex-start' }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={p.icon} size={20} color={colors.brand2} />
              </View>
              <View style={{ flex: 1 }}>
                <T w="bold">{t(p.title)}</T>
                <T size={13} color={colors.textDim}>
                  {t(p.body)}
                </T>
              </View>
            </Row>
          ))}

          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: colors.warn + '55', gap: 8 }}>
            <Row style={{ gap: 8 }}>
              <Feather name="shield" size={18} color={colors.warn} />
              <T w="bold" color={colors.warn}>
                {t('ob_important')}
              </T>
            </Row>
            <T size={13} color={colors.textDim}>
              {t('ob_legal')}
            </T>
          </View>

          <Pressable onPress={() => setChecked((c) => !c)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Row style={{ gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: checked ? colors.brand : colors.textMute, backgroundColor: checked ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {checked && <Feather name="check" size={14} color="#fff" />}
              </View>
              <T size={14} style={{ flex: 1 }}>
                {t('ob_check')}
              </T>
            </Row>
          </Pressable>

          <View style={{ gap: 12 }}>
            <T w="bold" size={16}>
              {t('ob_choose')}
            </T>
            <EntryOption
              icon="log-in"
              title={t('login_google')}
              sub={auth.available ? t('login_google_sub') : t('login_unavailable')}
              disabled={!auth.available || auth.busy}
              busy={auth.busy}
              onPress={async () => {
                if (!checked) return setHint(true);
                accept();
                await auth.signInWithGoogle();
              }}
            />
            <EntryOption
              icon="user"
              title={t('login_guest')}
              sub={t('login_guest_sub')}
              onPress={() => {
                if (!checked) return setHint(true);
                accept();
                auth.continueAsGuest();
              }}
            />
            {hint && !checked && (
              <T size={13} color={colors.warn} accessibilityLiveRegion="polite">
                {t('login_check_first')}
              </T>
            )}
            {auth.error && (
              <T size={12} color={colors.down} accessibilityLiveRegion="polite">
                {auth.error}
              </T>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function EntryOption({ icon, title, sub, onPress, disabled, busy }: { icon: keyof typeof Feather.glyphMap; title: string; sub: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      accessibilityHint={sub}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 64,
        padding: 14,
        borderRadius: radius.lg,
        backgroundColor: pressed ? colors.cardHi : colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: disabled ? 0.55 : 1,
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
        {busy ? <ActivityIndicator color={colors.brand2} /> : <Feather name={icon} size={20} color={colors.brand2} />}
      </View>
      <View style={{ flex: 1 }}>
        <T w="bold">{title}</T>
        <T size={12} color={colors.textDim}>
          {sub}
        </T>
      </View>
    </Pressable>
  );
}
