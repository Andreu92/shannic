<script setup lang="ts">
import { Keyboard } from "@capacitor/keyboard";
import { Icon } from "@iconify/vue";
import {
  IonAlert,
  IonButton,
  IonChip,
  IonContent,
  IonIcon,
  IonImg,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonPopover,
  IonProgressBar,
  IonReorder,
  IonReorderGroup,
  IonSearchbar,
  IonSpinner,
  IonThumbnail,
  onIonViewWillEnter,
  type ReorderEndCustomEvent,
  type SearchbarCustomEvent,
} from "@ionic/vue";
import {
  cloudDownloadOutline,
  ellipsisVertical,
  heart,
  heartOutline,
  play as play_icon,
  reorderTwoOutline,
  search as search_icon,
  shuffle as shuffle_icon,
  trashOutline,
} from "ionicons/icons";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
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

const router = useRouter();
const { t } = useI18n();

const layout = useLayout();
const player_store = usePlayerStore();
const favorites_store = useFavoritesStore();
const download_store = useDownloadStore();

const spotify_service = useSpotifyService();

const show_download_all_alert = ref(false);
const to_delete = ref<RxAudio | null>(null);
const query = ref<string>("");
const reorder_mode = ref(false);
const shuffle = ref(false);

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

const search = (e: SearchbarCustomEvent) => {
  Keyboard.hide();
  query.value = e.detail.value || "";
};

const clearIfEmpty = (e: SearchbarCustomEvent) => {
  if (!e.detail.value) query.value = "";
};

const showRemoveFromFavoritesAlert = (audio_id: string) => {
  to_delete.value =
    favorites_store.audios.find((audio: RxAudio) => audio.id === audio_id) ??
    null;
};

const removeFromFavorites = () => {
  if (!to_delete.value) return;

  favorites_store.deleteFavorite(to_delete.value.id);
  if (player_store.isInPlaylist(to_delete.value.id)) {
    const index = player_store.getIndexById(to_delete.value.id);
    player_store.toggleFavorite(false, index);
  }

  to_delete.value = null;
};

const downloadAll = () => {
  download_store.downloadMultiple(
    favorites_store.audios.map((audio: RxAudio) => audio.id),
  );
  show_download_all_alert.value = false;
};

const handleReorder = async (event: ReorderEndCustomEvent) => {
  const from = event.detail.from;
  const to = event.detail.to;
  await favorites_store.reorder(from, to);
  event.detail.complete();
};

onIonViewWillEnter(async () => {
  reorder_mode.value = false;
});
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content fullscreen class="ion-padding">
      <div v-if="favorites_store.audios.length" style="height: 100%">
        <div class="search-container">
          <ion-searchbar
            :placeholder="t('favorites.placeholder')"
            @ion-change="search"
            @ion-input="clearIfEmpty"
            @ion-clear="query = ''"
          />
          <ion-icon
            id="open-actions-popover"
            color="dark"
            :icon="ellipsisVertical"
            style="font-size: 1.4rem"
          ></ion-icon>
        </div>
        <div class="flex-between" v-if="query.trim() === ''">
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
          <toggle-button
            :enabled="reorder_mode"
            :icon="reorderTwoOutline"
            @click="reorder_mode = !reorder_mode"
          />
        </div>
        <ion-list v-if="search_results.length" lines="none">
          <ion-reorder-group
            :disabled="!reorder_mode || query.trim() !== ''"
            @ionReorderEnd="handleReorder"
          >
            <ion-reorder v-for="result of search_results" :key="result.id">
              <ion-item @click="player_store.play([{ ...result }])">
                <div class="flex-column">
                  <div class="flex-between">
                    <div class="audio-thumbnail">
                      <ion-thumbnail>
                        <ion-img :src="result.thumbnail" />
                      </ion-thumbnail>
                    </div>
                    <div class="audio-info">
                      <div ref="titles" class="audio-title">
                        {{ result.title }}
                      </div>
                      <div class="audio-artist">{{ result.author }}</div>
                    </div>
                    <div class="audio-actions">
                      <Transition name="fade" mode="out-in">
                        <ion-spinner
                          v-if="
                            download_store.status.queue.includes(result.id) ||
                            download_store.status.current === result.id
                          "
                          name="dots"
                        ></ion-spinner>
                        <ion-icon
                          v-else
                          :icon="cloudDownloadOutline"
                          @click.stop="download_store.addToQueue(result.id)"
                        ></ion-icon>
                      </Transition>
                      <ion-icon
                        :icon="
                          favorites_store.isFavorite(result.id)
                            ? heart
                            : heartOutline
                        "
                        :color="
                          favorites_store.isFavorite(result.id) ? 'danger' : ''
                        "
                        @click.stop="showRemoveFromFavoritesAlert(result.id)"
                      ></ion-icon>
                    </div>
                  </div>
                  <ion-progress-bar
                    style="margin-bottom: 5px"
                    v-if="download_store.status.current === result.id"
                    :value="download_store.status.progress"
                  >
                  </ion-progress-bar>
                </div>
              </ion-item>
            </ion-reorder>
          </ion-reorder-group>
        </ion-list>
        <div v-else class="no-results">
          <img :src="no_search_results" />
          <div>{{ t("favorites.no_results") }}</div>
        </div>

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
      <div v-else class="no-favs">
        <ion-img
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

      <!-- Alerts -->
      <ion-alert
        :is-open="to_delete != null"
        :header="t('favorites.delete.header')"
        :message="t('favorites.delete.message', { title: to_delete?.title })"
        :buttons="[
          {
            text: t('generic.no'),
            role: 'cancel',
            handler: () => {
              to_delete = null;
            },
          },
          {
            text: t('generic.yes'),
            role: 'confirm',
            handler: () => {
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

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.no-favs,
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.no-favs {
  height: 100%;
}

.no-results {
  gap: 5px;
  height: calc(100% - 60px);
}

.start-actions {
  display: flex;
  align-items: center;
  margin-top: 15px;
}

.reorder-header {
  display: flex;
  justify-content: flex-end;
  padding: 8px;
}

.search-container {
  display: flex;
  align-items: center;
}
</style>
