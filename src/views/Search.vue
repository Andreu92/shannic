<script setup lang="ts">
import { onMounted, ref } from "vue";
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
import { SearchResult, Audio, PlaylistDocument } from "@/types";
import headphones from "@/assets/img/headphones2.svg"
import { useI18n } from "vue-i18n";

import { AudioPlayer } from "@shannic/audio-player";
import { useAudioClient } from "@/composables/useAudioClient";
import { useAudioService } from "@/composables/useAudioService";

const { t } = useI18n();
const loading = ref<boolean>(false);

const AudioClient = useAudioClient();
const AudioService = useAudioService();

let query: string | null | undefined = null;
const search_results = ref<SearchResult[]>([]);

const favorite_playlist = ref<PlaylistDocument | null>(null);

const search = async (e: SearchbarCustomEvent) => {
  AudioClient.clearToken();
  query = e.detail.value;
  if (query) {
    loading.value = true;
    search_results.value = await AudioClient.search(query);
    loading.value = false;
  } else {
    search_results.value = [];
  }
}

const searchContinuation = async (e: InfiniteScrollCustomEvent) => {
  const new_results = await AudioClient.search(query!);
  search_results.value.push(...new_results);
  e.target.complete();
}

//Refactor
const play = async (id: string) => {
  const audio = await AudioClient.get(id);
  AudioPlayer.play(audio as Required<Audio>);
}

const isFavorite = (id: string): boolean => {
  if (!favorite_playlist.value) return false;

  const favorites = favorite_playlist.value.audios || [];
  return favorites.some(o => o.audioId === id);
}

const toggleFav = async (id: string) => {
  const isFav = await AudioService.isFavorite(id);
  if (isFav) {
    AudioService.removeFavorite(id);
  } else {
    AudioService.addFavorite(id);
  }
}

onMounted(() => {
  AudioService.onChangeFavorites((favorites: PlaylistDocument) => {
    favorite_playlist.value = favorites;
  });
});
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
            <ion-icon :icon="isFavorite(result.id) ? heart : heartOutline"
              :color="isFavorite(result.id) ? 'danger' : ''" @click.stop="toggleFav(result.id)"></ion-icon>
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
