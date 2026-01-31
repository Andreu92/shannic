import { reactive } from "vue";

const state = reactive({
	isDarkTheme: false,
});

export const useLayout = () => {
	const setLightTheme = () => {
		state.isDarkTheme = false;
		document.documentElement.classList.remove("ion-palette-dark");
	};

	const setDarkTheme = () => {
		state.isDarkTheme = true;
		document.documentElement.classList.add("ion-palette-dark");
	};

	return {
		state,
		setLightTheme,
		setDarkTheme,
	};
};
