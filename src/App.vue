<script setup lang="ts">
import { IonApp, IonRouterOutlet } from "@ionic/vue";
import MiniPlayer from "@/components/core/MiniPlayer.vue";
import { usePlayerStore } from "@/stores/PlayerStore"
import { onMounted } from "vue";
import { useFavoritesStore } from "@/stores/FavoriteStore";

onMounted(() => {
  const player_store = usePlayerStore();
  player_store.initListeners();

  const favorites_store = useFavoritesStore();
  favorites_store.init();
  favorites_store.subscribe();
});
</script>

<template>
  <ion-app>
    <ion-router-outlet></ion-router-outlet>
    <MiniPlayer></MiniPlayer>
  </ion-app>
</template>
