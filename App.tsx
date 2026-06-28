import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import 'expo-dev-client';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { ConfettiOverlay } from './src/components/ConfettiOverlay';
import { useAppFonts } from './src/hooks/useAppFonts';

import { BehaviorFormScreen } from './src/screens/BehaviorFormScreen';
import { BehaviorLogScreen } from './src/screens/BehaviorLogScreen';
import { DayScreen } from './src/screens/DayScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TaskScreen } from './src/screens/TaskScreen';

const Stack = createNativeStackNavigator();

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

export default function App() {
  const fontsReady = useAppFonts();

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
      }}
    >
      <KeyboardProvider>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <NavigationContainer linking={linking}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ animation: 'none' }}
              />
              <Stack.Screen
                name="Day"
                component={DayScreen}
              />
              <Stack.Screen
                name="Tasks"
                component={TaskScreen}
                options={{ animation: 'none' }}
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
          </NavigationContainer>
          <ConfettiOverlay />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
