import type { ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const rawVariant = process.env.APP_VARIANT;
if (rawVariant != null && rawVariant !== 'development' && rawVariant !== 'preview' && rawVariant !== 'production') {
  throw new Error(`Unknown APP_VARIANT: ${rawVariant}`);
}
const variant: Variant = (rawVariant as Variant) || 'development';

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
    'expo-location',
    {
      locationWhenInUsePermission: 'Recupero uses your location to place pins for saved places.',
      locationAlwaysAndWhenInUsePermission:
        'Recupero uses your location in the background to send place reminders when you arrive at or leave a saved place.',
      isAndroidBackgroundLocationEnabled: true,
      // Sunlight's precise tracking follows your position every second from a foreground service.
      isAndroidForegroundServiceEnabled: true,
    },
  ],
  'expo-notifications',
  // Google Maps SDK key (Android). Set GOOGLE_MAPS_API_KEY in .env or as an EAS environment variable.
  ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY }],
];

// Google Health (Fitbit) sign-in: an iOS-type OAuth client id from Google Cloud (works on Android with PKCE,
// no client secret). Its reversed id is registered as a URL scheme so the sign-in redirect returns to the app.
const googleHealthClientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
const googleHealthSuffix = '.apps.googleusercontent.com';
const googleHealthScheme = googleHealthClientId?.endsWith(googleHealthSuffix)
  ? `com.googleusercontent.apps.${googleHealthClientId.slice(0, -googleHealthSuffix.length)}`
  : undefined;
if (!googleHealthScheme) {
  console.warn('GOOGLE_HEALTH_CLIENT_ID is not set: Settings > Google Health will be unavailable.');
}

if (!process.env.GOOGLE_MAPS_API_KEY) {
  console.warn('GOOGLE_MAPS_API_KEY is not set: the location cue map will render blank on Android.');
}

// Every variant needs the bigger Gradle heap/Metaspace and no daemon: without it, release builds
// run out of Metaspace in the Kotlin/KSP tasks and the leftover daemon keeps `eas build --local` hanging.
plugins.push('./plugins/withJVMMemory');

if (isDev) {
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
      // Google Health sign-in redirect.
      ...(googleHealthScheme
        ? [{ action: 'VIEW', data: [{ scheme: googleHealthScheme }], category: ['BROWSABLE', 'DEFAULT'] }]
        : []),
      // Dev build only: receive JSON backups from prod/preview ("Send to dev") or the share sheet.
      ...(isDev
        ? [
            { action: 'VIEW', data: [{ scheme: 'content', mimeType: 'application/json' }], category: ['DEFAULT'] },
            { action: 'SEND', data: [{ mimeType: 'application/json' }], category: ['DEFAULT'] },
          ]
        : []),
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  updates: {
    url: 'https://u.expo.dev/8a864518-09f4-4aac-b87c-44f7cfe5ae0c',
  },
  runtimeVersion: { policy: 'fingerprint' },
  extra: {
    googleHealthClientId,
    eas: {
      projectId: '8a864518-09f4-4aac-b87c-44f7cfe5ae0c',
    },
  },
  plugins,
  owner: 'dleanjeans',
};

export default config;
