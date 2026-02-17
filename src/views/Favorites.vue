<script setup lang="ts">
import { Keyboard } from "@capacitor/keyboard";
import { Icon } from "@iconify/vue";
import {
	alertController,
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
	IonReorder,
	IonReorderGroup,
	IonSearchbar,
	IonThumbnail,
	onIonViewWillEnter,
	ReorderEndCustomEvent,
	SearchbarCustomEvent,
} from "@ionic/vue";
import {
	downloadOutline,
	ellipsisVertical,
	heart,
	heartOutline,
	play as play_icon,
	reorderTwoOutline,
	search as search_icon,
	shuffle as shuffle_icon,
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
import { RxAudio } from "@/schemas/audio";
import useSpotifyService from "@/services/SpotifyService";
import useFavoritesStore from "@/stores/FavoritesStore";
import usePlayerStore from "@/stores/PlayerStore";

const router = useRouter();
const { t } = useI18n();

const layout = useLayout();
const player_store = usePlayerStore();
const favorites_store = useFavoritesStore();

const spotify_service = useSpotifyService();

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

const showDeleteFavoriteConfirmAlert = async (audioId: string) => {
	const to_delete: RxAudio | undefined = favorites_store.audios.find(
		(audio: RxAudio) => audio.id === audioId,
	);

	if (!to_delete) return;

	const alert = await alertController.create({
		header: t("favorites.delete.header"),
		message: t("favorites.delete.message", { title: to_delete.title }),
		buttons: [
			{
				text: t("generic.no"),
				role: "cancel",
			},
			{
				text: t("generic.yes"),
				role: "confirm",
				handler: () => {
					favorites_store.deleteFavorite(audioId);
					if (player_store.isInPlaylist(audioId)) {
						const index = player_store.getIndexById(audioId);
						player_store.toggleFavorite(false, index);
					}
				},
			},
		],
	});

	await alert.present();
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
          <ion-searchbar :placeholder="t('favorites.placeholder')" @ion-change="search" @ion-input="clearIfEmpty" @ion-clear="query = ''" />
          <ion-icon id="open-actions-popover" slot="icon-only" color="dark" :icon="ellipsisVertical" style="font-size: 1.4rem;"></ion-icon>
        </div>
        <div class="playlist-actions" v-if="query.trim() === ''">
          <ion-button fill="clear" shape="round" @click="player_store.play(favorites_store.audios, shuffle)">
            <ion-icon slot="icon-only" color="dark" :icon="play_icon"></ion-icon>
          </ion-button>
          <toggle-button :enabled="shuffle" :icon="shuffle_icon" @click="shuffle = !shuffle" />
          <ion-button fill="clear" shape="round" @click="console.log('TODO')">
            <ion-icon slot="icon-only" color="dark" :icon="downloadOutline"></ion-icon>
          </ion-button>
          <toggle-button :enabled="reorder_mode" :icon="reorderTwoOutline" @click="reorder_mode = !reorder_mode" />
        </div>
        <ion-list v-if="search_results.length">
          <ion-reorder-group :disabled="!reorder_mode || query.trim() !== ''" @ionReorderEnd="handleReorder">
            <ion-reorder v-for="result of search_results" :key="result.id">
              <ion-item @click="console.log('TODO')">
                <div class="audio-thumbnail">
                  <ion-thumbnail>
                    <ion-img :src="result.thumbnail" />
                  </ion-thumbnail>
                </div>
                <div class="audio-info">
                  <div ref="titles" class="audio-title">{{ result.title }}</div>
                  <div class="audio-artist">{{ result.author }}</div>
                </div>
                <div class="audio-duration">{{ result.duration_text }}</div>
                <div class="audio-actions">
                  <ion-icon :icon="favorites_store.isFavorite(result.id) ? heart : heartOutline"
                    :color="favorites_store.isFavorite(result.id) ? 'danger' : ''"
                    @click.stop="showDeleteFavoriteConfirmAlert(result.id)"></ion-icon>
                </div>
              </ion-item>
            </ion-reorder>
          </ion-reorder-group>
        </ion-list>
        <div v-else class="no-results">
          <img :src="no_search_results"></img>
          <div>{{ t('favorites.no_results') }}</div>
        </div>

        <ion-popover trigger="open-actions-popover" dismiss-on-select trigger-action="click">
          <ion-content class="ion-padding">
            <div class="import-actions" @click="spotify_service.importSavedTracks">
              <div class="spotify-icon-background" style="width: 20px; height: 20px;">
                <Icon icon="logos:spotify-icon"></Icon>
              </div>
              <div>{{ t('favorites.spotify') }}...</div>
            </div>
          </ion-content>
        </ion-popover>
      </div>
      <div v-else class="no-favs">
        <ion-img :src="layout.state.isDarkTheme ? iconLight : iconDark" style="width: 100px;" />
        <div style="margin-top: 3px;">{{ t('favorites.start') }}</div>
        <div class="start-actions">
          <ion-chip @click="() => router.replace('/search')">
            <ion-icon :icon="search_icon" style="font-size: 20px;"></ion-icon>
            <ion-label>{{ t('pages.search') }}</ion-label>
          </ion-chip>
          <ion-chip @click="spotify_service.importSavedTracks">
            <div class="spotify-icon-background" style="width: 20px; height: 20px;">
              <Icon icon="logos:spotify-icon"></Icon>
            </div>
            <ion-label style="margin-left: 5px;">{{ t('favorites.spotify') }}</ion-label>
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

.import-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.playlist-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
