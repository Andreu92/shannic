import { defineStore } from "pinia";
import { ref } from "vue";
import { type PlayerAudio, player_plugin } from "@/plugins/PlayerPlugin";
import type { RxAudio } from "@/schemas/audio";
import useAudioService from "@/services/AudioService";
import useFavoritesStore from "@/stores/FavoritesStore";
import { showToast } from "@/utils";
import { useI18n } from "vue-i18n";
import { type YoutubeAudioItem } from "@/plugins/YoutubePlugin";
import { AudioDocument } from "@/types";

export const states = {
  paused: 0,
  playing: 1,
  buffering: 2,
};

const usePlayerStore = defineStore("player", () => {
  const { t } = useI18n();

  const audio_service = useAudioService();
  const favorites_store = useFavoritesStore();

  const current_audio = ref<AudioDocument | null>(null);
  const state = ref<number>(states.paused);
  const repeat = ref<boolean>(false);
  const current_position = ref<number>(0);
  const has_next = ref<boolean>(false);
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
    current_audio.value = null;
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
      const { id } = data as { id: string; index: number };

      current_audio.value = await audio_service.get(id);

      const response = await player_plugin.hasNext();
      has_next.value = response.has_next;

      setFavorite(favorites_store.isFavorite(id));
    });

    player_plugin.addListener("onToggleRepeat", (data) => {
      const { repeating } = data as { repeating: boolean };
      repeat.value = repeating;
    });

    player_plugin.addListener("onToggleFavorite", (data) => {
      const { id } = data as { id: string };
      favorites_store.toggle(id);
    });

    player_plugin.addListener("onSrcRefresh", async (data) => {
      const { id, src, expires_at } = data as {
        id: string;
        src: string;
        expires_at: number;
      };

      const audio = await audio_service.get(id);
      if (audio && !audio.isDownloaded()) audio.refreshSrc(src, expires_at);
    });

    player_plugin.addListener("onSetNextItem", async (data) => {
      audio_service.createOrUpdate(data as YoutubeAudioItem);

      const response = await player_plugin.hasNext();
      has_next.value = response.has_next;
    });

    player_plugin.addListener("onSourceError", (data) => {
      const { code, name, message } = data as {
        code: number;
        name: string;
        message: string;
      };
      if (code === 2001) showToast(t("network.offline"));
      else
        showToast(
          t("errors.src_error") + " " + code + " - " + name + " - " + message,
        );
      state.value = states.paused;
    });

    player_plugin.addListener("onAudioUnplayable", async () => {
      showToast(t("errors.audio_unplayable"));
      if (has_next.value) skipNext();
      else reset();
    });
  };

  const play = (audio_items: RxAudio[], shuffle: boolean = false) => {
    const player_audio_items: PlayerAudio[] = audio_items.map((a) => ({
      id: a.id,
      title: a.title,
      author: a.author,
      thumbnail: a.thumbnail,
      src: a.src,
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
    player_plugin.seekTo({ position });
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

  const setFavorite = (is_fav: boolean) => {
    player_plugin.setFavorite({ favorite: is_fav });
  };

  const toggleRepeat = () => {
    repeat.value = !repeat.value;
    player_plugin.setRepeat({ repeating: repeat.value });
  };

  return {
    current_audio,
    state,
    repeat,
    current_position,
    has_next,
    initListeners,
    startProgressTimer,
    stopProgressTimer,
    play,
    resume,
    pause,
    stop,
    seekTo,
    skipNext,
    skipPrevious,
    toggleRepeat,
    setFavorite,
  };
});

export default usePlayerStore;
