import { defineStore } from "pinia";
import { ref } from "vue";
import { AudioPlayer } from "@shannic/audio-player";
import { Audio } from "@/types";

export const states = {
  paused: 0,
  playing: 1,
  buffering: 2,
};

export const usePlayerStore = defineStore("player", () => {
  const audio = ref<Audio | null>(null);
  const state = ref<number>(states.paused);
  const repeat = ref<boolean>(false);
  const currentPosition = ref<number>(0);
  const isDragging = ref<boolean>(false);
  const isFavorite = ref<boolean>(false);

  const reset = () => {
    audio.value = null;
    repeat.value = false;
    currentPosition.value = 0;
  };

  const initListeners = () => {
    AudioPlayer.addListener(
      "onCurrentPositionChange",
      (data: { position: number }) => {
        if (!isDragging.value) {
          currentPosition.value = data.position;
        }
      }
    );
    AudioPlayer.addListener("onStop", () => {
      reset();
    });
    AudioPlayer.addListener("onBuffering", () => {
      state.value = states.buffering;
    });
    AudioPlayer.addListener("onPlay", () => {
      state.value = states.playing;
    });
    AudioPlayer.addListener("onPause", () => {
      state.value = states.paused;
    });
    AudioPlayer.addListener("onToggleRepeat", () => {
      repeat.value = !repeat.value;
    });
  };

  const play = () => {
    state.value = states.playing;
    AudioPlayer.resume();
  };

  const pause = () => {
    state.value = states.paused;
    AudioPlayer.pause();
  };

  const seekTo = (position: number) => {
    currentPosition.value = position;
    AudioPlayer.seekTo({ position: position });
  };

  const stop = () => {
    AudioPlayer.stop();
    reset();
  };

  const skipNext = () => {
    AudioPlayer.skipNext();
  };

  const skipPrevious = () => {
    AudioPlayer.skipPrevious();
  };

  const toggleRepeat = () => {
    repeat.value = !repeat.value;
    AudioPlayer.toggleRepeat();
  };

  return {
    audio,
    state,
    repeat,
    currentPosition,
    isDragging,
    isFavorite,
    initListeners,
    play,
    pause,
    seekTo,
    stop,
    reset,
    skipNext,
    skipPrevious,
    toggleRepeat,
  };
});
