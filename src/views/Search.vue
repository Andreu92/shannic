<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  IonPage,
  IonSearchbar,
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
import { SearchResult, Audio, PlaylistCollection, PlaylistDocument, AudioCollection } from "@/types";
import headphones from "@/assets/img/headphones2.svg"
import { useI18n } from "vue-i18n";

import { AudioPlayer } from "@shannic/audio-player";
import { useAudioClient } from "@/composables/useAudioClient";
import { useDatabase } from '@/database';

const FAVORITES_ID = "1";

const { t } = useI18n();
const db = useDatabase();

const AudioClient = useAudioClient();
let query: string | null | undefined = null;
const search_results = ref<SearchResult[]>([]);

const playlists: PlaylistCollection = db.playlists;
const favorite_playlist = ref<PlaylistDocument | null>();

onMounted(() => {
  playlists.findOne(FAVORITES_ID).$.subscribe(favorites => {
    favorite_playlist.value = favorites;
  });
})

const search = async (e: SearchbarCustomEvent) => {
  AudioClient.clearToken();
  query = e.detail.value;
  if (query) {
    search_results.value = await AudioClient.search(query);
  } else {
    search_results.value = [];
  }
}

const searchContinuation = async (e: InfiniteScrollCustomEvent) => {
  const new_results = await AudioClient.search(query!);
  search_results.value.push(...new_results);
  e.target.complete();
}

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
  const favorite_playlist = await playlists.findOne(FAVORITES_ID).exec();

  if (!favorite_playlist) return;

  const favorites = favorite_playlist?.audios || [];
  let newAudios = [...favorites];

  const isFav = favorites.some(o => o.audioId === id);
  if (isFav) {
    const toRemove = newAudios.find(o => o.audioId === id);
    if (toRemove) {
      const removedPos = toRemove.position;
      newAudios = newAudios
        .filter(o => o.audioId !== id)
        .map(o =>
          o.position > removedPos
            ? { ...o, position: o.position - 1 }
            : o
        );
    }
  } else {
    const audio = await AudioClient.get(id);
    const audioCollection: AudioCollection = db.audios;

    audioCollection.insertIfNotExists({
      ...audio,
      createdAt: Date.now()
    });

    const maxPos = newAudios.length
      ? Math.max(...newAudios.map(t => t.position))
      : -1;

    newAudios.push({
      audioId: id,
      position: maxPos + 1
    });
  }

  favorite_playlist.incrementalPatch({
    audios: newAudios
  });
}
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
  --size: 45px;
  --border-radius: 10px;
}

.audio-info {
  flex: 1;
  overflow: hidden;
  min-width: 0;
  margin: 0 10px;
}

.audio-title,
.audio-artist {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-artist,
.audio-duration {
  color: var(--ion-color-medium);
}

.audio-title {
  font-size: 0.9rem;
}

.audio-artist {
  font-size: 0.8rem;
}

.audio-duration {
  font-size: 0.6875rem;
  margin-right: 10px;
}

.audio-actions {
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
