<script setup lang="ts">
import {
	InfiniteScrollCustomEvent,
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
	SearchbarCustomEvent,
} from "@ionic/vue";
import { heart, heartOutline } from "ionicons/icons";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import iconDark from "@/assets/img/icon-dark.png";
import iconLight from "@/assets/img/icon-light.png";
import AppHeader from "@/components/layout/AppHeader.vue";
import { useAudioClient } from "@/composables/useAudioClient";
import { useLayout } from "@/composables/useLayout";
import { useFavoritesStore } from "@/stores/FavoritesStore";
import { usePlayerStore } from "@/stores/PlayerStore";
import { SearchResult } from "@/types";
import { showToast } from "@/utils";

const { t } = useI18n();
const loading = ref<boolean>(false);

const layout = useLayout();
const player_store = usePlayerStore();
const favorites_store = useFavoritesStore();
const audio_client = useAudioClient();

let query: string | null | undefined = null;
const search_results = ref<SearchResult[]>([]);

const search = async (e: SearchbarCustomEvent) => {
	audio_client.clearToken();
	query = e.detail.value;
	if (query) {
		try {
			loading.value = true;
			search_results.value = await audio_client.search(query);
		} catch (error) {
			showToast(t("search.error"));
			search_results.value = [];
		} finally {
			loading.value = false;
		}
	} else {
		search_results.value = [];
	}
};

const searchContinuation = async (e: InfiniteScrollCustomEvent) => {
	try {
		const new_results = await audio_client.search(query ?? "");
		search_results.value.push(...new_results);
	} catch (error) {
		showToast(t("search.error"));
	} finally {
		e.target.complete();
	}
};
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content fullscreen class="ion-padding">
      <ion-searchbar :placeholder="t('search.placeholder')" @ion-change="search" @ion-clear="search_results = []" />
      <ion-list v-if="search_results.length">
        <ion-item v-for="result of search_results" :key="result.id" @click="player_store.play(result.id)">
          <div class="audio-thumbnail">
            <Transition name="fade" mode="out-in">
              <ion-spinner v-if="player_store.current_audio_id === result.id && player_store.fetching_audio"
                style="width: 45px; height: 45px;" name="dots"></ion-spinner>
              <ion-thumbnail v-else>
                <ion-img :src="result.thumbnail" />
              </ion-thumbnail>
            </Transition>
          </div>
          <div class="audio-info">
            <div ref="titles" class="audio-title">{{ result.title }}</div>
            <div class="audio-artist">{{ result.artist }}</div>
          </div>
          <div class="audio-duration">{{ result.duration }}</div>
          <div class="audio-actions">
            <ion-icon :icon="favorites_store.isFavorite(result.id) ? heart : heartOutline"
              :color="favorites_store.isFavorite(result.id) ? 'danger' : ''" @click.stop="favorites_store.toggleFavorite(result.id)"></ion-icon>
          </div>
        </ion-item>
        <ion-infinite-scroll @ionInfinite="searchContinuation">
          <ion-infinite-scroll-content loading-spinner="dots"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-list>
      <div v-else class="search-something">
        <ion-spinner v-if="loading" name="dots" style="width: 50px; height: 50px;"></ion-spinner>
        <div v-else class="no-results">
          <ion-img :src="layout.state.isDarkTheme ? iconLight : iconDark" style="width: 100px;" />
          <div>{{ t('search.start') }}</div>
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
