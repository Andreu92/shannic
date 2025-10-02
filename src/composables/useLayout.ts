import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { reactive, watch } from "vue";

const layout = reactive({
  isDarkTheme: false,
});

if (Capacitor.isNativePlatform()) {
  watch(
    () => layout.isDarkTheme,
    (value) => {
      StatusBar.setStyle({
        style: value == false ? Style.Light : Style.Dark,
      });
      StatusBar.setBackgroundColor({
        color: value == false ? "#FFFFFF" : "#1c1c1c",
      });
    },
    { immediate: true }
  );
}

export const useLayout = () => {
  return layout;
}
