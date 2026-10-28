import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { WalletProvider } from '@/wallet/context';
import { LivePassProvider } from '@/livepass/context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <WalletProvider><LivePassProvider><AnimatedSplashOverlay />
      <Slot /></LivePassProvider></WalletProvider>
    </ThemeProvider>
  );
}
