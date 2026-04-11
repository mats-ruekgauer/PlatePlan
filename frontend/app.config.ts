import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PlatePlan',
  slug: 'plateplan',
  scheme: 'plateplan',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#2D6A4F',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.plateplan.app',
    infoPlist: {
      NSCameraUsageDescription:
        'PlatePlan uses the camera to scan grocery receipts so it can track prices and improve your shopping list.',
      NSPhotoLibraryUsageDescription:
        'PlatePlan can read receipt photos from your library.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2D6A4F',
    },
    package: 'com.plateplan.app',
    permissions: ['CAMERA'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-asset',
    'expo-font',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#2D6A4F',
        sounds: [],
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'PlatePlan uses the camera to scan grocery receipts so it can track prices and improve your shopping list.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: 'YOUR_EAS_PROJECT_ID',
    },
  },
});
