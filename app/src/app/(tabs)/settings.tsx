import { useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import Feather from '@expo/vector-icons/Feather';
import { useApp } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { T, Row, Card, Disclaimer, LangToggle } from '@/components/ui';

const extra = (Constants.expoConfig?.extra ?? {}) as { privacyPolicyUrl?: string; supportEmail?: string };
// On the web the policy ships with the site; in native builds set extra.privacyPolicyUrl in app.json.
const baseUrl = ((Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '').replace(/\/$/, '');
const privacyUrl =
  extra.privacyPolicyUrl || (Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}${baseUrl}/privacy.html` : '');

export default function Settings() {
  const t = useT();
  const account = useApp((s) => s.account);
  const resetAll = useApp((s) => s.resetAll);
  const auth = useAuth();
  // Web previews block confirm(); a second tap within 6s confirms instead. Native shows a real dialog.
  const [armed, setArmed] = useState<string | null>(null);

  const confirm = (key: string, title: string, body: string, action: () => void) => {
    if (Platform.OS !== 'web') {
      Alert.alert(title, body, [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: action },
      ]);
      return;
    }
    if (armed === key) {
      setArmed(null);
      action();
      return;
    }
    setArmed(key);
    setTimeout(() => setArmed((a) => (a === key ? null : a)), 6000);
  };

  const isGoogle = account?.mode === 'google';
  const armedLabel = (key: string, label: string) => (armed === key ? `${label} — ${t('delete')}?` : label);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12), maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <T w="black" size={26} accessibilityRole="header">
          {t('st_title')}
        </T>

        <Card style={{ gap: 4 }}>
          <T w="bold" accessibilityRole="header">
            {t('st_account')}
          </T>
          <Row style={{ gap: 12, paddingVertical: 8 }}>
            {isGoogle && account?.photo ? (
              <Image source={{ uri: account.photo }} style={{ width: 40, height: 40, borderRadius: 20 }} accessible={false} />
            ) : (
              <View
                importantForAccessibility="no"
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="user" size={20} color={colors.textDim} />
              </View>
            )}
            <T size={14} style={{ flex: 1 }} color={colors.textDim}>
              {isGoogle ? t('st_signed_in', { n: account?.name || account?.email || '' }) : t('st_guest')}
            </T>
          </Row>
          {isGoogle ? (
            <>
              <Item icon="log-out" label={t('st_sign_out')} onPress={() => auth.signOutUser()} />
              <Item
                icon="user-x"
                danger
                label={armedLabel('acct', t('st_delete_account'))}
                onPress={() => confirm('acct', t('st_delete_account'), t('st_delete_account_b'), () => void auth.deleteAccount().catch(() => {}))}
              />
            </>
          ) : (
            <>
              {auth.available && <Item icon="log-in" label={t('st_sign_in')} onPress={() => auth.signInWithGoogle()} />}
              <Item icon="trash-2" danger label={armedLabel('reset', t('st_reset'))} onPress={() => confirm('reset', t('st_reset'), t('st_reset_b'), resetAll)} />
            </>
          )}
        </Card>

        <Card>
          <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
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
          <Item icon="eye" label={t('st_a11y')} onPress={() => router.push('/accessibility')} />
          <Item icon="file-text" label={t('st_privacy')} onPress={() => privacyUrl && WebBrowser.openBrowserAsync(privacyUrl)} />
          {extra.supportEmail ? <Item icon="mail" label={t('st_contact')} onPress={() => Linking.openURL(`mailto:${extra.supportEmail}`)} /> : null}
        </Card>

        <T size={12} color={colors.textMute} style={{ textAlign: 'center' }}>
          {t('st_version', { v: Constants.expoConfig?.version ?? '' })}
        </T>

        <Disclaimer />
      </ScrollView>
    </SafeAreaView>
  );
}

function Item({ icon, label, onPress, danger }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  const t = useT();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ minHeight: 48, justifyContent: 'center' }}>
      <Row style={{ gap: 12, paddingVertical: 12 }}>
        <Feather name={icon} size={18} color={danger ? colors.down : colors.textDim} />
        <T style={{ flex: 1 }} color={danger ? colors.down : colors.text}>
          {label}
        </T>
        <Feather name={t.lang === 'he' ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textMute} />
      </Row>
    </Pressable>
  );
}
