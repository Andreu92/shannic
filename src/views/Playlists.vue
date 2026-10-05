<script setup lang="ts">
import { Keyboard } from "@capacitor/keyboard";
import SpotifyIcon from "@iconify-vue/logos/spotify-icon";
import {
  IonLabel,
  IonChip,
  IonContent,
  IonIcon,
  IonPage,
  IonSearchbar,
  IonModal,
  IonButton,
  IonInput,
  type SearchbarCustomEvent,
  onIonViewWillEnter,
  onIonViewDidLeave,
} from "@ionic/vue";
import {
  add as add_icon,
  trashOutline,
  play as play_icon,
  ellipsisVertical,
} from "ionicons/icons";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useForm } from "vee-validate";
import * as v from "valibot";
import { toTypedSchema } from "@vee-validate/valibot";
import { Subscription } from "rxjs";

import iconDark from "@/assets/img/icon-dark.png";
import iconLight from "@/assets/img/icon-light.png";
import AppHeader from "@/components/layout/AppHeader.vue";
import { useLayout } from "@/composables/useLayout";
import useNetworkStore from "@/stores/NetworkStore";
import { showToast } from "@/utils";
import VirtualList from "@/components/ui/VirtualList.vue";
import { RxPlaylist } from "@/schemas/playlist";
import useSpotifyService from "@/services/SpotifyService";
import usePlaylistService from "@/services/PlaylistService";
import { DeepReadonlyObject } from "rxdb";
import { FAVORITES_PLAYLIST_ID } from "@/constants";

const { t } = useI18n();

const layout = useLayout();

const network_store = useNetworkStore();

const playlist_service = usePlaylistService();
const spotify_service = useSpotifyService();

let playlist_subscription: Subscription | null = null;
const playlists = ref<DeepReadonlyObject<RxPlaylist>[]>([]);
const search_query = ref<string | null | undefined>(null);
const showCreateModal = ref<boolean>(false);

const search_results = computed(() => {
  let results = playlists.value;

  if (search_query.value?.length) {
    results = results.filter((playlist) =>
      playlist.name.toLowerCase().includes(search_query.value!),
    );
  }

  return results;
});

const search = async (e?: SearchbarCustomEvent) => {
  Keyboard.hide();
  search_query.value = e?.detail?.value?.trim().toLowerCase();
};

const onClickImportFromSpotify = async () => {
  if (!network_store.is_online) {
    showToast(t("network.offline"), "warning");
    return;
  }
};

/* Form */
const create_playlist_schema = toTypedSchema(
  v.object({
    name: v.optional(
      v.pipe(
        v.string(),
        v.trim(),
        v.nonEmpty("required"),
        v.maxLength(255, "max 255 characters"),
      ),
      "",
    ),
  }),
);

const { errors, handleSubmit, defineField, resetForm } = useForm({
  validationSchema: create_playlist_schema,
});

const [playlist_name, playlist_name_attrs] = defineField("name");

const onClickCreatePlaylist = handleSubmit((values) => {
  playlist_service.add(values.name);
  showCreateModal.value = false;
});

const onClickRemovePlaylist = async (playlist_id: string) => {
  playlist_service.remove(playlist_id);
};

onIonViewWillEnter(() => {
  playlist_subscription = playlist_service.subscribe(
    (p: DeepReadonlyObject<RxPlaylist>[]) => {
      playlists.value = p.filter((p) => p.id !== FAVORITES_PLAYLIST_ID);
    },
  );
});

onIonViewDidLeave(() => {
  playlist_subscription?.unsubscribe();
});
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content class="ion-padding">
      <div class="flex col h-full">
        <div
          v-if="search_results.length"
          class="flex col grow h-full"
        >
          <div class="flex center-y">
            <ion-searchbar
              :placeholder="`${t('pages.search')}... :)`"
              @ion-change="search"
            />
            <ion-button
              size="small"
              color="primary"
              shape="round"
              @click="showCreateModal = true"
            >
              <ion-icon slot="icon-only" :icon="add_icon" />
            </ion-button>
            <ion-button
              id="open-actions-popover"
              shape="round"
              size="small"
              fill="clear"
            >
              <ion-icon
                slot="icon-only"
                color="dark"
                :icon="ellipsisVertical"
              ></ion-icon>
            </ion-button>
          </div>

          <VirtualList :estimate-size="42" :items="search_results">
            <template #item="{ item }">
              <div
                class="flex between"
                style="padding: 10px 0"
                @click="() => {}"
              >
                <div>{{ item.name }}</div>
                <div
                  class="audio-actions"
                  @click="onClickRemovePlaylist(item.id)"
                >
                  <ion-icon :icon="play_icon"></ion-icon>
                  <ion-icon :icon="trashOutline" />
                </div>
              </div>
            </template>
          </VirtualList>
        </div>

        <!-- No Playlists -->
        <div v-else class="flex col grow center h-full" style="gap: 10px">
          <img
            :src="layout.state.isDarkTheme ? iconLight : iconDark"
            style="width: 100px"
          />
          <div>{{ t("playlists.start") }}</div>
          <div class="flex center-y">
            <ion-chip @click="showCreateModal = true">
              <ion-icon :icon="add_icon" style="font-size: 20px"></ion-icon>
              <ion-label>{{ t("generic.create") }}</ion-label>
            </ion-chip>
            <ion-chip @click="onClickImportFromSpotify">
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

      <!-- Create playlist -->
      <ion-modal
        :is-open="showCreateModal"
        @did-dismiss="showCreateModal = false"
        @will-present="resetForm()"
      >
        <ion-content class="ion-padding">
          <div>{{ t("playlists.create") }}</div>
          <form style="margin-top: 15px" @submit="onClickCreatePlaylist">
            <ion-input
              v-model="playlist_name"
              v-bind="playlist_name_attrs"
              fill="outline"
              :class="errors.name ? 'ion-touched ion-invalid' : ''"
              :error-text="errors.name"
              :clear-input="true"
              :placeholder="t('playlists.placeholders.name')"
            />
            <div class="flex end" style="margin-top: 15px">
              <ion-button
                color="medium"
                shape="round"
                @click="showCreateModal = false"
              >
                {{ t("generic.cancel") }}
              </ion-button>
              <ion-button color="primary" shape="round" type="submit">
                {{ t("generic.create") }}
              </ion-button>
            </div>
          </form>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<style lang="scss" scoped>
ion-thumbnail {
  --size: 45px;
  --border-radius: 10px;
}
</style>
