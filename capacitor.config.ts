import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.andreu92.shannic",
	appName: "Shannic",
	webDir: "dist",
	plugins: {
		SplashScreen: {
			launchShowDuration: 500,
			androidScaleType: "CENTER_CROP"
    }
	}
};

export default config;
