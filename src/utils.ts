import { toastController } from "@ionic/vue";
import { alertOutline } from "ionicons/icons";

export const formatDuration = (ms: number) => {
	const sec = Math.floor(ms / 1000);

	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = sec % 60;

	if (h > 0) {
		return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
	} else {
		return [m, s].map((v) => String(v).padStart(2, "0")).join(":");
	}
};

export const shuffleArray = <T>(array: T[]) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
};

export const showToast = async (message: string, color: string = "danger") => {
	const toast = await toastController.create({
		message: message,
		duration: 5000,
		color: color,
		position: "bottom",
		swipeGesture: "vertical",
		icon: alertOutline,
	});

	await toast.present();
};
