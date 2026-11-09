import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts } from '@/lib/theme';
import { useT } from '@/lib/i18n';

export default function TabsLayout() {
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand2,
        tabBarInactiveTintColor: colors.textMute,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border, ...(Platform.OS === 'web' ? { height: 64, paddingBottom: 8, paddingTop: 6 } : null) },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab_rank'), tabBarIcon: ({ color, size }) => <Feather name="award" size={size} color={color as string} /> }} />
      <Tabs.Screen name="portfolio" options={{ title: t('tab_portfolio'), tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size} color={color as string} /> }} />
      <Tabs.Screen name="watchlist" options={{ title: t('tab_watch'), tabBarIcon: ({ color, size }) => <Feather name="star" size={size} color={color as string} /> }} />
      <Tabs.Screen name="learn" options={{ title: t('tab_learn'), tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color as string} /> }} />
      <Tabs.Screen name="settings" options={{ title: t('tab_settings'), tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color as string} /> }} />
    </Tabs>
  );
}
