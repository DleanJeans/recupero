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
