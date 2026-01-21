<script setup lang="ts">
import {
	IonIcon,
	IonLabel,
	IonPage,
	IonRouterOutlet,
	IonTabBar,
	IonTabButton,
	IonTabs,
} from "@ionic/vue";
import { heart, home, list, search } from "ionicons/icons";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <ion-tab-bar slot="bottom">
        <!-- <ion-tab-button tab="home" href="/home">
          <ion-icon aria-hidden="true" :icon="home" />
          <ion-label>{{ t("pages.home") }}</ion-label>
        </ion-tab-button> -->

        <ion-tab-button tab="search" href="/search">
          <ion-icon aria-hidden="true" :icon="search"></ion-icon>
          <ion-label>{{ t("pages.search") }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="favorites" href="/favorites">
          <ion-icon aria-hidden="true" :icon="heart" />
          <ion-label>{{ t("pages.favorites") }}</ion-label>
        </ion-tab-button>

        <!-- <ion-tab-button tab="playlists" href="/playlists">
          <ion-icon aria-hidden="true" :icon="list" />
          <ion-label>{{ t("pages.playlists") }}</ion-label>
        </ion-tab-button> -->
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>
