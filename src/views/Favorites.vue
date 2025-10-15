<script setup lang="ts">
import AppHeader from "@/components/layout/AppHeader.vue";
import { IonPage, IonContent, IonButton } from "@ionic/vue";
import useSpotify from "@/composables/useSpotify";

const spotify = useSpotify();

const linkSpotify = () => {
  spotify.linkAccount();
}

const fetchSpotifyFavoriteTracks = async () => {
  console.log(await spotify.getFavoriteTracks());
}
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content fullscreen class="ion-padding">
      <ion-button @click="linkSpotify">Link spotify</ion-button>
      <ion-button @click="fetchSpotifyFavoriteTracks">fetch favorites</ion-button>
    </ion-content>
  </ion-page>
</template>
