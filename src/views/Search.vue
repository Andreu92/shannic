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
  IonSpinner,
  IonThumbnail,
  type SearchbarCustomEvent,
  type SegmentCustomEvent,
} from "@ionic/vue";
import { heart, heartOutline, mic, musicalNotes } from "ionicons/icons";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import iconDark from "@/assets/img/icon-dark.png";
import iconLight from "@/assets/img/icon-light.png";
import { type YoutubeSearch, youtube_plugin } from "@/plugins/YoutubePlugin";
import AppHeader from "@/components/layout/AppHeader.vue";
import { useLayout } from "@/composables/useLayout";
import type { RxAudio } from "@/schemas/audio";
import useAudioService from "@/services/AudioService";
import useFavoritesStore from "@/stores/FavoritesStore";
import useNetworkStore from "@/stores/NetworkStore";
import usePlayerStore from "@/stores/PlayerStore";
import type { SearchResult } from "@/types";
import { formatDuration, showToast } from "@/utils";
import VirtualList from "@/components/ui/VirtualList.vue";
import { CapacitorException } from "@capacitor/core";

const { t } = useI18n();

const layout = useLayout();
const player_store = usePlayerStore();
const audio_service = useAudioService();
const favorites_store = useFavoritesStore();
const network_store = useNetworkStore();

const search_query = ref<string | null | undefined>(null);
const search_music = ref<boolean>(false);
const loading = ref<boolean>(false);
const fetching_next_page = ref<boolean>(false);
const fetching_audio = ref<boolean>(false);

const search_results = ref<SearchResult[]>([]);
const has_next_page = ref<boolean>(false);
const audio_id_to_play = ref<string | null>(null);

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

const play = async (audio: SearchResult) => {
  audio_id_to_play.value = audio.id;
  fetching_audio.value = true;

  const audio_to_play: RxAudio = (
    await audio_service.getCreateOrUpdateAudio(audio.id)
  ).toMutableJSON();

  player_store.play([audio_to_play]);
  fetching_audio.value = false;
};

const toggleFavorite = async (audio_id: string) => {
  if (!favorites_store.isFavorite(audio_id) && !network_store.is_online) {
    showToast(t("network.offline"), "warning");
    return;
  }

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
    <ion-content class="ion-padding">
      <div class="flex col h-full">
        <ion-searchbar
          :placeholder="t('search.placeholder')"
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
                <Transition name="fade" mode="out-in">
                  <ion-spinner
                    v-if="
                      audio_id_to_play === item.id && fetching_audio === true
                    "
                    style="width: 45px; height: 45px"
                    name="dots"
                  ></ion-spinner>
                  <ion-thumbnail v-else>
                    <img
                      :src="item.thumbnail"
                      loading="lazy"
                      @error="
                        (e) => {
                          const img = e.target as HTMLImageElement;
                          if (img.src !== iconLight) img.src = iconLight;
                        }
                      "
                    />
                  </ion-thumbnail>
                </Transition>
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
                  @click.stop="toggleFavorite(item.id)"
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
