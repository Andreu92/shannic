<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { IonPage, IonContent, IonSearchbar, IonSpinner, SearchbarCustomEvent, IonList, IonItem, IonThumbnail, IonImg, IonIcon, IonChip, IonLabel, onIonViewWillEnter } from "@ionic/vue";
import { search as search_icon } from "ionicons/icons";

import broken_heart from "@/assets/img/broken-heart.svg"
import spotify_icon from "@/assets/img/spotify-icon.svg"
import useSpotify from "@/composables/useSpotify";
import { useAudioService } from "@/composables/useAudioService";
import AppHeader from "@/components/layout/AppHeader.vue";
import { AudioDocument, PlaylistDocument, Audio } from "@/types";
import { AudioPlayer } from "@shannic/audio-player";
import { useRouter } from "vue-router";

const router = useRouter();
const { t } = useI18n();
const loading = ref<boolean>(false);

const spotify = useSpotify();
const audio_service = useAudioService();

let query: string | null | undefined = null;
const favorites = ref<AudioDocument[]>([]);

const search = async (e: SearchbarCustomEvent) => {
  query = e.detail.value;
  loading.value = true;
  /*favorites.value = await audio_service.getFavoriteAudios(query || undefined);
      const selector: any = {
        id: { $in: favorite_ids.map((o) => o.audioId) },
      };
  
      if (query && query.trim() !== "") {
        selector.title = { $regex: query, $options: "i" };
        selector.artist = { $regex: query, $options: "i" };
      }
  
      const favorites: AudioDocument[] = await audios.find({ selector }).exec();
  
      return favorites;*/
  loading.value = false;
}

// Refactor
const play = async (id: string) => {
  const audio = await audio_service.get(id);
  AudioPlayer.play(audio as Required<Audio>);
}

const linkSpotify = () => {
  spotify.linkAccount();
}

const fetchSpotifyFavoriteTracks = async () => {
  console.log(await spotify.getFavoriteTracks());
}

onIonViewWillEnter(async () => {
  console.log("Favorites will enter");
  favorites.value = await audio_service.getFavoriteAudios();
});
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content fullscreen class="ion-padding">
      <div v-if="favorites.length">
        <div style="position: relative;">
          <ion-searchbar :placeholder="t('favorites.placeholder')" @ion-change="search" />
          <ion-spinner v-if="loading" name="dots" class="searchbar-loading"></ion-spinner>
        </div>
        <ion-list v-if="favorites.length">
          <ion-item v-for="fav in favorites" :key="fav.id" @click="play(fav.id)">
            <ion-thumbnail>
              <ion-img :src="fav.thumbnails[fav.thumbnails.length - 1].url" />
            </ion-thumbnail>
            <div class="audio-info">
              <div ref="titles" class="audio-title">{{ fav.title }}</div>
              <div class="audio-artist">{{ fav.artist }}</div>
            </div>
            <div class="audio-duration">{{ fav.duration }}</div>
            <!--<div class="audio-actions">
            <ion-icon :icon="isFavorite(fav.id) ? heart : heartOutline" :color="isFavorite(fav.id) ? 'danger' : ''"
              @click.stop="toggleFav(fav.id)"></ion-icon>
          </div>-->
          </ion-item>
        </ion-list>
      </div>
      <div v-else class="no-favs">
        <ion-icon :icon="broken_heart" style="font-size: 90px; color: var(--ion-color-dark-tint)"></ion-icon>
        <div>{{ t('favorites.start') }}</div>
        <div class="start-actions">
          <ion-chip @click="() => router.replace('/search')">
            <ion-icon :icon="search_icon" style="font-size: 20px;"></ion-icon>
            <ion-label>{{ t('pages.search') }}</ion-label>
          </ion-chip>
          <ion-chip @click="linkSpotify">
            <ion-icon :icon="spotify_icon" style="font-size: 25px;"></ion-icon>
            <ion-label>{{ t('spotify.link') }}</ion-label>
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

.no-favs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.start-actions {
  display: flex;
  align-items: center;
  margin-top: 15px;
}
</style>
