import { type LinkingOptions, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import 'expo-dev-client';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomNav, type BottomNavRoute } from './src/components/bottom-nav';
import { ConfettiOverlay } from './src/components/confetti-overlay';
import { ImageClearHost } from './src/components/image-clear-host';
import { RunningTimerPill } from './src/components/running-timer-pill';
import { Text } from './src/components/text';
import { UpdateReadyPill } from './src/components/update-ready-pill';
import { useAppFonts } from './src/hooks/use-app-fonts';
import { useAppUsageSync } from './src/hooks/use-app-usage-sync';
import { useDeferredBottomNavNavigation } from './src/hooks/use-deferred-bottom-nav-navigation';
import { useDevHandoffImport } from './src/hooks/use-dev-handoff-import';
import { useGoogleHealthSync } from './src/hooks/use-google-health-sync';
import { useNeedNudges } from './src/hooks/use-need-nudges';
import { useReminderEngine } from './src/hooks/use-reminder-engine';
import { useSunlightTracking } from './src/hooks/use-sunlight-tracking';
import { BehaviorFormScreen } from './src/screens/behavior-form-screen';
import { BehaviorScreen } from './src/screens/behavior-screen';
import { BodyLogScreen } from './src/screens/body-log-screen';
import { CategoryFormScreen } from './src/screens/category-form-screen';
import { ChecklistFormScreen } from './src/screens/checklist-form-screen';
import { ChecklistRunScreen } from './src/screens/checklist-run-screen';
import { CravingsScreen } from './src/screens/cravings-screen';
import { CueActivityScreen } from './src/screens/cue-activity-screen';
import { CueFormScreen } from './src/screens/cue-form-screen';
import { CuesScreen } from './src/screens/cues-screen';
import { DayScreen } from './src/screens/day-screen';
import { HomeScreen } from './src/screens/home-screen';
import { LocationEditScreen } from './src/screens/location-edit-screen';
import { MoneyLogScreen } from './src/screens/money-log-screen';
import { MoodLogScreen } from './src/screens/mood-log-screen';
import { NeedsHistoryScreen } from './src/screens/needs-history-screen';
import { NeedsSettingsScreen } from './src/screens/needs-settings-screen';
import { RideItOutScreen } from './src/screens/ride-it-out-screen';
import { SavedPlacesScreen } from './src/screens/saved-places-screen';
import { SettingsScreen } from './src/screens/settings-screen';
import { ShopScreen } from './src/screens/shop-screen';
import { TaskScreen } from './src/screens/task-screen';
import { TimerScreen } from './src/screens/timer-screen';
import { useBehaviorStore } from './src/store/behavior-store';
import { useChecklistsStore } from './src/store/checklists-store';
import { useCravingsStore } from './src/store/cravings-store';
import { useCuesStore } from './src/store/cues-store';
import { useHealthStore } from './src/store/health-store';
import { useNeedsStore } from './src/store/needs-store';
import { useSettingsStore } from './src/store/settings-store';
import { useShopStore } from './src/store/shop-store';
import { useSunlightStore } from './src/store/sunlight-store';
import { useTimerStore } from './src/store/timer-store';
import type { RootStackParamList } from './src/types/navigation';
import { Colors } from './src/utils/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();
const BOTTOM_NAV_ROUTES = new Set<string>(['Cues', 'Cravings', 'Home', 'Day', 'Tasks']);
const PERSISTED_STORES = [
  useBehaviorStore,
  useChecklistsStore,
  useCravingsStore,
  useCuesStore,
  useHealthStore,
  useNeedsStore,
  useSettingsStore,
  useShopStore,
  useSunlightStore,
  useTimerStore,
];

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['exp+recupero://'],
  config: {
    screens: {
      Home: 'home',
      Timer: 'timer',
      Day: 'day',
      Tasks: 'tasks',
      BehaviorLog: 'behavior-log/:behaviorId',
      BehaviorForm: 'behavior-form',
      CategoryForm: 'category-form',
      Shop: 'shop',
      MoneyLog: 'money-log',
      Cues: 'cues',
      CueForm: 'cues/form',
      CueActivity: 'cues/activity',
      SavedPlaces: 'cues/places',
      LocationEdit: 'cues/places/edit',
      MoodLog: 'cues/mood',
      BodyLog: 'cues/body',
      Cravings: 'cravings',
      RideItOut: 'cravings/ride/:behaviorId',
    },
  },
};

function isBottomNavRoute(routeName: string | undefined): routeName is BottomNavRoute {
  return routeName != null && BOTTOM_NAV_ROUTES.has(routeName);
}

export default function App() {
  const fontsReady = useAppFonts();
  const [storesReady, setStoresReady] = useState(() => PERSISTED_STORES.every(store => store.persist.hasHydrated()));
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [activeRouteName, setActiveRouteName] = useState<string | undefined>();
  const { pendingRouteName, deferNavigation, completeNavigation } = useDeferredBottomNavNavigation<BottomNavRoute>();
  useAppUsageSync(storesReady);
  useGoogleHealthSync(storesReady);
  useReminderEngine(storesReady, navigationRef);
  useNeedNudges(storesReady, navigationRef);
  useSunlightTracking(storesReady);
  useDevHandoffImport(storesReady);

  useEffect(() => {
    const checkStoresReady = () => setStoresReady(PERSISTED_STORES.every(store => store.persist.hasHydrated()));
    const unsubscribers = PERSISTED_STORES.map(store => store.persist.onFinishHydration(checkStoresReady));
    checkStoresReady();
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, []);

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

  if (!fontsReady || !storesReady) return null;

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
                  <Stack.Screen
                    name="NeedsHistory"
                    component={NeedsHistoryScreen}
                  />
                  <Stack.Screen
                    name="NeedsSettings"
                    component={NeedsSettingsScreen}
                  />
                  <Stack.Screen
                    name="Cues"
                    component={CuesScreen}
                  />
                  <Stack.Screen
                    name="CueForm"
                    component={CueFormScreen}
                  />
                  <Stack.Screen
                    name="CueActivity"
                    component={CueActivityScreen}
                  />
                  <Stack.Screen
                    name="SavedPlaces"
                    component={SavedPlacesScreen}
                  />
                  <Stack.Screen
                    name="LocationEdit"
                    component={LocationEditScreen}
                  />
                  <Stack.Screen
                    name="MoodLog"
                    component={MoodLogScreen}
                  />
                  <Stack.Screen
                    name="BodyLog"
                    component={BodyLogScreen}
                  />
                  <Stack.Screen
                    name="Cravings"
                    component={CravingsScreen}
                    options={{ animation: 'fade_from_bottom' }}
                  />
                  <Stack.Screen
                    name="RideItOut"
                    component={RideItOutScreen}
                  />
                  <Stack.Screen
                    name="ChecklistForm"
                    component={ChecklistFormScreen}
                  />
                  <Stack.Screen
                    name="ChecklistRun"
                    component={ChecklistRunScreen}
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
              <ImageClearHost />
              {/* Routines shows these above its Add behavior button instead. */}
              {isBottomNavRoute(activeRouteName) && activeRouteName !== 'Home' && <UpdateReadyPill />}
              {isBottomNavRoute(activeRouteName) && activeRouteName !== 'Home' && (
                <RunningTimerPill onPress={() => navigationRef.isReady() && navigationRef.navigate('Timer')} />
              )}
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
