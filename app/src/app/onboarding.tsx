import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { T, Button, Row } from '@/components/ui';
import { ScoreRing } from '@/components/charts';
import { colors, radius, space } from '@/lib/theme';
import { useApp } from '@/lib/store';
import { useT } from '@/lib/i18n';
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

  return (
    <LinearGradient colors={['#1B1446', colors.bg, colors.bg]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space(6), gap: space(5), maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <View style={{ alignItems: 'flex-end' }}>
            <LangToggle />
          </View>
          <View style={{ alignItems: 'center', gap: space(3), marginTop: space(6) }}>
            <ScoreRing score={87} size={96} pillars={[30, 28, 29]} />
            <T w="black" size={34}>
              StoXX
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

          <Pressable onPress={() => setChecked((c) => !c)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
            <Row style={{ gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: checked ? colors.brand : colors.textMute, backgroundColor: checked ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {checked && <Feather name="check" size={14} color="#fff" />}
              </View>
              <T size={14} style={{ flex: 1 }}>
                {t('ob_check')}
              </T>
            </Row>
          </Pressable>

          <Button
            label={t('ob_start')}
            icon={t.lang === 'he' ? 'arrow-left' : 'arrow-right'}
            onPress={() => {
              if (!checked) return;
              accept();
              router.replace('/');
            }}
            style={{ opacity: checked ? 1 : 0.4 }}
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
