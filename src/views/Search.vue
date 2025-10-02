<script setup lang="ts">
import { ref } from "vue";
import {
  IonPage,
  IonSearchbar,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonImg,
  IonIcon,
  SearchbarCustomEvent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  InfiniteScrollCustomEvent
} from "@ionic/vue";
import { play as playIcon, heart, heartOutline, addOutline, musicalNotes } from "ionicons/icons";

import AppHeader from "@/components/layout/AppHeader.vue";
import { SearchResult, Audio } from "@/types";
import headphones from "@/assets/img/headphones2.svg"
import { useI18n } from "vue-i18n";

import { AudioPlayer } from "@shannic/audio-player";
import { useAudioService } from "@/composables/useAudioService";

const { t } = useI18n();

const AudioService = useAudioService();
let query: string | null | undefined = null;
const search_results = ref<SearchResult[]>([]);

const search = async (e: SearchbarCustomEvent) => {
  query = e.detail.value;
  if (query) {
    search_results.value = await AudioService.search(query);
  } else {
    search_results.value = [];
    AudioService.clearToken();
  }
}

const searchContinuation = async (e: InfiniteScrollCustomEvent) => {
  const new_results = await AudioService.search(query!);
  search_results.value.push(...new_results);
  e.target.complete();
}

const play = async (id: string) => {
  const audio = await AudioService.get(id);
  AudioPlayer.play(audio as Required<Audio>);
};

const toggleFav = (id: string) => {
  console.log("togglefav")
};

const addToPlaylist = (id: string) => {

};
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content fullscreen class="ion-padding">
      <ion-searchbar :placeholder="t('search.placeholder')" @ion-change="search"
        @ion-clear="search_results = []"></ion-searchbar>
      <ion-list v-if="search_results.length">
        <ion-item v-for="result in search_results" :key="result.id" @click="play(result.id)">
          <ion-thumbnail>
            <ion-img :src="result.thumbnails[result.thumbnails.length - 1].url" />
          </ion-thumbnail>
          <ion-label class="song-label">{{ result.title }}</ion-label>
          <div class="song-actions">
            <ion-icon :icon="heartOutline" @click.stop="toggleFav(result.id)"></ion-icon>
            <ion-icon :icon="addOutline" @click.stop="addToPlaylist(result.id)"></ion-icon>
          </div>
        </ion-item>
        <ion-infinite-scroll @ionInfinite="searchContinuation">
          <ion-infinite-scroll-content></ion-infinite-scroll-content>
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
  --size: 40px;
  --border-radius: 4px;
}

.song-label {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 10px;
  font-size: 12px;
}

.song-actions {
  display: flex;
  gap: 5px;
  font-size: 20px;
}

.search-something {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100% - 60px);
}
</style>
