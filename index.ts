import 'expo-dev-client';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
// Defines the background geofence task; must load before the app so Android can run it headless.
import './src/utils/reminder-geofencing';

import App from './App';

registerRootComponent(App);
