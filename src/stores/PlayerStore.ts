import { defineStore } from "pinia";
import { ref } from "vue";
import { useAudioService } from "@/composables/useAudioService";
import { usePlaylistService } from "@/composables/usePlaylistService";
import { type PlayerAudio, player_plugin } from "@/plugins/PlayerPlugin";
import { useFavoritesStore } from "@/stores/FavoritesStore";
import type { AudioDocument, PlayerPlaylist, PlaylistDocument } from "@/types";

export const states = {
	paused: 0,
	playing: 1,
	buffering: 2,
};

export const usePlayerStore = defineStore("player", () => {
	const audio_service = useAudioService();
	const playlist_service = usePlaylistService();
	const favorites_store = useFavoritesStore();

	const audio = ref<AudioDocument | null>(null);
	const playlist = ref<PlayerPlaylist | null>(null);
	const state = ref<number>(states.paused);
	const fetching_audio = ref<boolean>(false);
	const repeat = ref<boolean>(false);
	const current_audio_id = ref<string | null>(null);
	const current_position = ref<number>(0);
	const isDragging = ref<boolean>(false);

	const reset = () => {
		audio.value = null;
		playlist.value = null;
		repeat.value = false;
		current_audio_id.value = null;
		current_position.value = 0;
	};

	const initListeners = () => {
		player_plugin.addListener("onCurrentPositionChange", (data) => {
			const { position } = data as { position: number };
			if (!isDragging.value) {
				current_position.value = position;
			}
		});
		player_plugin.addListener("onStop", () => {
			reset();
		});
		player_plugin.addListener("onBuffering", () => {
			state.value = states.buffering;
		});
		player_plugin.addListener("onPlay", () => {
			state.value = states.playing;
		});
		player_plugin.addListener("onPause", () => {
			state.value = states.paused;
		});
		player_plugin.addListener("onSkipNext", () => {
			skipNext();
		});
		player_plugin.addListener("onSkipPrevious", () => {
			skipPrevious();
		});
		player_plugin.addListener("onToggleRepeat", (data) => {
			const { repeating } = data as { repeating: boolean };
			repeat.value = repeating;
		});
		player_plugin.addListener("onToggleFavorite", () => {
			if (audio.value) favorites_store.toggleFavorite(audio.value.id);
		});
		player_plugin.addListener("onSourceError", async () => {
			if (audio.value) {
				state.value = states.buffering;
				await audio_service.updateAudio(audio.value.id);
				play(audio.value.id);
			}
		});
	};

	const play = async (audio_id: string) => {
		current_audio_id.value = audio_id;
		fetching_audio.value = true;

		const audio_document: AudioDocument =
			await audio_service.getAudio(audio_id);

		fetching_audio.value = false;

		const audio_to_play: PlayerAudio = {
			...audio_document.toMutableJSON(),
			thumbnail: audio_document.thumbnail.url,
			favorite: favorites_store.isFavorite(audio_id),
		};

		audio.value = audio_document;
		current_position.value = 0;
		player_plugin.play(audio_to_play);
	};

	const playPlaylist = async (
		playlist_id: string,
		shuffle: boolean = false,
	) => {
		const playlist_document: PlaylistDocument =
			await playlist_service.getPlaylist(playlist_id);

		playlist.value = {
			id: playlist_document.id,
			currentIndex: 0,
			audios: shuffle
				? playlist_document.toShuffledArray()
				: playlist_document.toSortedArray(),
		};

		play(playlist.value.audios[0]);
	};

	const resume = () => {
		state.value = states.playing;
		player_plugin.resume();
	};

	const pause = () => {
		state.value = states.paused;
		player_plugin.pause();
	};

	const seekTo = (position: number) => {
		current_position.value = position;
		player_plugin.seekTo({ position: position });
	};

	const stop = () => {
		player_plugin.stop();
		reset();
	};

	const skipNext = () => {
		if (
			playlist.value &&
			playlist.value.currentIndex < playlist.value.audios.length - 1
		) {
			playlist.value.currentIndex++;
			play(playlist.value.audios[playlist.value.currentIndex]);
		}
	};

	const skipPrevious = () => {
		if (current_position.value > 1000) {
			seekTo(0);
			return;
		}

		if (playlist.value && playlist.value.currentIndex > 0) {
			playlist.value.currentIndex--;
			play(playlist.value.audios[playlist.value.currentIndex]);
		}
	};

	const toggleRepeat = () => {
		repeat.value = !repeat.value;
		player_plugin.toggleRepeat({ repeating: repeat.value });
	};

	return {
		audio,
		playlist,
		state,
		fetching_audio,
		repeat,
		current_audio_id,
		current_position,
		isDragging,
		initListeners,
		play,
		playPlaylist,
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
