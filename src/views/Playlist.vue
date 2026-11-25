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
  onIonViewDidLeave,
  onIonViewWillEnter,
  type SearchbarCustomEvent,
} from "@ionic/vue";
import {
  downloadOutline as download_icon,
  ellipsisVertical,
  heart,
  play as play_icon,
  search as search_icon,
  shuffle as shuffle_icon,
  trashOutline,
} from "ionicons/icons";
import { computed, ref, watch } from "vue";
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
import useAudioService from "@/services/AudioService";
import { Capacitor } from "@capacitor/core";
import VirtualList from "@/components/ui/VirtualList.vue";
import useNetworkStore from "@/stores/NetworkStore";
import { showToast } from "@/utils";
import { DeepReadonlyObject, RxChangeEvent } from "rxdb";
import { Subscription } from "rxjs";
import { PlaylistAudio } from "@/types";

const router = useRouter();
const { t } = useI18n();

const layout = useLayout();

const player_store = usePlayerStore();
const favorites_store = useFavoritesStore();
const download_store = useDownloadStore();
const network_store = useNetworkStore();

const audio_service = useAudioService();
const spotify_service = useSpotifyService();

let audio_subscription: Subscription | null = null;
const favorite_audios = ref<DeepReadonlyObject<RxAudio>[]>([]);
const to_remove = ref<RxAudio | null>(null);
const query = ref<string>("");
const loading = ref(false);
const shuffle = ref(false);
const show_only_downloaded = ref(false);
const show_download_all_alert = ref(false);
const show_remove_alert = ref(false);

const search_results = computed(() => {
  let results = favorite_audios.value;

  if (show_only_downloaded.value) {
    results = results.filter((audio: RxAudio) => {
      return audio.src.startsWith("file");
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
  if (!network_store.is_online && !audio[0].src.startsWith("file")) {
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
      return audio.src.startsWith("file");
    });

    if (offline_results.length === 0)
      showToast(t("network.offline"), "warning");
    else player_store.play([...offline_results], shuffle.value);
  }
};

const showRemoveFromFavoritesAlert = (audio_id: string) => {
  const audio = favorite_audios.value.find(
    (audio: RxAudio) => audio.id === audio_id,
  );

  if (audio) {
    show_remove_alert.value = true;
    to_remove.value = { ...audio };
  }
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
        .filter((a: RxAudio) => !a.src.startsWith("file"))
        .map((a: RxAudio) => a.id),
    );
};

const download = (audio_id: string) => {
  if (network_store.is_online) download_store.addToQueue(audio_id);
  else showToast(t("network.offline"), "warning");
};

const deleteFile = async (audio_id: string) => {
  const audio = await audio_service.get(audio_id);
  if (!audio) return;
  audio.deleteFile();
};

onIonViewWillEnter(() => {
  loading.value = true;
  audio_service
    .getSortedListAsJson(favorites_store.favorite_audios)
    .then((audios) => {
      favorite_audios.value = audios;
      loading.value = false;
    });

  if (audio_subscription == null) {
    audio_subscription = audio_service.subscribe(
      (audio: RxChangeEvent<RxAudio>) => {
        const index = favorite_audios.value.findIndex(
          (a: RxAudio) => a.id == audio.documentId,
        );
        if (index == -1) return;
        favorite_audios.value[index] = audio.documentData;
      },
    );
  }
});

onIonViewDidLeave(() => {
  audio_subscription?.unsubscribe();
});

watch(
  () => favorites_store.favorite_audios,
  async (new_audios: PlaylistAudio[]) => {
    console.log("favorite_audios changed", new_audios);
    favorite_audios.value = await audio_service.getSortedListAsJson(new_audios);
  },
);
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content class="ion-padding">
      <div class="flex col h-full" :class="loading ? 'center' : ''">
        <ion-spinner
          v-if="loading"
          style="width: 30px; height: 30px"
          name="dots"
        />

        <div v-else-if="favorite_audios.length" class="flex col grow h-full">
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

            <ion-button id="open-actions-popover" fill="clear" shape="round">
              <ion-icon
                slot="icon-only"
                color="dark"
                :icon="ellipsisVertical"
              ></ion-icon>
            </ion-button>

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
                  <div>{{ t("spotify.import") }}...</div>
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
          <VirtualList
            v-if="search_results.length"
            :items="search_results"
            :estimate-size="70"
          >
            <template #item="{ item }">
              <div
                class="flex col grow"
                style="min-width: 0; gap: 2.5px"
                @click="play([item])"
              >
                <div class="flex center-y between">
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

                  <div class="flex center-y">
                    <Transition :key="item.id" name="fade" mode="out-in">
                      <ion-spinner
                        v-if="
                          download_store.status.queue.includes(item.id) ||
                          download_store.status.current === item.id
                        "
                        name="dots"
                      ></ion-spinner>
                      <ion-button
                        v-else
                        shape="round"
                        fill="clear"
                        @click.stop="
                          item.src.startsWith('file')
                            ? deleteFile(item.id)
                            : download(item.id)
                        "
                      >
                        <ion-icon
                          slot="icon-only"
                          color="dark"
                          :icon="
                            item.src.startsWith('file')
                              ? trashOutline
                              : download_icon
                          "
                        ></ion-icon>
                      </ion-button>
                    </Transition>

                    <ion-button
                      shape="round"
                      fill="clear"
                      @click.stop="showRemoveFromFavoritesAlert(item.id)"
                    >
                      <ion-icon
                        slot="icon-only"
                        :icon="heart"
                        color="danger"
                      ></ion-icon>
                    </ion-button>
                  </div>
                </div>

                <div
                  v-if="download_store.status.current === item.id"
                  style="padding-bottom: 2.5px"
                >
                  <ion-progress-bar :value="download_store.status.progress" />
                </div>
              </div>
            </template>
          </VirtualList>
          <!-- No results -->
          <div v-else class="flex col grow center h-full" style="gap: 5px">
            <img :src="no_search_results" />
            <div>{{ t("generic.no_results") }}</div>
          </div>
        </div>

        <!-- No favorites -->
        <div v-else class="flex col grow center h-full" style="gap: 10px">
          <img
            :src="layout.state.isDarkTheme ? iconLight : iconDark"
            style="width: 100px"
          />
          <div>{{ t("favorites.start") }}</div>
          <div class="flex center-y">
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
                t("spotify.import")
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
              show_remove_alert = false;
            },
          },
          {
            text: t('generic.yes'),
            role: 'confirm',
            handler: () => {
              favorites_store.remove(to_remove!.id);
              show_remove_alert = false;
            },
          },
        ]"
        @did-dismiss="to_remove = null"
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
