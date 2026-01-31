<script setup lang="ts">
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import {
	createGesture,
	Gesture,
	IonIcon,
	IonImg,
	IonRange,
	IonSpinner,
	IonThumbnail,
	RangeCustomEvent,
} from "@ionic/vue";
import {
	heart,
	heartOutline,
	infinite,
	pause,
	play,
	playSkipBack,
	playSkipForward,
	repeat,
} from "ionicons/icons";
import { reactive, useTemplateRef, watch } from "vue";
import { useFavoritesStore } from "@/stores/FavoritesStore";
import { states, usePlayerStore } from "@/stores/PlayerStore";
import { formatDuration } from "@/utils";

const player_store = usePlayerStore();
const favorites_store = useFavoritesStore();
const player = useTemplateRef("player");
const player_coords = reactive({ sX: 0, sY: 0, x: 0, y: 0 });
let gesture: Gesture | null = null;
const offsets: { top: number; left: number } = { top: 0, left: 0 };

watch(player, (el) => {
	if (el && gesture == null) {
		gesture = createGesture({
			el: el,
			threshold: 0,
			gestureName: "drag-player",
			priority: 100,
			canStart: (ev) => {
				const target = ev.event.target as HTMLElement;
				if (target.closest("ion-range") || target.closest("ion-icon")) {
					return false;
				}
				return true;
			},

			onStart: () => {
				Haptics.impact({ style: ImpactStyle.Light });
				offsets.top = el.offsetTop;
				offsets.left = el.offsetLeft;

				player_coords.sX = player_coords.x;
				player_coords.sY = player_coords.y;
			},

			onMove: (ev) => {
				const clamp = (v: number, min: number, max: number) =>
					Math.min(Math.max(v, min), max);

				player_coords.x = clamp(
					player_coords.sX + ev.deltaX,
					-offsets.left,
					window.innerWidth - el.offsetWidth - offsets.left,
				);
				player_coords.y = clamp(
					player_coords.sY + ev.deltaY,
					-offsets.top,
					window.innerHeight - el.offsetHeight - offsets.top,
				);
			},
		});

		gesture.enable();
	} else {
		gesture?.destroy();
		gesture = null;
	}
});

const handleSeek = (ev: RangeCustomEvent) => {
	const newPosition = (ev.detail.value as number) * 1000;
	player_store.seekTo(newPosition);
};
</script>

<template>
  <div class="mini-player" ref="player" v-if="player_store.audio" :style="{
    color: player_store.audio!.colors.text,
    background: player_store.audio!.colors.background,
    transform: `translate3d(${player_coords.x}px, ${player_coords.y}px, 0)`
  }">
    <div style="display: flex; gap: 12px;">
      <div style="min-width: 45px;">
        <ion-thumbnail>
          <ion-img :src="player_store.audio!.thumbnail.url"></ion-img>
        </ion-thumbnail>
      </div>
      <div class="mini-player-audio-info">
        <div class="audio-title">{{ player_store.audio!.title }}</div>
        <div class="audio-artist">{{ player_store.audio!.artist }}</div>
      </div>
    </div>
    <div class="mini-player-actions">
      <ion-icon :src="player_store.repeat ? infinite : repeat" @click="player_store.toggleRepeat()"></ion-icon>
      <ion-icon :src="playSkipBack" @click="player_store.skipPrevious()"></ion-icon>
      <ion-spinner v-if="player_store.state == states.buffering"></ion-spinner>
      <ion-icon v-else :src="player_store.state == states.playing ? pause : play"
        @click="player_store.state == states.playing ? player_store.pause() : player_store.resume()"></ion-icon>
      <ion-icon :src="playSkipForward" @click="player_store.skipNext()"></ion-icon>
      <ion-icon :src="favorites_store.isFavorite(player_store.audio!.id) ? heart : heartOutline" @click="favorites_store.toggleFavorite(player_store.audio!.id)"></ion-icon>
    </div>
    <div class="mini-player-audio-range">
      <div>{{ formatDuration(player_store.current_position) }}</div>
      <ion-range :value="Math.floor(player_store.current_position / 1000)" :min="0"
        :max="Math.floor(player_store.audio!.duration / 1000)" @ionKnobMoveStart="player_store.isDragging = true"
        @ionKnobMoveEnd="player_store.isDragging = false" @ionChange="handleSeek"></ion-range>
      <div>{{ player_store.audio!.durationText }}</div>
    </div>
  </div>
</template>

<style lang="css" scoped>
ion-thumbnail {
  --size: 45px;
  --border-radius: 10px;
}

ion-spinner {
  width: 20px;
  height: 20px;
}

ion-range {
  --bar-background: v-bind(player_store.audio?.colors?.text);
  --bar-background-active: v-bind(player_store.audio?.colors?.text);
  --knob-background: v-bind(player_store.audio?.colors?.text);
  --knob-size: 15px;
}

.mini-player {
  position: fixed;
  bottom: 60px;
  left: 10px;
  right: 10px;
  z-index: 1;
  padding: 10px;
  border-radius: 10px;
  box-shadow: rgba(99, 99, 99, 0.2) 0 2px 8px;
}

.mini-player-audio-info {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  overflow: hidden;
}

.mini-player-actions {
  font-size: 1.6rem;
  display: flex;
  justify-content: space-between;
  padding: 0 5px;
  margin-top: 15px;
}

.mini-player-audio-range {
  font-size: 0.8rem;
  margin-top: 10px;
  height: 25px;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 0 5px;
}
</style>
