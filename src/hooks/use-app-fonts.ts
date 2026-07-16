import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts({
    GoogleSans: require('../../assets/fonts/GoogleSans.ttf'),
    'GoogleSans-Bold': require('../../assets/fonts/GoogleSans-Bold.ttf'),
    NotoColorEmoji: require('../../assets/fonts/NotoColorEmoji.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return fontsLoaded || !!fontError;
}
