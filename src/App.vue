<script setup lang="ts">
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { IonApp, IonRouterOutlet, IonAlert } from "@ionic/vue";
import { onBeforeMount, onMounted, onUnmounted, reactive } from "vue";
import MiniPlayer from "@/components/core/MiniPlayer.vue";
import pack from "../package.json";
import SpotifySyncCard from "@/components/core/SpotifySyncCard.vue";
import { useLayout } from "@/composables/useLayout";
import useFavoritesStore from "@/stores/FavoritesStore";
import usePlayerStore, { states } from "@/stores/PlayerStore";
import { useI18n } from "vue-i18n";
import { InAppBrowser } from "@capgo/inappbrowser";

const { t } = useI18n();

const layout = useLayout();
const favorites_store = useFavoritesStore();
const player_store = usePlayerStore();

let stateChangeListener: PluginListenerHandle;

const update: { available: boolean; version: string; url: string } = reactive({
  available: false,
  version: `v${pack.version}`,
  url: import.meta.env.VITE_GITHUB_REPO_URL,
});

const checkForUpdate = () => {
  const last_update_check_date = localStorage.getItem("last_update_check_date");
  if (
    !last_update_check_date ||
    Date.now() - parseInt(last_update_check_date) > 24 * 60 * 60 * 1000
  ) {
    fetch(`${import.meta.env.VITE_GITHUB_API_REPO_URL}/releases/latest`, {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
      .then((res) =>
        res
          .json()
          .then((data) => {
            update.version = data.tag_name;
            const current_version = `v${pack.version}`;

            if (update.version !== current_version) {
              update.available = true;
              update.url = data.html_url;
            }
          })
          .catch(() => {
            throw new Error("Error parsing check for updates response.");
          }),
      )
      .catch(() => {
        throw new Error("Check for updates failed.");
      })
      .finally(() => {
        localStorage.setItem("last_update_check_date", Date.now().toString());
      });
  }
};

onBeforeMount(async () => {
  layout.applyStoredTheme();

  stateChangeListener = await App.addListener("appStateChange", (state) => {
    if (state.isActive) {
      if (player_store.state === states.playing) {
        player_store.startProgressTimer();
      }
    } else player_store.stopProgressTimer();
  });
});

onMounted(() => {
  checkForUpdate();
  favorites_store.init();
  player_store.initListeners();
});

onUnmounted(() => {
  stateChangeListener.remove();
});
</script>

<template>
  <ion-app>
    <ion-router-outlet></ion-router-outlet>
    <MiniPlayer></MiniPlayer>
    <SpotifySyncCard></SpotifySyncCard>

    <ion-alert
      :is-open="update.available"
      :header="t('update.title')"
      :message="t('update.message', [update.version])"
      :buttons="[
        {
          text: t('generic.no'),
          role: 'cancel',
          handler: () => {
            update.available = false;
          },
        },
        {
          text: t('generic.yes'),
          role: 'confirm',
          handler: () => {
            InAppBrowser.open({
              url: update.url,
            });
            update.available = false;
          },
        },
      ]"
    ></ion-alert>
  </ion-app>
</template>

<style scoped></style>
