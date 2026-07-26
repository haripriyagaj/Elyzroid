import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.elyzorid.app",
  appName: "Elyzorid",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    Preferences: {
      group: "elyzorid",
    },
  },
};

export default config;

