<script setup lang="ts">
import { App, type ListenerHandle } from "@/platform";
import { IonApp, IonRouterOutlet } from "@ionic/vue";
import { onBeforeMount, onMounted, onUnmounted } from "vue";
import MiniPlayer from "@/components/core/MiniPlayer.vue";
import SpotifySyncCard from "@/components/core/SpotifySyncCard.vue";
import UpdateChecker from "@/components/core/UpdateChecker.vue";
import { useLayout } from "@/composables/useLayout";
import useFavoritesStore from "@/stores/FavoritesStore";
import usePlayerStore, { states } from "@/stores/PlayerStore";

const layout = useLayout();
const favorites_store = useFavoritesStore();
const player_store = usePlayerStore();

let stateChangeListener: ListenerHandle;

onBeforeMount(async () => {
  layout.applyStoredTheme();

  stateChangeListener = App.addListener("appStateChange", (state) => {
    if (state.isActive) {
      if (player_store.state === states.playing) {
        player_store.startProgressTimer();
      }
    } else player_store.stopProgressTimer();
  });
});

onMounted(() => {
  // Hide splash on android
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).SplashBridge?.hide();
  
  favorites_store.init();
  player_store.initListeners();
});

onUnmounted(() => {
  stateChangeListener.remove();
});
</script>

<template>
  <ion-app>
    <ion-router-outlet />
    <MiniPlayer />
    <SpotifySyncCard />
    <UpdateChecker />
  </ion-app>
</template>
