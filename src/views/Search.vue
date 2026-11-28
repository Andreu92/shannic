<script setup lang="ts">
import { IonContent, IonIcon, IonPage, IonButton } from "@ionic/vue";
import { heart, heartOutline } from "ionicons/icons";
import { useI18n } from "vue-i18n";
import { YoutubeSearchItem } from "@/plugins/YoutubePlugin";
import AppHeader from "@/components/layout/AppHeader.vue";
import useAudioService from "@/services/AudioService";
import useFavoritesStore from "@/stores/FavoritesStore";
import { showToast } from "@/utils";
import SearchTemplate from "@/components/core/SearchTemplate.vue";

const { t } = useI18n();

const audio_service = useAudioService();

const favorites_store = useFavoritesStore();

const toggleFavorite = async (search_item: YoutubeSearchItem) => {
  if (favorites_store.isFavorite(search_item.id)) {
    favorites_store.remove(search_item.id);
  } else {
    if (!navigator.onLine) {
      showToast(t("network.offline"), "warning");
      return;
    }

    await audio_service.create(search_item);
    favorites_store.add(search_item.id);
  }
};
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content class="ion-padding">
      <SearchTemplate>
        <template #actions="item">
          <ion-button
            shape="round"
            fill="clear"
            @click.stop="toggleFavorite(item)"
          >
            <ion-icon
              slot="icon-only"
              :icon="favorites_store.isFavorite(item.id) ? heart : heartOutline"
              :color="favorites_store.isFavorite(item.id) ? 'danger' : 'dark'"
            ></ion-icon>
          </ion-button>
        </template>
      </SearchTemplate>
    </ion-content>
  </ion-page>
</template>
