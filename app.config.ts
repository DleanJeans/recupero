import type { ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const variant: Variant = (process.env.APP_VARIANT as Variant) || 'development';

const isDev = variant === 'development';
const bundleSuffix = isDev ? '.dev' : variant === 'preview' ? '.preview' : '';
const baseId = 'com.dleanjeans.recupero';
const bundleId = `${baseId}${bundleSuffix}`;

const plugins: NonNullable<ExpoConfig['plugins']> = [
  './plugins/with-loading-splash',
  'expo-font',
  'expo-splash-screen',
  'expo-sharing',
  '@react-native-community/datetimepicker',
  [
    'react-native-maps',
    {
      // Required for Android (Google Maps). iOS uses Apple Maps by default — no key needed.
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    },
  ],
  // Cues · location trigger: registers foreground/background location permissions,
  // iOS usage descriptions, and Android background-mode entry. The actual engine
  // (geofence registration, task definitions) is in src/utils/cue-engine.ts.
  [
    'expo-location',
    {
      locationAlwaysAndWhenInUsePermission:
        'Recupero uses your location to remind you to log behaviours when you arrive at or leave a saved place.',
      isAndroidBackgroundLocationEnabled: true,
      isIosBackgroundLocationEnabled: true,
      isAndroidForegroundServiceEnabled: true,
    },
  ],
  // Cues · notification nudge: local notifications for time / habit / mood / location cues.
  [
    'expo-notifications',
    {
      // iOS — the OS displays this when asking for notification permission.
      // Android 13+ uses the runtime permission; no extra config needed here.
    },
  ],
];

if (isDev) {
  plugins.push('./plugins/withJVMMemory');
  plugins.push(['expo-dev-client', { launchMode: 'most-recent' }]);
}

const config: ExpoConfig = {
  name: isDev ? 'Recupero Dev' : 'Recupero',
  slug: 'recupero',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme: 'exp+recupero',
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    // iOS shows the NS*UsageDescription strings in the OS permission prompt.
    // expo-location injects its own (locationAlwaysAndWhenInUsePermission above),
    // but expo-notifications requires this one to be set explicitly.
    infoPlist: {
      NSUserNotificationUsageDescription:
        'Recupero sends gentle nudges when a cue fires (e.g. entering a saved place, or at your scheduled time).',
      UIBackgroundModes: ['location'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: bundleId,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'exp+recupero' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  updates: {
    url: 'https://u.expo.dev/8a864518-09f4-4aac-b87c-44f7cfe5ae0c',
  },
  runtimeVersion: '0.0.1',
  extra: {
    eas: {
      projectId: '8a864518-09f4-4aac-b87c-44f7cfe5ae0c',
    },
  },
  plugins,
  owner: 'dleanjeans',
};

export default config;
