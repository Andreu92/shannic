<script setup lang="ts">
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { IonApp, IonRouterOutlet } from "@ionic/vue";
import { onBeforeMount, onMounted, onUnmounted } from "vue";
import MiniPlayer from "@/components/core/MiniPlayer.vue";
import SpotifySyncCard from "@/components/core/SpotifySyncCard.vue";
import { useLayout } from "@/composables/useLayout";
import useFavoritesStore from "@/stores/FavoritesStore";
import usePlayerStore, { states } from "@/stores/PlayerStore";

const layout = useLayout();
const favorites_store = useFavoritesStore();
const player_store = usePlayerStore();

let stateChangeListener: PluginListenerHandle;

onBeforeMount(async () => {
  layout.applyStoredTheme();

  stateChangeListener = await App.addListener("appStateChange", (state) => {
    if (state.isActive) {
      if (player_store.state === states.playing) {
        player_store.startProgressTimer();
      }
    } else player_store.stopProgressTimer();
  });
});

onMounted(async () => {
  favorites_store.init();
  player_store.initListeners();
});

onUnmounted(() => {
  stateChangeListener.remove();
});
</script>

<template>
  <ion-app>
    <ion-router-outlet></ion-router-outlet>
    <MiniPlayer></MiniPlayer>
    <SpotifySyncCard></SpotifySyncCard>
  </ion-app>
</template>

<style scoped></style>
