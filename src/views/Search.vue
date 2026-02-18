<script setup lang="ts">
import { Keyboard } from "@capacitor/keyboard";
import {
  type InfiniteScrollCustomEvent,
  IonContent,
  IonIcon,
  IonImg,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonList,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonThumbnail,
  type SearchbarCustomEvent,
} from "@ionic/vue";
import { heart, heartOutline } from "ionicons/icons";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import iconDark from "@/assets/img/icon-dark.png";
import iconLight from "@/assets/img/icon-light.png";
import useYoutubeClient from "@/clients/YoutubeClient";
import AppHeader from "@/components/layout/AppHeader.vue";
import { useLayout } from "@/composables/useLayout";
import type { YoutubeSearch } from "@/plugins/YoutubeClientPlugin";
import type { RxAudio } from "@/schemas/audio";
import useAudioService from "@/services/AudioService";
import useFavoritesStore from "@/stores/FavoritesStore";
import usePlayerStore from "@/stores/PlayerStore";
import type { SearchResult } from "@/types";
import { showToast } from "@/utils";

const { t } = useI18n();
const loading = ref<boolean>(false);

const layout = useLayout();
const player_store = usePlayerStore();
const audio_service = useAudioService();
const favorites_store = useFavoritesStore();
const youtube_client = useYoutubeClient();

const audio_id_to_play = ref<string | null>(null);
const fetching_audio = ref<boolean>(false);
let query: string | null | undefined = null;
const search_items = ref<SearchResult[]>([]);
let next_token: string | null = null;

const search = async (e: SearchbarCustomEvent) => {
  Keyboard.hide();
  search_items.value = [];
  query = e.detail.value;
  if (query) {
    try {
      loading.value = true;
      const search_data: YoutubeSearch = await youtube_client.search(query);
      search_items.value = search_data.items;
      next_token = search_data.next_token;
    } catch {
      showToast(t("search.error"));
      search_items.value = [];
    } finally {
      loading.value = false;
    }
  } else {
    search_items.value = [];
  }
};

const searchContinuation = async (e: InfiniteScrollCustomEvent) => {
  try {
    const new_results = await youtube_client.search(query ?? "", next_token);
    search_items.value.push(...new_results.items);
    next_token = new_results.next_token;
  } catch {
    showToast(t("search.error"));
  } finally {
    e.target.complete();
  }
};

const play = async (audio: SearchResult) => {
  audio_id_to_play.value = audio.id;
  fetching_audio.value = true;

  const audio_to_play: RxAudio = (
    await audio_service.getAudio(audio.id)
  ).toMutableJSON();

  player_store.play([audio_to_play]);
  fetching_audio.value = false;
};

const toggleFavorite = async (audio_id: string) => {
  const is_fav = await favorites_store.toggleFavorite(audio_id);
  if (player_store.isInPlaylist(audio_id)) {
    const index = player_store.getIndexById(audio_id);
    player_store.toggleFavorite(is_fav, index);
  }
};
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content fullscreen class="ion-padding">
      <ion-searchbar
        :placeholder="t('search.placeholder')"
        @ion-change="search"
        @ion-clear="search_items = []"
      />
      <ion-list
        v-if="search_items.length"
        style="margin-top: 10px"
        lines="none"
      >
        <ion-item
          v-for="result of search_items"
          :key="result.id"
          @click="play(result)"
        >
          <div class="audio-thumbnail">
            <Transition name="fade" mode="out-in">
              <ion-spinner
                v-if="audio_id_to_play === result.id && fetching_audio === true"
                style="width: 45px; height: 45px"
                name="dots"
              ></ion-spinner>
              <ion-thumbnail v-else>
                <ion-img :src="result.thumbnail" />
              </ion-thumbnail>
            </Transition>
          </div>
          <div class="audio-info">
            <div ref="titles" class="audio-title">{{ result.title }}</div>
            <div class="audio-artist">{{ result.author }}</div>
          </div>
          <div class="audio-duration">{{ result.duration }}</div>
          <div class="audio-actions">
            <ion-icon
              :icon="
                favorites_store.isFavorite(result.id) ? heart : heartOutline
              "
              :color="favorites_store.isFavorite(result.id) ? 'danger' : ''"
              @click.stop="toggleFavorite(result.id)"
            ></ion-icon>
          </div>
        </ion-item>
        <ion-infinite-scroll @ionInfinite="searchContinuation">
          <ion-infinite-scroll-content
            loading-spinner="dots"
          ></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-list>
      <div v-else class="search-something">
        <ion-spinner
          v-if="loading"
          name="dots"
          style="width: 50px; height: 50px"
        ></ion-spinner>
        <div v-else class="no-results">
          <ion-img
            :src="layout.state.isDarkTheme ? iconLight : iconDark"
            style="width: 100px"
          />
          <div>{{ t("search.start") }}</div>
        </div>
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
  align-items: center;
  justify-content: center;
  height: calc(100% - 60px);
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
</style>
