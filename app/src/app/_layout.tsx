import { useEffect } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { useLang, useT } from '@/lib/i18n';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Heebo_400Regular, Heebo_500Medium, Heebo_700Bold, Heebo_800ExtraBold } from '@expo-google-fonts/heebo';
import { DataProvider } from '@/lib/data';
import { useApp } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

// Native layout direction follows the chosen language (takes full effect after the app restarts).
function useNativeDirection() {
  const lang = useLang((s) => s.lang);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const rtl = lang === 'he';
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
  }, [lang]);
  return lang;
}

function DisclaimerGate() {
  const accepted = useApp((s) => s.disclaimerAcceptedAt);
  const hydrated = useApp.persist?.hasHydrated?.() ?? true;
  const segments = useSegments();
  useEffect(() => {
    if (hydrated && !accepted && segments[0] !== 'onboarding') router.replace('/onboarding');
  }, [accepted, hydrated, segments]);
  return null;
}

export default function RootLayout() {
  const lang = useNativeDirection();
  const t = useT();
  const [loaded] = useFonts({ Heebo_400Regular, Heebo_500Medium, Heebo_700Bold, Heebo_800ExtraBold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaProvider>
      {/* `dir` makes react-native-web lay out RTL; ignored on native */}
      <View style={{ flex: 1, backgroundColor: colors.bg }} {...({ dir: lang === 'he' ? 'rtl' : 'ltr', lang } as object)}>
        <DataProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: fonts.bold },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="stock/[symbol]" options={{ title: '' }} />
            <Stack.Screen name="add-holding" options={{ presentation: 'modal', title: t('ah_title') }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
          <DisclaimerGate />
        </DataProvider>
      </View>
    </SafeAreaProvider>
  );
}
