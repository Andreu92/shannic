<script setup lang="ts">
import EsFlagIcon from "@iconify-vue/circle-flags/es";
import CaFlagIcon from "@iconify-vue/circle-flags/es-ct";
import GbFlagIcon from "@iconify-vue/circle-flags/gb";
import ZhFlagIcon from "@iconify-vue/circle-flags/lang-zh";
import ArFlagIcon from "@iconify-vue/circle-flags/lang-ar";
import ItFlagIcon from "@iconify-vue/circle-flags/it";
import FrFlagIcon from "@iconify-vue/circle-flags/fr";
import DeFlagIcon from "@iconify-vue/circle-flags/de";
import PtFlagIcon from "@iconify-vue/circle-flags/pt";
import RuFlagIcon from "@iconify-vue/circle-flags/ru";
import PlFlagIcon from "@iconify-vue/circle-flags/pl";
import NlFlagIcon from "@iconify-vue/circle-flags/nl";
import JaFlagIcon from "@iconify-vue/circle-flags/jp";
import SpotifyIcon from "@iconify-vue/logos/spotify-icon";
import { InAppBrowser } from "@capgo/inappbrowser";
import { Directory, Filesystem } from "@capacitor/filesystem";
import type {
  IonSelectCustomEvent,
  IonToggleCustomEvent,
  SelectChangeEventDetail,
  ToggleChangeEventDetail,
} from "@ionic/core";
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from "@ionic/vue";
import {
  closeOutline,
  moonOutline,
  sunnyOutline,
  trashOutline,
  checkmark,
} from "ionicons/icons";
import { type Component, type Ref, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/layout/AppHeader.vue";
import { useLayout } from "@/composables/useLayout";
import type { LanguageMessages } from "@/types";
import useSpotifyService from "@/services/SpotifyService";
import { player_plugin } from "@/plugins/PlayerPlugin";
import { showToast } from "@/utils";
import { useDatabase } from "@/database";

const db = useDatabase();
const layout = useLayout();

const spotify_service = useSpotifyService();

const { t, getLocaleMessage, locale } = useI18n();

const show_erase_alert = ref(false);
const messages: Ref<LanguageMessages> = ref(getLocaleMessage(locale.value));
const icons: Record<string, Component> = {
  es: EsFlagIcon,
  ca: CaFlagIcon,
  en: GbFlagIcon,
  zh_CN: ZhFlagIcon,
  ar: ArFlagIcon,
  it: ItFlagIcon,
  fr: FrFlagIcon,
  de: DeFlagIcon,
  pt_PT: PtFlagIcon,
  ru: RuFlagIcon,
  pl: PlFlagIcon,
  nl: NlFlagIcon,
  ja: JaFlagIcon,
};

const toggleDarkPalette = (
  event: IonToggleCustomEvent<ToggleChangeEventDetail<boolean>>,
) => {
  if (event.detail.checked) layout.setDarkTheme();
  else layout.setLightTheme();
};

const changeLanguage = (
  event: IonSelectCustomEvent<SelectChangeEventDetail<string>>,
) => {
  localStorage.setItem("lang", event.detail.value);
  locale.value = event.detail.value;
  messages.value = getLocaleMessage(locale.value);
};

const unlinkSpotify = () => {
  if (spotify_service.isLinked()) {
    spotify_service.deleteToken();
    InAppBrowser.clearAllCookies();
    InAppBrowser.clearCache();
    showToast(t("spotify.unlinked"), "success", checkmark);
  } else {
    showToast(t("spotify.not_linked"), "warning");
  }
};

const clearCache = () => {
  player_plugin.clearCache();
  showToast(t("settings.cache_cleared"), "success", checkmark);
};

const erase = async () => {
  await InAppBrowser.clearAllCookies();
  await InAppBrowser.clearCache();

  await player_plugin.clearCache();

  const { files } = await Filesystem.readdir({
    path: "",
    directory: Directory.Data,
  });

  for (const entry of files) {
    if (entry.type === "directory") {
      await Filesystem.rmdir({
        path: entry.name,
        directory: Directory.Data,
        recursive: true,
      });
    } else {
      await Filesystem.deleteFile({
        path: entry.name,
        directory: Directory.Data,
      });
    }
  }

  await db.remove();
  window.location.reload();
};
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content fullscreen class="ion-padding">
      <div class="settings-container">
        <div>
          <div class="flex center-y" style="gap: 5px">
            <div>{{ t("settings.language") }}</div>
            <Component :is="icons[locale]" height="24" />
          </div>
          <div>
            <ion-select
              interface="action-sheet"
              fill="outline"
              :cancel-text="t('generic.cancel')"
              :value="locale"
              @ion-change="changeLanguage"
            >
              <ion-select-option
                v-for="(item, index) in messages.lang"
                :key="index"
                :value="index"
                >{{ item }}</ion-select-option
              >
            </ion-select>
          </div>
        </div>

        <div>
          <div>{{ t("settings.theme") }}</div>
          <div class="toggle-dark-mode">
            <ion-icon :src="sunnyOutline" />
            <ion-toggle
              :checked="layout.state.isDarkTheme"
              @ion-change="toggleDarkPalette"
            />
            <ion-icon :src="moonOutline" />
          </div>
        </div>

        <div>
          <div>{{ t("spotify.unlink") }}</div>
          <div>
            <ion-button color="primary" shape="round" @click="unlinkSpotify">
              <div slot="icon-only" class="spotify-button-container">
                <div class="spotify-icon-background">
                  <SpotifyIcon />
                </div>
                <ion-icon :icon="closeOutline" class="close-icon-overlay" />
              </div>
            </ion-button>
          </div>
        </div>

        <div>
          <div>{{ t("settings.cache") }}</div>
          <div>
            <ion-button color="primary" shape="round" @click="clearCache">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </div>
        </div>

        <div>
          <div>{{ t("settings.erase_all") }}</div>
          <div>
            <ion-button
              color="danger"
              shape="round"
              @click="show_erase_alert = true"
            >
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </div>
        </div>
      </div>

      <ion-alert
        :is-open="show_erase_alert"
        :header="t('settings.erase.header')"
        :message="t('settings.erase.message')"
        :buttons="[
          {
            text: t('generic.no'),
            role: 'cancel',
            handler: () => {
              show_erase_alert = false;
            },
          },
          {
            text: t('generic.yes'),
            role: 'confirm',
            handler: () => {
              erase();
            },
          },
        ]"
      ></ion-alert>
    </ion-content>
  </ion-page>
</template>

<style lang="scss" scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 5px;
}

.settings-container > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  min-height: 75px;

  > div:first-child {
    flex: 4;
  }

  > div:nth-child(2) {
    flex: 2;
    display: flex;
    justify-content: center;
  }
}

.toggle-dark-mode {
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.spotify-button-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spotify-icon-background {
  width: 20px;
  height: 20px;
}

.close-icon-overlay {
  position: absolute;
  font-size: 26px;
  color: var(--ion-color-danger, #eb445a);
  pointer-events: none;
}
</style>
