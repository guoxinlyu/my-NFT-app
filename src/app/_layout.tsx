import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { WalletProvider } from '@/wallet/context';
import { LivePassProvider } from '@/livepass/context';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <WalletProvider><LivePassProvider><AnimatedSplashOverlay />
      <AppTabs /></LivePassProvider></WalletProvider>
    </ThemeProvider>
  );
}
