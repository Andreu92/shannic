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
} from "@ionic/vue";
import { add as add_icon, close as close_icon } from "ionicons/icons";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useForm } from "vee-validate";
import * as v from "valibot";
import { toTypedSchema } from "@vee-validate/valibot";
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

const { t } = useI18n();

const layout = useLayout();

const network_store = useNetworkStore();

const playlist_service = usePlaylistService();
const spotify_service = useSpotifyService();

const showCreateModal = ref<boolean>(false);
const search_query = ref<string | null | undefined>(null);
const loading = ref<boolean>(false);

const search_results = ref<RxPlaylist[]>([]);

const search = async (e?: SearchbarCustomEvent) => {
  search_results.value = [];

  Keyboard.hide();

  if (e?.detail?.value) search_query.value = e.detail.value.trim();

  loading.value = true;

  loading.value = false;
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
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content class="ion-padding">
      <div class="flex col h-full">
        <div v-if="search_results.length" class="flex col grow h-full">
          <ion-searchbar
            :placeholder="`${t('pages.search')}... :)`"
            @ion-change="search"
          />

          <VirtualList :items="search_results">
            <template #item="{ item }">
              <div class="flex center w-full h-full" @click="() => {}"></div>
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
