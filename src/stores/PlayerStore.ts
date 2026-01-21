import {
	type Audio as AudioPlayerAudio,
	audio_player,
} from "@shannic/audio-player";
import { defineStore } from "pinia";
import { ref } from "vue";
import { useAudioService } from "@/composables/useAudioService";
import { useFavoritesStore } from "@/stores/FavoritesStore";
import type { AudioDocument } from "@/types";

export const states = {
	paused: 0,
	playing: 1,
	buffering: 2,
};

export const usePlayerStore = defineStore("player", () => {
	const audio_service = useAudioService();
	const favorites_store = useFavoritesStore();
	const audio = ref<AudioDocument | null>(null);
	const state = ref<number>(states.paused);
	const repeat = ref<boolean>(false);
	const currentPosition = ref<number>(0);
	const isDragging = ref<boolean>(false);

	const reset = () => {
		audio.value = null;
		repeat.value = false;
		currentPosition.value = 0;
	};

	const initListeners = () => {
		audio_player.addListener(
			"onCurrentPositionChange",
			(data: { position: number }) => {
				if (!isDragging.value) {
					currentPosition.value = data.position;
				}
			},
		);
		audio_player.addListener("onStop", () => {
			reset();
		});
		audio_player.addListener("onBuffering", () => {
			state.value = states.buffering;
		});
		audio_player.addListener("onPlay", () => {
			state.value = states.playing;
		});
		audio_player.addListener("onPause", () => {
			state.value = states.paused;
		});
		audio_player.addListener(
			"onToggleRepeat",
			(data: { repeating: boolean }) => {
				repeat.value = data.repeating;
			},
		);
		audio_player.addListener(
			"onToggleFavorite",
			(_data: { favorite: boolean }) => {
				if (audio.value) favorites_store.toggleFavorite(audio.value.id);
			},
		);
	};

	const play = async (id: string, is_favorite: boolean) => {
		const audio_document: AudioDocument = await audio_service.getAudio(id);
		const audio_to_play: AudioPlayerAudio = {
			...audio_document.toMutableJSON(),
			favorite: is_favorite,
		};
		audio.value = audio_document;
		audio_player.play(audio_to_play);
	};

	const resume = () => {
		state.value = states.playing;
		audio_player.resume();
	};

	const pause = () => {
		state.value = states.paused;
		audio_player.pause();
	};

	const seekTo = (position: number) => {
		currentPosition.value = position;
		audio_player.seekTo({ position: position });
	};

	const stop = () => {
		audio_player.stop();
		reset();
	};

	const skipNext = () => {
		audio_player.skipNext();
	};

	const skipPrevious = () => {
		audio_player.skipPrevious();
	};

	const toggleRepeat = () => {
		repeat.value = !repeat.value;
		audio_player.toggleRepeat({ repeating: repeat.value });
	};

	return {
		audio,
		state,
		repeat,
		currentPosition,
		isDragging,
		initListeners,
		play,
		resume,
		pause,
		seekTo,
		stop,
		reset,
		skipNext,
		skipPrevious,
		toggleRepeat,
	};
});
