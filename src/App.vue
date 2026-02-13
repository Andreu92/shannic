<script setup lang="ts">
import { App } from "@capacitor/app";
import { PluginListenerHandle } from "@capacitor/core";
import { Icon } from "@iconify/vue";
import {
	IonApp,
	IonCard,
	IonCardContent,
	IonRouterOutlet,
	IonSpinner,
} from "@ionic/vue";
import { onMounted, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import MiniPlayer from "@/components/core/MiniPlayer.vue";
import { useLayout } from "@/composables/useLayout";
import useFavoritesStore from "@/stores/FavoritesStore";
import usePlayerStore from "@/stores/PlayerStore";
import useSpotifySyncStore from "@/stores/SpotifySyncStore";

const { t } = useI18n();

const layout = useLayout();
const spotify_sync_store = useSpotifySyncStore();

let resumeListener: PluginListenerHandle;

const theme_saved = localStorage.getItem("theme");
const dark_enabled = theme_saved
	? theme_saved === "dark"
	: window.matchMedia("(prefers-color-scheme: dark)").matches;

dark_enabled ? layout.setDarkTheme() : layout.setLightTheme();

onMounted(async () => {
	resumeListener = await App.addListener("resume", () => {});

	const favorites_store = useFavoritesStore();
	favorites_store.init();

	const player_store = usePlayerStore();
	player_store.initListeners();
});

onUnmounted(() => {
	resumeListener.remove();
});

watch(
	() => spotify_sync_store.counter,
	() => {
		if (spotify_sync_store.counter === spotify_sync_store.total_saved_tracks) {
			spotify_sync_store.finishSync();
		}
	},
);
</script>

<template>
  <ion-app >
    <ion-router-outlet></ion-router-outlet>
    <MiniPlayer></MiniPlayer>
    
    <!-- Spotify Sync Status -->
    <ion-card color="dark" v-if="spotify_sync_store.is_syncing" class="spotify-sync-card">
      <ion-card-content>
        <div class="flex-between">
          <div v-if="!spotify_sync_store.total_saved_tracks" class="flex-center-vertical">
            <div class="spotify-icon-background" style="width: 20px; height: 20px;">
              <Icon icon="logos:spotify-icon"></Icon>
            </div>    
            <div>{{ t("spotify.starting_import") }}</div>
          </div>
          <div v-else class="flex-center-vertical">
            <div class="spotify-icon-background" style="width: 20px; height: 20px;">
              <Icon icon="logos:spotify-icon"></Icon>
            </div>    
            <div>{{ t("spotify.favorites.importing", [spotify_sync_store.counter, spotify_sync_store.total_saved_tracks]) }}</div>
          </div>
          <ion-spinner name="dots"></ion-spinner>
        </div>
      </ion-card-content>
    </ion-card>
  </ion-app>
</template>

<style scoped>
.spotify-sync-card {
  position: absolute;
  bottom: 65px;
  left: 0;
  right: 0;
  z-index: 1;
}

.flex-center-vertical {
  display: flex;
  align-items: center;
  gap: 10px;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>

