import { defineStore } from "pinia";
import { ref } from "vue";

const useSpotifySyncStore = defineStore("spotify_sync", () => {
	const is_syncing = ref<boolean>(false);
	const counter = ref<number>(0);
	const total_saved_tracks = ref<number | null>(null);

	const incrementCounter = () => {
		counter.value++;
	};

	const finishSync = () => {
		is_syncing.value = false;
		counter.value = 0;
		total_saved_tracks.value = null;
	};

	return {
		is_syncing,
		counter,
		total_saved_tracks,
		incrementCounter,
		finishSync,
	};
});

export default useSpotifySyncStore;
