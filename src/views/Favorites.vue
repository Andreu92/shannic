<script setup lang="ts">
import { Keyboard } from "@capacitor/keyboard";
import SpotifyIcon from "@iconify-vue/logos/spotify-icon";
import SyncSavedLocallyRoundedIcon from "@iconify-vue/material-symbols/sync-saved-locally-rounded";
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
  type SearchbarCustomEvent,
} from "@ionic/vue";
import {
  downloadOutline as download_icon,
  ellipsisVertical,
  heart,
  heartOutline,
  play as play_icon,
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
import { Directory, Filesystem } from "@capacitor/filesystem";
import useAudioService from "@/services/AudioService";
import { youtube_plugin } from "@/plugins/YoutubePlugin";
import { Capacitor } from "@capacitor/core";
import VirtualList from "@/components/ui/VirtualList.vue";
import useNetworkStore from "@/stores/NetworkStore";
import { showToast } from "@/utils";

const router = useRouter();
const { t } = useI18n();

const layout = useLayout();
const player_store = usePlayerStore();
const favorites_store = useFavoritesStore();
const download_store = useDownloadStore();
const network_store = useNetworkStore();

const audio_service = useAudioService();
const spotify_service = useSpotifyService();

const show_download_all_alert = ref(false);
const show_remove_alert = ref(false);

const to_remove = ref<RxAudio | null>(null);
const query = ref<string>("");
const shuffle = ref(false);
const show_only_downloaded = ref(false);

const search_results = computed(() => {
  let results = favorites_store.audios;

  if (show_only_downloaded.value) {
    results = results.filter((audio: RxAudio) => {
      return audio.src?.startsWith("file://");
    });
  }

  const searchTerm = query.value.trim().toLowerCase();
  if (searchTerm.length) {
    results = results.filter(
      (audio: RxAudio) =>
        audio.title.toLowerCase().includes(searchTerm) ||
        audio.author.toLowerCase().includes(searchTerm),
    );
  }

  return results;
});

const search = (e: SearchbarCustomEvent) => {
  Keyboard.hide();
  query.value = e.detail.value || "";
};

const clearIfEmpty = (e: SearchbarCustomEvent) => {
  if (!e.detail.value) query.value = "";
};

const play = (audio: RxAudio[]) => {
  if (
    (!audio[0].src || audio[0].src.startsWith("http")) &&
    !network_store.is_online
  ) {
    showToast(t("network.offline"), "warning");
    return;
  }

  player_store.play(audio);
};

const playAll = async () => {
  if (search_results.value.length === 0) return;

  if (network_store.is_online) {
    player_store.play([...search_results.value], shuffle.value);
  } else {
    const offline_results = search_results.value.filter((audio: RxAudio) => {
      return audio.src?.startsWith("file://");
    });

    if (offline_results.length === 0)
      showToast(t("network.offline"), "warning");
    else player_store.play([...offline_results], shuffle.value);
  }
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

  if (player_store.audio?.id === to_remove.value.id)
    player_store.toggleFavorite(false);

  to_remove.value = null;
};

const showDownloadAllAlert = () => {
  if (show_only_downloaded.value) {
    showToast(t("playlist.alreadyDownloaded"), "warning");
    return;
  }

  if (network_store.is_online) show_download_all_alert.value = true;
  else showToast(t("network.offline"), "warning");
};

const downloadAll = () => {
  if (network_store.is_online)
    download_store.downloadMultiple(
      search_results.value
        .filter((a: RxAudio) => !a.src || a.src.startsWith("http"))
        .map((a: RxAudio) => a.id),
    );
};

const download = (audio_id: string) => {
  if (network_store.is_online) download_store.addToQueue(audio_id);
  else showToast(t("network.offline"), "warning");
};

const deleteLocalAudio = async (audio_id: string) => {
  const audio = await audio_service.getCreateOrUpdateAudio(audio_id);
  if (!audio) return;

  Filesystem.deleteFile({
    directory: Directory.Data,
    path: audio_id,
  }).then(async () => {
    if (network_store.is_online) {
      const new_audio = await youtube_plugin.get({ id: audio_id });
      audio.incrementalPatch({
        src: new_audio.src,
        expires_at: new_audio.expires_at,
        updated_at: Date.now(),
      });
    } else {
      audio.incrementalPatch({
        src: undefined,
        expires_at: 0,
        updated_at: Date.now(),
      });
    }
  });
};
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content class="ion-padding">
      <div class="flex col h-full">
        <div v-if="favorites_store.audios.length" class="flex col grow h-full">
          <!-- Search bar -->
          <div class="flex center-y">
            <ion-searchbar
              :placeholder="`${t('pages.search')}... :)`"
              :debounce="300"
              @ion-change="search"
              @ion-input="clearIfEmpty"
              @ion-clear="query = ''"
            />

            <toggle-button
              :enabled="show_only_downloaded"
              :icon="SyncSavedLocallyRoundedIcon"
              @click="show_only_downloaded = !show_only_downloaded"
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
                  class="flex center-y"
                  style="gap: 10px"
                  @click="spotify_service.importSavedTracks"
                >
                  <div
                    class="spotify-icon-background"
                    style="width: 20px; height: 20px"
                  >
                    <SpotifyIcon />
                  </div>
                  <div>{{ t("favorites.spotify") }}...</div>
                </div>
              </ion-content>
            </ion-popover>
          </div>

          <!-- General playlist actions -->
          <div v-if="search_results.length" class="flex between">
            <ion-button fill="clear" shape="round" @click="playAll">
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
              fill="clear"
              shape="round"
              @click="showDownloadAllAlert"
            >
              <ion-icon
                slot="icon-only"
                color="dark"
                :icon="download_icon"
              ></ion-icon>
            </ion-button>
          </div>

          <!-- Virtual list -->
          <VirtualList v-if="search_results.length" :items="search_results">
            <template #item="{ item }">
              <div
                class="flex col grow"
                style="min-width: 0"
                @click="play([{ ...item }])"
              >
                <div class="flex between">
                  <div class="audio-thumbnail">
                    <ion-thumbnail>
                      <img
                        :src="
                          item.thumbnail.startsWith('http')
                            ? item.thumbnail
                            : Capacitor.convertFileSrc(item.thumbnail)
                        "
                      />
                    </ion-thumbnail>
                  </div>

                  <div class="audio-info">
                    <div class="audio-title">
                      {{ item.title }}
                    </div>
                    <div class="audio-artist">
                      {{ item.author }}
                    </div>
                  </div>

                  <div class="audio-actions">
                    <Transition :key="item.id" name="fade" mode="out-in">
                      <ion-spinner
                        v-if="
                          download_store.status.queue.includes(item.id) ||
                          download_store.status.current === item.id
                        "
                        name="dots"
                      ></ion-spinner>
                      <ion-icon
                        v-else-if="!item.src || item.src.startsWith('http')"
                        :icon="download_icon"
                        @click.stop="download(item.id)"
                      ></ion-icon>
                      <ion-icon
                        v-else
                        :icon="trashOutline"
                        @click.stop="deleteLocalAudio(item.id)"
                      ></ion-icon>
                    </Transition>

                    <ion-icon
                      :icon="
                        favorites_store.isFavorite(item.id)
                          ? heart
                          : heartOutline
                      "
                      :color="
                        favorites_store.isFavorite(item.id) ? 'danger' : ''
                      "
                      @click.stop="showRemoveFromFavoritesAlert(item.id)"
                    ></ion-icon>
                  </div>
                </div>

                <ion-progress-bar
                  v-if="download_store.status.current === item.id"
                  style="margin-bottom: 5px"
                  :value="download_store.status.progress"
                >
                </ion-progress-bar>
              </div>
            </template>
          </VirtualList>
          <!-- No results -->
          <div v-else class="flex col grow center h-full" style="gap: 5px">
            <img :src="no_search_results" />
            <div>{{ t("favorites.no_results") }}</div>
          </div>
        </div>

        <!-- No favorites -->
        <div v-else class="flex col grow center h-full">
          <img
            :src="layout.state.isDarkTheme ? iconLight : iconDark"
            style="width: 100px"
          />
          <div style="margin-top: 3px">{{ t("favorites.start") }}</div>
          <div class="flex center-y" style="margin-top: 15px">
            <ion-chip @click="() => router.replace('/search')">
              <ion-icon :icon="search_icon" style="font-size: 20px"></ion-icon>
              <ion-label>{{ t("pages.search") }}</ion-label>
            </ion-chip>
            <ion-chip @click="spotify_service.importSavedTracks">
              <div
                class="spotify-icon-background"
                style="width: 20px; height: 20px"
              >
                <SpotifyIcon />
              </div>
              <ion-label style="margin-left: 5px">{{
                t("favorites.spotify")
              }}</ion-label>
            </ion-chip>
          </div>
        </div>
      </div>

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
</style>
