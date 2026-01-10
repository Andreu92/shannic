<script setup lang="ts">
import { ref } from "vue";
import {
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonContent,
  IonList,
  IonItem,
  IonThumbnail,
  IonImg,
  IonIcon,
  SearchbarCustomEvent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  InfiniteScrollCustomEvent
} from "@ionic/vue";
import { heart, heartOutline } from "ionicons/icons";

import AppHeader from "@/components/layout/AppHeader.vue";
import { SearchResult } from "@/types";
import headphones from "@/assets/img/headphones2.svg"
import { useI18n } from "vue-i18n";

import { Audio } from "@/types";
import { AudioPlayer, Audio as AudioPlayerAudio } from "@shannic/audio-player";
import { useAudioClient } from "@/composables/useAudioClient";
import { useAudioService } from "@/composables/useAudioService";
import { usePlayerStore } from "@/stores/PlayerStore";
import { useFavoritesStore } from "@/stores/FavoriteStore";

const { t } = useI18n();
const loading = ref<boolean>(false);

const favorites_store = useFavoritesStore();
const audio_client = useAudioClient();
const audio_service = useAudioService();

let query: string | null | undefined = null;
const search_results = ref<SearchResult[]>([]);

const search = async (e: SearchbarCustomEvent) => {
  audio_client.clearToken();
  query = e.detail.value;
  if (query) {
    loading.value = true;
    search_results.value = await audio_client.search(query);
    loading.value = false;
  } else {
    search_results.value = [];
  }
}

const searchContinuation = async (e: InfiniteScrollCustomEvent) => {
  const new_results = await audio_client.search(query!);
  search_results.value.push(...new_results);
  e.target.complete();
}

//Refactor
const play = async (id: string) => {
  const audio: Audio = await audio_client.get(id);
  const playerStore = usePlayerStore();
  playerStore.audio = audio;
  AudioPlayer.play(audio as Required<AudioPlayerAudio>);
}
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content fullscreen class="ion-padding">
      <div style="position: relative;">
        <ion-searchbar :placeholder="t('search.placeholder')" @ion-change="search" @ion-clear="search_results = []" />
        <ion-spinner v-if="loading" name="dots" class="searchbar-loading"></ion-spinner>
      </div>
      <ion-list v-if="search_results.length">
        <ion-item v-for="result in search_results" :key="result.id" @click="play(result.id)">
          <ion-thumbnail>
            <ion-img :src="result.thumbnails[result.thumbnails.length - 1].url" />
          </ion-thumbnail>
          <div class="audio-info">
            <div ref="titles" class="audio-title">{{ result.title }}</div>
            <div class="audio-artist">{{ result.artist }}</div>
          </div>
          <div class="audio-duration">{{ result.duration }}</div>
          <div class="audio-actions">
            <ion-icon :icon="favorites_store.isFavorite(result.id) ? heart : heartOutline"
              :color="favorites_store.isFavorite(result.id) ? 'danger' : ''" @click.stop="audio_service.toggleFavorite(result.id)"></ion-icon>
          </div>
        </ion-item>
        <ion-infinite-scroll @ionInfinite="searchContinuation">
          <ion-infinite-scroll-content loading-spinner="dots"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-list>
      <div v-else class="search-something">
        <ion-icon :icon="headphones" style="font-size: 90px; color: var(--ion-color-dark-tint)"></ion-icon>
        <div>{{ t('search.start') }}</div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style lang="scss" scoped>
ion-thumbnail {
  --size: 45px;
  --border-radius: 10px;
}

.search-something {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100% - 60px);
}
</style>
