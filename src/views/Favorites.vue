<script setup lang="ts">
import {
	alertController,
	IonChip,
	IonContent,
	IonIcon,
	IonImg,
	IonItem,
	IonLabel,
	IonList,
	IonPage,
	IonReorder,
	IonReorderGroup,
	IonSearchbar,
	IonThumbnail,
	onIonViewWillEnter,
	ReorderEndCustomEvent,
	SearchbarCustomEvent,
} from "@ionic/vue";
import {
	heart,
	heartOutline,
	reorderTwoOutline,
	search as search_icon,
} from "ionicons/icons";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import broken_heart from "@/assets/img/broken-heart.svg";
import iconDark from "@/assets/img/icon-dark.png";
import iconLight from "@/assets/img/icon-light.png";
import no_search_results from "@/assets/img/no-search-results.svg";
import spotify_icon from "@/assets/img/spotify-icon.svg";
import AppHeader from "@/components/layout/AppHeader.vue";
import { useAudioService } from "@/composables/useAudioService";
import { useLayout } from "@/composables/useLayout";
import useSpotify from "@/composables/useSpotify";
import { RxAudio } from "@/schemas/audio";
import { useFavoritesStore } from "@/stores/FavoritesStore";
import { usePlayerStore } from "@/stores/PlayerStore";
import { AudioDocument, PlaylistAudio } from "@/types";
import { formatDuration, showToast } from "@/utils";

const router = useRouter();
const { t } = useI18n();

const layout = useLayout();
const player_store = usePlayerStore();
const favorites_store = useFavoritesStore();
const audio_service = useAudioService();
const spotify = useSpotify();

const query = ref<string>("");
const reorder_mode = ref(false);

const search_results = computed(() => {
	const searchTerm = query.value.trim().toLowerCase();
	if (searchTerm !== "") {
		return favorites_store.audios.filter(
			(audio: RxAudio) =>
				audio.title.toLowerCase().includes(searchTerm) ||
				audio.artist?.toLowerCase().includes(searchTerm),
		);
	}
	return favorites_store.audios;
});

const search = (e: SearchbarCustomEvent) => {
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

const linkSpotify = () => {
	spotify.linkAccount();
};

const fetchSpotifyFavoriteTracks = async () => {
	console.log(await spotify.getFavoriteTracks());
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
        <ion-searchbar :placeholder="t('favorites.placeholder')" @ion-change="search" @ion-input="clearIfEmpty"
          @ion-clear="query = ''" />
        <div>
          <ion-chip color="primary" @click="reorder_mode = !reorder_mode">
            <ion-icon :icon="reorderTwoOutline" />
          </ion-chip>
        </div>
        <ion-list v-if="search_results.length">
          <ion-reorder-group :disabled="!reorder_mode || query.trim() !== ''" @ionReorderEnd="handleReorder">
            <ion-reorder v-for="result of search_results" :key="result.id">
              <ion-item @click="player_store.play(result.id, favorites_store.isFavorite(result.id))">
                <ion-thumbnail>
                  <ion-img :src="result.thumbnails[result.thumbnails.length - 1].url" />
                </ion-thumbnail>
                <div class="audio-info">
                  <div ref="titles" class="audio-title">{{ result.title }}</div>
                  <div class="audio-artist">{{ result.artist }}</div>
                </div>
                <div class="audio-duration">{{ formatDuration(result.duration) }}</div>
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
          <div>{{ t('favorites.noResults') }}</div>
        </div>
      </div>
      <div v-else class="no-favs">
        <ion-img :src="layout.isDarkTheme ? iconLight : iconDark" style="width: 100px;" />
        <div style="margin-top: 3px;">{{ t('favorites.start') }}</div>
        <div class="start-actions">
          <ion-chip @click="() => router.replace('/search')">
            <ion-icon :icon="search_icon" style="font-size: 20px;"></ion-icon>
            <ion-label>{{ t('pages.search') }}</ion-label>
          </ion-chip>
          <ion-chip @click="linkSpotify">
            <ion-icon :icon="spotify_icon" style="font-size: 25px;"></ion-icon>
            <ion-label>{{ t('favorites.spotify') }}</ion-label>
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
</style>
