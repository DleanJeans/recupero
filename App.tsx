import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import 'expo-dev-client';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { AppLaunchLoading } from './src/components/app-launch-loading';
import { BottomNav, type BottomNavRoute } from './src/components/bottom-nav';
import { ConfettiOverlay } from './src/components/confetti-overlay';
import { Text } from './src/components/text';
import { useAppFonts } from './src/hooks/use-app-fonts';
import { useDeferredBottomNavNavigation } from './src/hooks/use-deferred-bottom-nav-navigation';

import { BehaviorFormScreen } from './src/screens/behavior-form-screen';
import { BehaviorScreen } from './src/screens/behavior-screen';
import { CategoryFormScreen } from './src/screens/category-form-screen';
import { DayScreen } from './src/screens/day-screen';
import { HomeScreen } from './src/screens/home-screen';
import { MoneyLogScreen } from './src/screens/money-log-screen';
import { SettingsScreen } from './src/screens/settings-screen';
import { ShopScreen } from './src/screens/shop-screen';
import { TaskScreen } from './src/screens/task-screen';
import { TimerScreen } from './src/screens/timer-screen';
import type { RootStackParamList } from './src/types/navigation';
import { Colors } from './src/utils/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();
const BOTTOM_NAV_ROUTES = new Set<string>(['Home', 'Timer', 'Day', 'Tasks']);

const linking = {
  prefixes: ['exp+recupero://'],
  config: {
    screens: {
      Home: 'home',
      Timer: 'timer',
      Day: 'day',
      Tasks: 'tasks',
      BehaviorDetails: 'behavior/:behaviorId',
      BehaviorLog: 'behavior-log/:behaviorId',
      BehaviorForm: 'behavior-form',
      CategoryForm: 'category-form',
      Shop: 'shop',
      MoneyLog: 'money-log',
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
  const { pendingRouteName, deferNavigation, completeNavigation } = useDeferredBottomNavNavigation<BottomNavRoute>();

  const syncActiveRoute = useCallback(() => {
    const routeName = navigationRef.getCurrentRoute()?.name;
    setActiveRouteName(routeName);
    completeNavigation(routeName);
  }, [completeNavigation, navigationRef]);

  const handleBottomNavNavigate = useCallback(
    (routeName: BottomNavRoute) => {
      setActiveRouteName(routeName);
      deferNavigation(routeName, () => {
        if (navigationRef.isReady()) {
          navigationRef.navigate(routeName);
        }
      });
    },
    [deferNavigation, navigationRef],
  );

  if (!fontsReady) return <AppLaunchLoading />;

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
                    name="Timer"
                    component={TimerScreen}
                    options={{ animation: 'fade_from_bottom' }}
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
                    component={BehaviorScreen}
                  />
                  <Stack.Screen
                    name="BehaviorForm"
                    component={BehaviorFormScreen}
                  />
                  <Stack.Screen
                    name="CategoryForm"
                    component={CategoryFormScreen}
                  />
                  <Stack.Screen
                    name="Shop"
                    component={ShopScreen}
                  />
                  <Stack.Screen
                    name="MoneyLog"
                    component={MoneyLogScreen}
                  />
                  <Stack.Screen
                    name="Settings"
                    component={SettingsScreen}
                  />
                </Stack.Navigator>
                {pendingRouteName != null && (
                  <View style={styles.screenLoading}>
                    <ActivityIndicator
                      color={Colors.text.faint}
                      size="small"
                    />
                    <Text style={styles.screenLoadingText}>Loading</Text>
                  </View>
                )}
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
  screenLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.bg.primary,
  },
  screenLoadingText: {
    color: Colors.text.faint,
    fontSize: 13,
    fontWeight: '600',
  },
});
