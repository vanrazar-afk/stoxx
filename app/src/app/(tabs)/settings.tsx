import { Alert, Linking, Platform, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import Feather from '@expo/vector-icons/Feather';
import { useApp } from '@/lib/store';
import { useData } from '@/lib/data';
import { colors, space } from '@/lib/theme';
import { fmtTime } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { T, Row, Card, Disclaimer, LangToggle } from '@/components/ui';

const extra = (Constants.expoConfig?.extra ?? {}) as { privacyPolicyUrl?: string; termsUrl?: string; supportEmail?: string };
// On the web the policy ships with the site; in native builds set extra.privacyPolicyUrl in app.json.
const baseUrl = ((Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '').replace(/\/$/, '');
const privacyUrl =
  extra.privacyPolicyUrl || (Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}${baseUrl}/privacy.html` : '');

export default function Settings() {
  const t = useT();
  const resetAll = useApp((s) => s.resetAll);
  const { report, isDemo } = useData();

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      resetAll(); // web: confirm() is blocked in sandboxed previews
      return;
    }
    Alert.alert(t('st_reset'), t('st_reset_b'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: resetAll },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12), maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <T w="black" size={26}>
          {t('st_title')}
        </T>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ gap: 12 }}>
              <Feather name="globe" size={18} color={colors.textDim} />
              <T>{t('st_lang')}</T>
            </Row>
            <LangToggle />
          </Row>
          {Platform.OS !== 'web' && (
            <T size={11} color={colors.textMute} style={{ marginTop: 8 }}>
              {t('st_restart')}
            </T>
          )}
        </Card>

        <Card style={{ paddingVertical: 4 }}>
          <Item icon="file-text" label={t('st_privacy')} onPress={() => privacyUrl && WebBrowser.openBrowserAsync(privacyUrl)} />
          <Item icon="mail" label={t('st_contact')} onPress={() => extra.supportEmail && Linking.openURL(`mailto:${extra.supportEmail}`)} />
          {extra.supportEmail ? (
            <T size={12} color={colors.textMute} style={{ paddingBottom: 10 }}>
              {extra.supportEmail}
            </T>
          ) : null}
        </Card>

        <Card style={{ paddingVertical: 4 }}>
          <Item icon="trash-2" label={t('st_reset')} danger onPress={confirmReset} />
        </Card>

        <Card style={{ gap: 6 }}>
          <T w="bold">{t('st_about')}</T>
          <T size={13} color={colors.textDim}>
            {isDemo ? t('st_demo') : t('st_last', { d: fmtTime(report.generatedAt, t.lang) })}{' '}
            {report.dataProvider ? t('st_source', { s: report.dataProvider }) : ''} {t('st_method', { v: report.methodologyVersion })}
          </T>
          <T size={12} color={colors.textMute}>
            {t('st_version', { v: Constants.expoConfig?.version ?? '' })}
          </T>
        </Card>

        <Disclaimer />
      </ScrollView>
    </SafeAreaView>
  );
}

function Item({ icon, label, onPress, danger }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  const t = useT();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Row style={{ gap: 12, paddingVertical: 14 }}>
        <Feather name={icon} size={18} color={danger ? colors.down : colors.textDim} />
        <T style={{ flex: 1 }} color={danger ? colors.down : colors.text}>
          {label}
        </T>
        <Feather name={t.lang === 'he' ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textMute} />
      </Row>
    </Pressable>
  );
}
