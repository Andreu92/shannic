<script setup lang="ts">
import { IonApp, IonRouterOutlet } from "@ionic/vue";
import { onMounted } from "vue";
import MiniPlayer from "@/components/core/MiniPlayer.vue";
import { useFavoritesStore } from "@/stores/FavoritesStore";
import { usePlayerStore } from "@/stores/PlayerStore";

onMounted(() => {
	const favorites_store = useFavoritesStore();
	favorites_store.init();

	const player_store = usePlayerStore();
	player_store.initListeners();
});
</script>

<template>
  <ion-app>
    <ion-router-outlet></ion-router-outlet>
    <MiniPlayer></MiniPlayer>
  </ion-app>
</template>
