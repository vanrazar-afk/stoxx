import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts } from '@/lib/theme';
import { useT } from '@/lib/i18n';

export default function TabsLayout() {
  const t = useT();
  const insets = useSafeAreaInsets();
  // Room for icon + label, plus the phone's home-indicator / gesture area
  const bottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand2,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelPosition: 'below-icon',
        tabBarAllowFontScaling: true,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          height: 66 + bottom,
          paddingTop: 4,
          paddingBottom: bottom,
        },
        tabBarItemStyle: { minHeight: 48, paddingVertical: 0 },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, marginTop: 0, marginBottom: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab_rank'), tabBarIcon: ({ color }) => <Feather name="award" size={22} color={color as string} /> }} />
      <Tabs.Screen name="portfolio" options={{ title: t('tab_portfolio'), tabBarIcon: ({ color }) => <Feather name="briefcase" size={22} color={color as string} /> }} />
      <Tabs.Screen name="watchlist" options={{ title: t('tab_watch'), tabBarIcon: ({ color }) => <Feather name="star" size={22} color={color as string} /> }} />
      <Tabs.Screen name="learn" options={{ title: t('tab_learn'), tabBarIcon: ({ color }) => <Feather name="book-open" size={22} color={color as string} /> }} />
      <Tabs.Screen name="settings" options={{ title: t('tab_settings'), tabBarIcon: ({ color }) => <Feather name="settings" size={22} color={color as string} /> }} />
    </Tabs>
  );
}
