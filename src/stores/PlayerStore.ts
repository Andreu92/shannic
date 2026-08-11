import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { type PlayerAudio, player_plugin } from "@/plugins/PlayerPlugin";
import type { RxAudio } from "@/schemas/audio";
import useAudioService from "@/services/AudioService";
import useFavoritesStore from "@/stores/FavoritesStore";
import { buildAudio, showToast } from "@/utils";
import { useI18n } from "vue-i18n";
import { type YoutubeAudioItem } from "@/plugins/YoutubePlugin";

export const states = {
  paused: 0,
  playing: 1,
  buffering: 2,
};

const usePlayerStore = defineStore("player", () => {
  const { t } = useI18n();

  const favorites_store = useFavoritesStore();
  const audio_service = useAudioService();

  const audio = ref<RxAudio | null>(null);
  const current_index = ref<number | null>(null);
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
    }, 1000);
  };

  const stopProgressTimer = () => {
    if (progress_timer) window.clearInterval(progress_timer);
    progress_timer = null;
  };

  const reset = () => {
    audio.value = null;
    current_index.value = null;
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
    player_plugin.addListener("onMediaItemChanged", async (data) => {
      if (!playlist_items.value) return;

      try {
        const { id, index } = data as { id: string, index: number };
        const current_audio: RxAudio = playlist_items.value[index];
        
        if (current_audio.id == id) {
          audio.value = current_audio;
          current_index.value = index;
        } else {
          // fix autoplay thread interrupt possible disaster
          const { is_in_queue } = await player_plugin.isInQueue({id: current_audio.id});
          if (!is_in_queue) playlist_items.value.splice(index, 1);
          
          const current_audio_index: number = playlist_items.value.findIndex(a => a.id == id);
          if (current_audio_index != -1) {
            audio.value = playlist_items.value[current_audio_index];
            current_index.value = current_audio_index;
          }
        }
      } catch (e) {
        console.log(e);
      }
    });
    player_plugin.addListener("onToggleRepeat", (data) => {
      const { repeating } = data as { repeating: boolean };
      repeat.value = repeating;
    });
    player_plugin.addListener("onToggleFavorite", () => {
      if (audio.value) favorites_store.toggleFavorite(audio.value.id);
    });
    player_plugin.addListener("onSrcRefresh", (data) => {
      const { id, src, expires_at } = data as {
        id: string;
        src: string;
        expires_at: number;
      };

      if (audio.value && audio.value.id === id) {
        audio.value.src = src;
        audio.value.expires_at = expires_at;
      }

      if (playlist_items.value) {
        const index = playlist_items.value.findIndex((a) => a.id === id);
        if (index !== -1) {
          playlist_items.value[index].src = src;
          playlist_items.value[index].expires_at = expires_at;
        }
      }

      audio_service.refreshSrc(id, src, expires_at);
    });
    player_plugin.addListener("onSetNextItem", async (data) => {
      const next_item = await audio_service.createOrUpdateAudio(
        await buildAudio(data as YoutubeAudioItem),
      );

      if (!playlist_items.value) return;

      const is_favorite = favorites_store.isFavorite(next_item.id);
      playlist_items.value.push(next_item.toMutableJSON());
      toggleFavorite(is_favorite, playlist_items.value?.length - 1);
    });
    player_plugin.addListener("onSourceError", () => {
      //TO DO: Show Error
      state.value = states.buffering;
    });
    player_plugin.addListener("onAudioUnplayable", () => {
      showToast(t("errors.audio_unplayable"));
      if (hasNext.value) skipNext();
      else reset();
    });
  };

  const play = (audio_items: RxAudio[], shuffle: boolean = false) => {
    playlist_items.value = audio_items;

    const player_audio_items: PlayerAudio[] = audio_items.map((a) => ({
      id: a.id,
      title: a.title,
      author: a.author,
      thumbnail: a.thumbnail,
      src: a.src,
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

  const hasNext = computed<boolean>(() => {
    if (current_index.value === null || !playlist_items.value) return false;
    return current_index.value < playlist_items.value.length - 1;
  });

  const skipPrevious = () => {
    player_plugin.skipPrevious();
  };

  const toggleFavorite = (
    is_fav: boolean,
    index: number = current_index.value as number,
  ) => {
    player_plugin.toggleFavorite({ favorite: is_fav, index });
  };

  const toggleRepeat = () => {
    repeat.value = !repeat.value;
    player_plugin.toggleRepeat({ repeating: repeat.value });
  };

  const alreadyInQueue = (audio_id: string): boolean => {
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
    hasNext,
    skipPrevious,
    toggleRepeat,
    toggleFavorite,
    stopProgressTimer,
    startProgressTimer,
    alreadyInQueue,
    getIndexById,
  };
});

export default usePlayerStore;
