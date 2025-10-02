import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.andreu92.shannic",
  appName: "Shannic",
  webDir: "dist",
  plugins: {
    StatusBar: {
      overlaysWebView: false
    }
  }
};

export default config;
