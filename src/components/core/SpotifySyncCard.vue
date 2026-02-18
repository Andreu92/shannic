<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { IonCard, IonCardContent, IonSpinner } from "@ionic/vue";
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import useSpotifySyncStore from "@/stores/SpotifySyncStore";

const { t } = useI18n();

const spotify_sync_store = useSpotifySyncStore();

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
  <ion-card
    color="dark"
    v-if="spotify_sync_store.is_syncing"
    class="spotify-sync-card"
  >
    <ion-card-content>
      <div class="flex-between">
        <div
          v-if="!spotify_sync_store.total_saved_tracks"
          class="flex-center-vertical"
        >
          <div
            class="spotify-icon-background"
            style="width: 20px; height: 20px"
          >
            <Icon icon="logos:spotify-icon"></Icon>
          </div>
          <div>{{ t("spotify.starting_import") }}</div>
        </div>
        <div v-else class="flex-center-vertical">
          <div
            class="spotify-icon-background"
            style="width: 20px; height: 20px"
          >
            <Icon icon="logos:spotify-icon"></Icon>
          </div>
          <div>
            {{
              t("spotify.favorites.importing", [
                spotify_sync_store.counter,
                spotify_sync_store.total_saved_tracks,
              ])
            }}
          </div>
        </div>
        <ion-spinner name="dots"></ion-spinner>
      </div>
    </ion-card-content>
  </ion-card>
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
