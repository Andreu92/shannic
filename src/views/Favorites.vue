<script setup lang="ts">
import { Keyboard } from "@capacitor/keyboard";
import { Icon } from "@iconify/vue";
import {
  IonAlert,
  IonButton,
  IonChip,
  IonContent,
  IonIcon,
  IonLabel,
  IonPage,
  IonPopover,
  IonProgressBar,
  IonSearchbar,
  IonSpinner,
  IonThumbnail,
  IonFab,
  IonFabButton,
  type SearchbarCustomEvent,
  onIonViewDidEnter,
  onIonViewDidLeave,
} from "@ionic/vue";
import {
  arrowDown,
  arrowUp,
  cloudDownloadOutline,
  ellipsisVertical,
  heart,
  heartOutline,
  play as play_icon,
  search as search_icon,
  shuffle as shuffle_icon,
  trashOutline,
} from "ionicons/icons";
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useVirtualizer } from "@tanstack/vue-virtual";
import iconDark from "@/assets/img/icon-dark.png";
import iconLight from "@/assets/img/icon-light.png";
import no_search_results from "@/assets/img/no-search-results.svg";
import AppHeader from "@/components/layout/AppHeader.vue";
import ToggleButton from "@/components/ui/ToggleButton.vue";
import { useLayout } from "@/composables/useLayout";
import type { RxAudio } from "@/schemas/audio";
import useSpotifyService from "@/services/SpotifyService";
import { useDownloadStore } from "@/stores/DownloadStore";
import useFavoritesStore from "@/stores/FavoritesStore";
import usePlayerStore from "@/stores/PlayerStore";
import { Directory, Filesystem } from "@capacitor/filesystem";
import useAudioService from "@/services/AudioService";
import useYoutubeClient from "@/clients/YoutubeClient";

const contentRef = ref<InstanceType<typeof IonContent> | null>(null);
const scrollElement = ref<HTMLElement | null>(null);

const router = useRouter();
const { t } = useI18n();

const layout = useLayout();
const player_store = usePlayerStore();
const favorites_store = useFavoritesStore();
const download_store = useDownloadStore();
const youtube_client = useYoutubeClient();

const audio_service = useAudioService();
const spotify_service = useSpotifyService();

const show_download_all_alert = ref(false);
const show_remove_alert = ref(false);

const to_remove = ref<RxAudio | null>(null);
const query = ref<string>("");
const shuffle = ref(false);

const show_up = ref(false);
const show_down = ref(false);

const search_results = computed(() => {
  const searchTerm = query.value.trim().toLowerCase();
  if (searchTerm !== "") {
    return favorites_store.audios.filter(
      (audio: RxAudio) =>
        audio.title.toLowerCase().includes(searchTerm) ||
        audio.author.toLowerCase().includes(searchTerm),
    );
  }
  return favorites_store.audios;
});

const rowVirtualizerOptions = computed(() => {
  return {
    count: search_results.value.length,
    getScrollElement: () => scrollElement.value,
    estimateSize: () => 65,
    overscan: 5,
  };
});

const rowVirtualizer = useVirtualizer(rowVirtualizerOptions);

const search = (e: SearchbarCustomEvent) => {
  Keyboard.hide();
  query.value = e.detail.value || "";
};

const clearIfEmpty = (e: SearchbarCustomEvent) => {
  if (!e.detail.value) query.value = "";
};

const showRemoveFromFavoritesAlert = (audio_id: string) => {
  const audio = favorites_store.audios.find(
    (audio: RxAudio) => audio.id === audio_id,
  );
  if (audio) {
    show_remove_alert.value = true;
    to_remove.value = { ...audio };
  }
};

const removeFromFavorites = async () => {
  if (!to_remove.value) return;

  favorites_store.deleteFavorite(to_remove.value.id);
  if (player_store.isInPlaylist(to_remove.value.id)) {
    const index = player_store.getIndexById(to_remove.value.id);
    player_store.toggleFavorite(false, index);
  }

  to_remove.value = null;
};

const downloadAll = () => {
  download_store.downloadMultiple(
    search_results.value.map((audio: RxAudio) => audio.id),
  );
};

const download = (audio_id: string) => {
  download_store.addToQueue(audio_id);
};

const deleteLocalAudio = async (audio_id: string) => {
  const audio = await audio_service.getAudio(audio_id);
  if (!audio) return;

  Filesystem.deleteFile({
    directory: Directory.Data,
    path: audio_id,
  }).then(async () => {
    const new_audio = await youtube_client.get(audio_id);
    audio.incrementalPatch({
      url: new_audio.url,
      expires_at: new_audio.expires_at,
      updated_at: Date.now(),
    });
  });
};

