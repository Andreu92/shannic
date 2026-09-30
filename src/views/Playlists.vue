<script setup lang="ts">
import { Keyboard } from "@capacitor/keyboard";
import SpotifyIcon from "@iconify-vue/logos/spotify-icon";
import {
  IonContent,
  IonIcon,
  IonPage,
  IonSearchbar,
  type SearchbarCustomEvent,
} from "@ionic/vue";
import { heart, heartOutline } from "ionicons/icons";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import iconDark from "@/assets/img/icon-dark.png";
import iconLight from "@/assets/img/icon-light.png";
import AppHeader from "@/components/layout/AppHeader.vue";
import { useLayout } from "@/composables/useLayout";
import useNetworkStore from "@/stores/NetworkStore";
import { showToast } from "@/utils";
import VirtualList from "@/components/ui/VirtualList.vue";
import { RxPlaylist } from "@/schemas/playlist";
import useSpotifyService from "@/services/SpotifyService";

const { t } = useI18n();

const layout = useLayout();

const network_store = useNetworkStore();

const spotify_service = useSpotifyService();

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

const importFromSpotify = async () => {
  if (!network_store.is_online) {
    showToast(t("network.offline"), "warning");
    return;
  }
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

        <!-- Create playlist -->
        

        <!-- No Playlists -->
        <div v-else class="flex col grow center h-full" style="gap: 10px">
          <img
            :src="layout.state.isDarkTheme ? iconLight : iconDark"
            style="width: 100px"
          />
          <div>{{ t("playlists.start") }}</div>
          <ion-chip @click="importFromSpotify">
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
    </ion-content>
  </ion-page>
</template>

<style lang="scss" scoped>
ion-thumbnail {
  --size: 45px;
  --border-radius: 10px;
}
</style>
