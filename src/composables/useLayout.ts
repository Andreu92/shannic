import { reactive } from "vue";

const layout = reactive({
	isDarkTheme: false,
});

export const useLayout = () => {
	return layout;
};
