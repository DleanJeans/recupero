import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import 'expo-dev-client';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomNav, type BottomNavRoute } from './src/components/BottomNav';
import { ConfettiOverlay } from './src/components/ConfettiOverlay';
import { useAppFonts } from './src/hooks/useAppFonts';

import { BehaviorFormScreen } from './src/screens/BehaviorFormScreen';
import { BehaviorLogScreen } from './src/screens/BehaviorLogScreen';
import { DayScreen } from './src/screens/DayScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TaskScreen } from './src/screens/TaskScreen';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const BOTTOM_NAV_ROUTES = new Set<string>(['Home', 'Day', 'Tasks']);

const linking = {
  prefixes: ['exp+recupero://'],
  config: {
    screens: {
      Home: 'home',
      Day: 'day',
      Tasks: 'tasks',
      BehaviorDetails: 'behavior/:behaviorId',
      BehaviorLog: 'behavior-log/:behaviorId',
      BehaviorForm: 'behavior-form',
    },
  },
};

function isBottomNavRoute(routeName: string | undefined): routeName is BottomNavRoute {
  return routeName != null && BOTTOM_NAV_ROUTES.has(routeName);
}

export default function App() {
  const fontsReady = useAppFonts();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [activeRouteName, setActiveRouteName] = useState<string | undefined>();

  const syncActiveRoute = useCallback(() => {
    setActiveRouteName(navigationRef.getCurrentRoute()?.name);
  }, [navigationRef]);

  const handleBottomNavNavigate = useCallback(
    (routeName: BottomNavRoute) => {
      setActiveRouteName(routeName);
      requestAnimationFrame(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate(routeName);
        }
      });
    },
    [navigationRef],
  );

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
      }}
    >
      <KeyboardProvider>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            onReady={syncActiveRoute}
            onStateChange={syncActiveRoute}
          >
            <View style={styles.appShell}>
              <View style={styles.navigator}>
                <Stack.Navigator
                  screenOptions={{
                    headerShown: false,
                  }}
                >
                  <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ animation: 'ios_from_left' }}
                  />
                  <Stack.Screen
                    name="Day"
                    component={DayScreen}
                    options={{ animation: 'fade_from_bottom' }}
                  />
                  <Stack.Screen
                    name="Tasks"
                    component={TaskScreen}
                    options={{ animation: 'ios_from_right' }}
                  />

                  <Stack.Screen
                    name="BehaviorLog"
                    component={BehaviorLogScreen}
                  />
                  <Stack.Screen
                    name="BehaviorForm"
                    component={BehaviorFormScreen}
                  />
                  <Stack.Screen
                    name="Settings"
                    component={SettingsScreen}
                  />
                </Stack.Navigator>
              </View>
              {isBottomNavRoute(activeRouteName) && (
                <BottomNav
                  activeRoute={activeRouteName}
                  onNavigate={handleBottomNavNavigate}
                />
              )}
            </View>
          </NavigationContainer>
          <ConfettiOverlay />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
  },
  navigator: {
    flex: 1,
  },
});
