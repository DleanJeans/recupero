import 'expo-dev-client';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
// Defines the background geofence task; must load before the app so Android can run it headless.
import './src/utils/reminder-geofencing';
// Defines the task behind Sunlight's precise (every-second) background tracking.
import './src/utils/sunlight-precise-tracking';
// Defines + registers the task that runs notification buttons (Start timer, Later, Stop) without opening the app.
import './src/utils/notification-actions';

import App from './App';

registerRootComponent(App);
