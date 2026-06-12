import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import 'expo-dev-client';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppFonts } from './src/hooks/useAppFonts';
import { BehaviorDetailsScreen } from './src/screens/BehaviorDetailsScreen';
import { BehaviorFormScreen } from './src/screens/BehaviorFormScreen';
import { BehaviorLogScreen } from './src/screens/BehaviorLogScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TimelineScreen } from './src/screens/TimelineScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['exp+recupero://'],
  config: {
    screens: {
      Home: 'home',
      Timeline: 'timeline',
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
        <SafeAreaProvider>
          <NavigationContainer linking={linking}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
              />
              <Stack.Screen
                name="Timeline"
                component={TimelineScreen}
              />
              <Stack.Screen
                name="BehaviorDetails"
                component={BehaviorDetailsScreen}
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
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