const handleScroll = () => {
  if (!scrollElement.value) return;

  const { scrollTop, scrollHeight, clientHeight } = scrollElement.value;
  show_up.value = scrollTop > 100;
  show_down.value =
    scrollHeight > clientHeight &&
    scrollTop < scrollHeight - clientHeight - 100;
};

const scrollToTop = () => {
  scrollElement.value?.scrollTo({ top: 0, behavior: "smooth" });
};

const scrollToBottom = () => {
  scrollElement.value?.scrollTo({
    top: scrollElement.value.scrollHeight,
    behavior: "smooth",
  });
};

onIonViewDidEnter(async () => {
  if (contentRef.value) {
    scrollElement.value = await contentRef.value.$el.getScrollElement();
    scrollElement.value?.addEventListener("scroll", handleScroll);
  }
  setTimeout(handleScroll, 100);
});

onIonViewDidLeave(() => {
  scrollElement.value?.removeEventListener("scroll", handleScroll);
});

watch(
  () => search_results.value,
  () => {
    setTimeout(handleScroll, 100);
  },
  { deep: true },
);
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content ref="contentRef" class="ion-padding">
      <div v-if="favorites_store.audios.length">
        <!-- Search bar -->
        <div class="search-container">
          <ion-searchbar
            :placeholder="t('favorites.placeholder')"
            @ion-change="search"
            @ion-input="clearIfEmpty"
            @ion-clear="query = ''"
            :debounce="300"
          />
          <ion-icon
            id="open-actions-popover"
            color="dark"
            :icon="ellipsisVertical"
            style="font-size: 1.4rem"
          ></ion-icon>
          <ion-popover
            trigger="open-actions-popover"
            dismiss-on-select
            trigger-action="click"
          >
            <ion-content class="ion-padding">
              <div
                class="import-actions"
                @click="spotify_service.importSavedTracks"
              >
                <div
                  class="spotify-icon-background"
                  style="width: 20px; height: 20px"
                >
                  <Icon icon="logos:spotify-icon"></Icon>
                </div>
                <div>{{ t("favorites.spotify") }}...</div>
              </div>
            </ion-content>
          </ion-popover>
        </div>

        <!-- General playlist actions -->
        <div class="flex-between" v-if="search_results.length">
          <ion-button
            fill="clear"
            shape="round"
            @click="
              player_store.play(
                search_results.map((a) => ({ ...a })),
                shuffle,
              )
            "
          >
            <ion-icon
              slot="icon-only"
              color="dark"
              :icon="play_icon"
            ></ion-icon>
          </ion-button>
          <toggle-button
            :enabled="shuffle"
            :icon="shuffle_icon"
            @click="shuffle = !shuffle"
          />
          <ion-button
            @click="show_download_all_alert = true"
            fill="clear"
            shape="round"
          >
            <ion-icon
              slot="icon-only"
              color="dark"
              :icon="cloudDownloadOutline"
            ></ion-icon>
          </ion-button>
        </div>

        <!-- Virtual list -->
        <div style="padding: 0px 5px">
          <div
            v-if="scrollElement && search_results.length"
            style="width: 100%; position: relative"
            :style="{
              height: `${rowVirtualizer.getTotalSize()}px`,
            }"
          >
            <div
              v-for="virtualRow in rowVirtualizer.getVirtualItems()"
              :key="virtualRow.index"
              @click="
                player_store.play([{ ...search_results[virtualRow.index] }])
              "
              style="position: absolute; top: 0; left: 0; width: 100%"
              :style="{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }"
            >
              <div class="flex-column grow">
                <div class="flex-between">
                  <div class="audio-thumbnail">
                    <ion-thumbnail>
                      <img :src="search_results[virtualRow.index].thumbnail" />
                    </ion-thumbnail>
                  </div>
                  <div class="audio-info">
                    <div class="audio-title">
                      {{ search_results[virtualRow.index].title }}
                    </div>
                    <div class="audio-artist">
                      {{ search_results[virtualRow.index].author }}
                    </div>
                  </div>
                  <div class="audio-actions">
                    <Transition name="fade" mode="out-in">
                      <ion-spinner
                        v-if="
                          download_store.status.queue.includes(
                            search_results[virtualRow.index].id,
                          ) ||
                          download_store.status.current ===
                            search_results[virtualRow.index].id
                        "
                        name="dots"
                      ></ion-spinner>
                      <ion-icon
                        v-else-if="
                          !search_results[virtualRow.index].url ||
                          search_results[virtualRow.index].url.startsWith(
                            'http',
                          )
                        "
                        :icon="cloudDownloadOutline"
                        @click.stop="
                          download(search_results[virtualRow.index].id)
                        "
                      ></ion-icon>
                      <ion-icon
                        v-else
                        :icon="trashOutline"
                        @click.stop="
                          deleteLocalAudio(search_results[virtualRow.index].id)
                        "
                      ></ion-icon>
                    </Transition>
                    <ion-icon
                      :icon="
                        favorites_store.isFavorite(
                          search_results[virtualRow.index].id,
                        )
                          ? heart
                          : heartOutline
                      "
                      :color="
                        favorites_store.isFavorite(
                          search_results[virtualRow.index].id,
                        )
                          ? 'danger'
                          : ''
                      "
                      @click.stop="
                        showRemoveFromFavoritesAlert(
                          search_results[virtualRow.index].id,
                        )
                      "
                    ></ion-icon>
                  </div>
                </div>
                <ion-progress-bar
                  style="margin-bottom: 5px"
                  v-if="
                    download_store.status.current ===
                    search_results[virtualRow.index].id
                  "
                  :value="download_store.status.progress"
                >
                </ion-progress-bar>
              </div>
            </div>
          </div>
          <!-- No results -->
          <div
            v-else
            class="flex-column center-hv"
            style="gap: 5px; margin-top: 50%"
          >
            <img :src="no_search_results" />
            <div>{{ t("favorites.no_results") }}</div>
          </div>
        </div>
      </div>

      <!-- No favorites -->
      <div
        v-show="!favorites_store.audios.length"
        class="flex-column center-hv"
        style="height: 100%"
      >
        <img
          :src="layout.state.isDarkTheme ? iconLight : iconDark"
          style="width: 100px"
        />
        <div style="margin-top: 3px">{{ t("favorites.start") }}</div>
        <div class="start-actions">
          <ion-chip @click="() => router.replace('/search')">
            <ion-icon :icon="search_icon" style="font-size: 20px"></ion-icon>
            <ion-label>{{ t("pages.search") }}</ion-label>
          </ion-chip>
          <ion-chip @click="spotify_service.importSavedTracks">
            <div
              class="spotify-icon-background"
              style="width: 20px; height: 20px"
            >
              <Icon icon="logos:spotify-icon"></Icon>
            </div>
            <ion-label style="margin-left: 5px">{{
              t("favorites.spotify")
            }}</ion-label>
          </ion-chip>
        </div>
      </div>

      <!-- Scroll to top/bottom buttons -->
      <ion-fab
        v-if="favorites_store.audios.length"
        horizontal="end"
        vertical="bottom"
        slot="fixed"
      >
        <div class="fab-button-placeholder">
          <Transition name="fade">
            <ion-fab-button v-show="show_up" size="small" @click="scrollToTop">
              <ion-icon :icon="arrowUp" color="dark"></ion-icon>
            </ion-fab-button>
          </Transition>
        </div>
        <div class="fab-button-placeholder">
          <Transition name="fade">
            <ion-fab-button
              v-show="show_down"
              size="small"
              @click="scrollToBottom"
            >
              <ion-icon :icon="arrowDown" color="dark"></ion-icon>
            </ion-fab-button>
          </Transition>
        </div>
      </ion-fab>

      <!-- Alerts -->
      <ion-alert
        :is-open="show_remove_alert"
        :header="t('favorites.delete.header')"
        :message="t('favorites.delete.message', { title: to_remove?.title })"
        :buttons="[
          {
            text: t('generic.no'),
            role: 'cancel',
            handler: () => {
              to_remove = null;
            },
          },
          {
            text: t('generic.yes'),
            role: 'confirm',
            handler: () => {
              show_remove_alert = false;
              removeFromFavorites();
            },
          },
        ]"
      ></ion-alert>

      <ion-alert
        :is-open="show_download_all_alert"
        :header="t('favorites.download.header')"
        :message="t('favorites.download.message')"
        :buttons="[
          {
            text: t('generic.no'),
            role: 'cancel',
            handler: () => {
              show_download_all_alert = false;
            },
          },
          {
            text: t('generic.yes'),
            role: 'confirm',
            handler: () => {
              show_download_all_alert = false;
              downloadAll();
            },
          },
        ]"
      ></ion-alert>
    </ion-content>
  </ion-page>
</template>

<style lang="scss" scoped>
ion-thumbnail {
  --size: 45px;
  --border-radius: 10px;
}

.import-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.center-hv {
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.grow {
  flex: 1;
}

.start-actions {
  display: flex;
  align-items: center;
  margin-top: 15px;
}

.search-container {
  display: flex;
  align-items: center;
}

.fab-button-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
}
</style>
