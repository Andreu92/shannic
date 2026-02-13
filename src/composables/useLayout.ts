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

	return {
		state,
		setLightTheme,
		setDarkTheme,
	};
};
