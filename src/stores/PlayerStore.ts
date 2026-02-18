import { defineStore } from "pinia";
import { ref } from "vue";
import { type PlayerAudio, player_plugin } from "@/plugins/PlayerPlugin";
import type { RxAudio } from "@/schemas/audio";
import useAudioService from "@/services/AudioService";
import useFavoritesStore from "@/stores/FavoritesStore";

export const states = {
  paused: 0,
  playing: 1,
  buffering: 2,
};

const usePlayerStore = defineStore("player", () => {
  const favorites_store = useFavoritesStore();
  const audio_service = useAudioService();

  const audio = ref<RxAudio | null>(null);
  let current_index: number | null = null;
  const playlist_items = ref<RxAudio[] | null>(null);
  const state = ref<number>(states.paused);
  const repeat = ref<boolean>(false);
  const current_position = ref<number>(0);
  let progress_timer: number | null = null;

  const startProgressTimer = () => {
    stopProgressTimer();

    progress_timer = window.setInterval(async () => {
      current_position.value = (
        await player_plugin.getCurrentPosition()
      ).position;
    }, 500);
  };

  const stopProgressTimer = () => {
    if (progress_timer) window.clearInterval(progress_timer);
    progress_timer = null;
  };

  const reset = () => {
    audio.value = null;
    current_index = null;
    playlist_items.value = null;
    repeat.value = false;
    current_position.value = 0;
    stopProgressTimer();
  };

  const initListeners = () => {
    player_plugin.addListener("onBuffering", () => {
      state.value = states.buffering;
    });
    player_plugin.addListener("onPlay", (data) => {
      const { position } = data as { position: number };

      current_position.value = position;
      startProgressTimer();
      state.value = states.playing;
    });
    player_plugin.addListener("onPause", (data) => {
      const { position } = data as { position: number };

      current_position.value = position;
      stopProgressTimer();
      state.value = states.paused;
    });
    player_plugin.addListener("onMediaItemChanged", (data) => {
      if (!playlist_items.value) return;
      const { index } = data as { index: number };
      audio.value = playlist_items.value[index];
      current_index = index;
    });
    player_plugin.addListener("onToggleRepeat", (data) => {
      const { repeating } = data as { repeating: boolean };
      repeat.value = repeating;
    });
    player_plugin.addListener("onToggleFavorite", () => {
      if (audio.value) favorites_store.toggleFavorite(audio.value.id);
    });
    player_plugin.addListener("onUrlRefresh", (data) => {
      const { id, url, expires_at } = data as {
        id: string;
        url: string;
        expires_at: number;
      };

      if (audio.value && audio.value.id === id) {
        audio.value.url = url;
        audio.value.expires_at = expires_at;
      }

      if (playlist_items.value) {
        const index = playlist_items.value.findIndex((a) => a.id === id);
        if (index !== -1) {
          playlist_items.value[index].url = url;
          playlist_items.value[index].expires_at = expires_at;
        }
      }

      audio_service.refreshUrl(id, url, expires_at);
    });
    player_plugin.addListener("onSourceError", async () => {
      //TODO: Update this because it will fail in a mortal loop
      state.value = states.buffering;
    });
  };

  const play = async (audio_items: RxAudio[], shuffle: boolean = false) => {
    playlist_items.value = audio_items;

    const player_audio_items: PlayerAudio[] = audio_items.map((a) => ({
      id: a.id,
      title: a.title,
      author: a.author,
      duration: a.duration,
      thumbnail: a.thumbnail,
      url: a.url,
      expires_at: a.expires_at,
      favorite: favorites_store.isFavorite(a.id),
    }));

    player_plugin.play({ audio_items: player_audio_items, shuffle });
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
    player_plugin.skipNext();
  };

  const skipPrevious = () => {
    player_plugin.skipPrevious();
  };

  const toggleFavorite = (
    is_fav: boolean,
    index: number = current_index as number,
  ) => {
    player_plugin.toggleFavorite({ favorite: is_fav, index });
  };

  const toggleRepeat = () => {
    repeat.value = !repeat.value;
    player_plugin.toggleRepeat({ repeating: repeat.value });
  };

  const isInPlaylist = (audio_id: string): boolean => {
    return playlist_items.value?.some((a) => a.id === audio_id) ?? false;
  };

  const getIndexById = (audio_id: string): number => {
    return playlist_items.value?.findIndex((a) => a.id === audio_id) ?? -1;
  };

  return {
    audio,
    state,
    repeat,
    current_position,
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
    toggleFavorite,
    stopProgressTimer,
    startProgressTimer,
    isInPlaylist,
    getIndexById,
  };
});

export default usePlayerStore;
