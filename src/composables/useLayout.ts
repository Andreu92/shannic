import { reactive } from "vue";

const state = reactive({
  isDarkTheme: false,
});

export const useLayout = () => {
  const setLightTheme = () => {
    localStorage.setItem("theme", "light");
    state.isDarkTheme = false;
    document.documentElement.classList.remove("ion-palette-dark");
  };

  const setDarkTheme = () => {
    localStorage.setItem("theme", "dark");
    state.isDarkTheme = true;
    document.documentElement.classList.add("ion-palette-dark");
  };

  const applyStoredTheme = () => {
    const theme_saved = localStorage.getItem("theme");
    const dark_enabled = theme_saved
      ? theme_saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (dark_enabled) setDarkTheme();
    else setLightTheme();
  };

  return {
    state,
    setLightTheme,
    setDarkTheme,
    applyStoredTheme,
  };
};
