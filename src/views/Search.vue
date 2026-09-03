<script setup lang="ts">
import { Keyboard } from "@capacitor/keyboard";
import {
  IonContent,
  IonIcon,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  IonThumbnail,
  type SearchbarCustomEvent,
  type SegmentCustomEvent,
} from "@ionic/vue";
import { heart, heartOutline, mic, musicalNotes } from "ionicons/icons";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import iconDark from "@/assets/img/icon-dark.png";
import iconLight from "@/assets/img/icon-light.png";
import {
  type YoutubeSearch,
  YoutubeSearchItem,
  youtube_plugin,
} from "@/plugins/YoutubePlugin";
import AppHeader from "@/components/layout/AppHeader.vue";
import { useLayout } from "@/composables/useLayout";
import useAudioService from "@/services/AudioService";
import useFavoritesStore from "@/stores/FavoritesStore";
import useNetworkStore from "@/stores/NetworkStore";
import usePlayerStore from "@/stores/PlayerStore";
import type { AudioItem } from "@/types";
import { formatDuration, onImgError, showToast } from "@/utils";
import VirtualList from "@/components/ui/VirtualList.vue";
import {
  CapacitorException,
} from "@capacitor/core";
import { useAudioItem } from "@/composables/useAudioItem";

const { t } = useI18n();

const layout = useLayout();
const audio_item = useAudioItem();

const audio_service = useAudioService();

const player_store = usePlayerStore();
const favorites_store = useFavoritesStore();
const network_store = useNetworkStore();

const search_query = ref<string | null | undefined>(null);
const search_music = ref<boolean>(false);
const loading = ref<boolean>(false);
const fetching_next_page = ref<boolean>(false);

const search_results = ref<YoutubeSearchItem[]>([]);
const has_next_page = ref<boolean>(false);

const search = async (e?: SearchbarCustomEvent) => {
  search_results.value = [];
  has_next_page.value = false;

  Keyboard.hide();

  if (!network_store.is_online) {
    showToast(t("network.offline"), "warning");
    return;
  }

  if (e?.detail?.value) search_query.value = e.detail.value.trim();
  if (!search_query.value || !search_query.value.trim().length) {
    clearSearch();
    return;
  }

  try {
    loading.value = true;

    const search_data: YoutubeSearch = await youtube_plugin.search({
      query: search_query.value,
      only_music: search_music.value,
    });

    has_next_page.value = search_data.has_next_page;
    search_results.value = search_data.items;
  } catch (error) {
    if (error instanceof CapacitorException) {
      if (error.message === "NO_RESULTS")
        showToast(t("search.noResults"), "warning");
      else showToast(t("search.error"));
    }

    has_next_page.value = false;
    search_results.value = [];
  } finally {
    loading.value = false;
  }
};

const clearSearch = () => {
  search_query.value = null;
  has_next_page.value = false;
  search_results.value = [];
};

const fetchNextPage = async () => {
  if (fetching_next_page.value) return;

  if (!network_store.is_online) {
    showToast(t("network.offline"), "warning");
    return;
  }

  try {
    fetching_next_page.value = true;

    const new_results: YoutubeSearch = await youtube_plugin.fetchNextPage();

    has_next_page.value = new_results.has_next_page;
    search_results.value.push(
      ...new_results.items.filter(
        (item) => !search_results.value.some((i) => i.id === item.id),
      ),
    );
  } catch {
    showToast(t("search.error"));
  } finally {
    fetching_next_page.value = false;
  }
};

const toggleSearchMusic = (e: SegmentCustomEvent) => {
  search_music.value = e.detail.value === "true";
  if (search_query.value != null && search_query.value.length > 0) search();
};

const play = async (item: YoutubeSearchItem) => {
  if (!network_store.is_online) {
    showToast(t("network.offline"), "warning");
    return;
  }

  const audio = await audio_service.createOrUpdate(
    await audio_item.build(item),
  );

  player_store.play([audio]);
};

const toggleFavorite = async (search_item: YoutubeSearchItem) => {
  let favorite: boolean;
  if (favorites_store.isFavorite(search_item.id)) {
    favorites_store.remove(search_item.id);
    favorite = false;
  } else {
    if (!network_store.is_online) {
      showToast(t("network.offline"), "warning");
      return;
    }

    const item: AudioItem = await audio_item.build(search_item);
    await audio_service.create(item);
    favorites_store.add(item.id);
    favorite = true;
  }

  if (player_store.current_audio?.id === search_item.id)
    player_store.setFavorite(favorite);
};
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content class="ion-padding">
      <div class="flex col h-full">
        <ion-searchbar
          :placeholder="`${t('pages.search')}... :)`"
          @ion-change="search"
          @ion-clear="clearSearch"
        />

        <ion-segment
          :value="search_music ? 'true' : 'false'"
          style="padding: 0px 6px; margin-bottom: 10px"
          @ion-change="toggleSearchMusic"
        >
          <ion-segment-button value="false" layout="icon-end">
            <ion-label>{{ t("search.all") }}</ion-label>
            <ion-icon :icon="mic"></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="true" layout="icon-end">
            <ion-label>{{ t("search.music") }}</ion-label>
            <ion-icon :icon="musicalNotes"></ion-icon>
          </ion-segment-button>
        </ion-segment>

        <VirtualList
          v-if="loading || search_results.length > 0"
          :items="search_results"
          :loading="loading"
          :loading-next-page="fetching_next_page"
          :has-more="has_next_page"
          @load-next-page="fetchNextPage"
        >
          <template #item="{ item }">
            <div class="flex center w-full h-full" @click="play(item)">
              <div class="audio-thumbnail">
                <ion-thumbnail>
                  <img
                    :src="item.thumbnail"
                    loading="lazy"
                    @error="onImgError(item.thumbnail, $event)"
                  />
                </ion-thumbnail>
              </div>
              <div class="audio-info">
                <div ref="titles" class="audio-title">
                  {{ item.title }}
                </div>
                <div class="audio-artist">
                  {{ item.author }}
                </div>
              </div>
              <div class="audio-duration">
                {{ formatDuration(item.duration) }}
              </div>
              <div class="audio-actions">
                <ion-icon
                  :icon="
                    favorites_store.isFavorite(item.id) ? heart : heartOutline
                  "
                  :color="favorites_store.isFavorite(item.id) ? 'danger' : ''"
                  @click.stop="toggleFavorite(item)"
                ></ion-icon>
              </div>
            </div>
          </template>
        </VirtualList>

        <div v-else class="flex col grow center" style="gap: 10px">
          <img
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
</style>
