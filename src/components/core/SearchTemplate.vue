<script setup lang="ts">
import { Keyboard } from "@/platform";
import {
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  IonThumbnail,
  type SearchbarCustomEvent,
  type SegmentCustomEvent,
} from "@ionic/vue";
import { mic, musicalNotes } from "ionicons/icons";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import iconDark from "@/assets/img/icon-dark.png";
import iconLight from "@/assets/img/icon-light.png";
import {
  type YoutubeSearch,
  YoutubeSearchItem,
  youtube_plugin,
} from "@/platform/youtube";
import { useLayout } from "@/composables/useLayout";
import useAudioService from "@/services/AudioService";
import useNetworkStore from "@/stores/NetworkStore";
import usePlayerStore from "@/stores/PlayerStore";
import { formatDuration, onImgError, showToast } from "@/utils";
import VirtualList from "@/components/ui/VirtualList.vue";

const { t } = useI18n();

const layout = useLayout();

const audio_service = useAudioService();

const player_store = usePlayerStore();
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
    if (error instanceof Error && error.message === "NO_RESULTS") {
      showToast(t("search.no_results"), "warning");
    } else {
      showToast(t("search.error"));
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

  const audio = await audio_service.create(item);

  player_store.play([audio]);
};
</script>

<template>
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
          
          <div class="flex center-y">
            <slot name="actions" v-bind="item"></slot>
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
</template>

<style lang="scss" scoped>
ion-thumbnail {
  --size: 45px;
  --border-radius: 10px;
}
</style>
