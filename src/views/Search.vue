<script setup lang="ts">
import { Keyboard } from "@capacitor/keyboard";
import {
  IonContent,
  IonIcon,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonThumbnail,
  type SearchbarCustomEvent,
} from "@ionic/vue";
import { heart, heartOutline } from "ionicons/icons";
import { computed, onMounted, ref, watch } from "vue";
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
import { useVirtualizer } from "@tanstack/vue-virtual";

const { t } = useI18n();

const layout = useLayout();
const player_store = usePlayerStore();
const audio_service = useAudioService();
const favorites_store = useFavoritesStore();
const youtube_client = useYoutubeClient();

const contentRef = ref<InstanceType<typeof IonContent> | null>(null);
const scrollElement = ref<HTMLElement | null>(null);

const loading = ref<boolean>(false);
const fetching_next_page = ref<boolean>(false);
const fetching_audio = ref<boolean>(false);

const search_items = ref<SearchResult[]>([]);
let query: string | null | undefined = null;
let next_token: string | null = null;

const audio_id_to_play = ref<string | null>(null);

const rowVirtualizerOptions = computed(() => {
  return {
    count: next_token
      ? search_items.value.length + 1
      : search_items.value.length,
    getScrollElement: () => scrollElement.value,
    estimateSize: () => 65,
    overscan: 5,
  };
});

const rowVirtualizer = useVirtualizer(rowVirtualizerOptions);

const search = async (e: SearchbarCustomEvent) => {
  Keyboard.hide();
  search_items.value = [];
  next_token = null;
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

const searchContinuation = async () => {
  if (fetching_next_page.value || !next_token) return;

  try {
    fetching_next_page.value = true;
    const new_results = await youtube_client.search(query ?? "", next_token);
    search_items.value.push(...new_results.items);
    next_token = new_results.next_token;
  } catch {
    showToast(t("search.error"));
  } finally {
    fetching_next_page.value = false;
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

watch(
  () => rowVirtualizer.value.getVirtualItems(),
  (items) => {
    if (!items.length) return;

    const lastItem = items[items.length - 1];
    if (
      lastItem.index >= search_items.value.length - 1 &&
      next_token &&
      !fetching_next_page.value
    ) {
      searchContinuation();
    }
  },
);

onMounted(async () => {
  if (contentRef.value) {
    scrollElement.value = await contentRef.value.$el.getScrollElement();
  }
});
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content ref="contentRef" class="ion-padding">
      <ion-searchbar
        :placeholder="t('search.placeholder')"
        @ion-change="search"
        @ion-clear="search_items = []"
      />

      <!-- Virtual list -->
      <div
        style="margin-top: 10px; padding: 0px 5px"
        v-if="scrollElement && search_items.length"
      >
        <div
          style="width: 100%; position: relative"
          :style="{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }"
        >
          <div
            v-for="virtualRow in rowVirtualizer.getVirtualItems()"
            :key="virtualRow.index"
            style="position: absolute; top: 0; left: 0; width: 100%"
            :style="{
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }"
          >
            <div
              v-if="virtualRow.index < search_items.length"
              class="audio-item"
              @click="play(search_items[virtualRow.index])"
            >
              <div class="audio-thumbnail">
                <Transition name="fade" mode="out-in">
                  <ion-spinner
                    v-if="
                      audio_id_to_play === search_items[virtualRow.index].id &&
                      fetching_audio === true
                    "
                    style="width: 45px; height: 45px"
                    name="dots"
                  ></ion-spinner>
                  <ion-thumbnail v-else>
                    <img :src="search_items[virtualRow.index].thumbnail" />
                  </ion-thumbnail>
                </Transition>
              </div>
              <div class="audio-info">
                <div ref="titles" class="audio-title">
                  {{ search_items[virtualRow.index].title }}
                </div>
                <div class="audio-artist">
                  {{ search_items[virtualRow.index].author }}
                </div>
              </div>
              <div class="audio-duration">
                {{ search_items[virtualRow.index].duration }}
              </div>
              <div class="audio-actions">
                <ion-icon
                  :icon="
                    favorites_store.isFavorite(
                      search_items[virtualRow.index].id,
                    )
                      ? heart
                      : heartOutline
                  "
                  :color="
                    favorites_store.isFavorite(
                      search_items[virtualRow.index].id,
                    )
                      ? 'danger'
                      : ''
                  "
                  @click.stop="
                    toggleFavorite(search_items[virtualRow.index].id)
                  "
                ></ion-icon>
              </div>
            </div>
            <div v-else class="infinite-loading-row">
              <ion-spinner name="dots"></ion-spinner>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="search-something">
        <ion-spinner
          v-if="loading"
          name="dots"
          style="width: 50px; height: 50px"
        ></ion-spinner>
        <div v-else class="no-results">
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

.audio-item {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
}

.infinite-loading-row {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 50px;
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
