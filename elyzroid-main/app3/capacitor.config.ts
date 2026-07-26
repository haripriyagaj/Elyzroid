import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elyzorid.app',
  appName: 'Elyzorid',
  webDir: 'build',
  // Remove server block for production. Keep for live-reload dev only.
  // server: {
  //   url: 'http://10.0.2.2:3000',  // emulator localhost alias
  //   cleartext: true,
  // },
  plugins: {
    Preferences: {
      group: 'ElyzoridStorage',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_elyzorid',
      iconColor: '#00d4ff',
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true, // disable for production
  },
};

export default config;
