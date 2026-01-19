import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rockscout.app',
  appName: 'RockScout',
  webDir: 'out',

  // Server configuration for development
  server: {
    // For development, uncomment the next line and update the IP
    // url: 'http://192.168.1.x:3000',
    cleartext: true,
  },

  // iOS specific configuration
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#0a0a0a',
  },

  // Android specific configuration
  android: {
    backgroundColor: '#0a0a0a',
  },

  // Plugin configurations
  plugins: {
    // Status bar configuration
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
    },

    // Geolocation for user location
    Geolocation: {
      // iOS location permission description
    },

    // Camera for photo uploads
    Camera: {
      // Photo quality and other settings
    },

    // Haptics for native feedback
    Haptics: {
      // Default haptic settings
    },
  },
};

export default config;
