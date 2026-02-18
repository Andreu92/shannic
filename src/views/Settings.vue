<script setup lang="ts">
import { InAppBrowser } from "@capgo/inappbrowser";
import { Icon } from "@iconify/vue";
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
import { moonOutline, sunnyOutline, trashOutline } from "ionicons/icons";
import { type Ref, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppHeader from "@/components/layout/AppHeader.vue";
import { useLayout } from "@/composables/useLayout";
import type { LanguageMessages } from "@/types";

const { t, getLocaleMessage, locale } = useI18n();

const layout = useLayout();
const messages: Ref<LanguageMessages> = ref(getLocaleMessage(locale.value));
const icons: Record<string, string> = {
  es: "circle-flags:es",
  ca: "circle-flags:es-ct",
  en: "circle-flags:gb",
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

const clearBrowserCache = () => {
  InAppBrowser.clearAllCookies();
  InAppBrowser.clearCache();
};
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content fullscreen class="ion-padding">
      <div class="settings-container">
        <div>
          <div style="display: flex; align-items: center; gap: 5px">
            <div>{{ t("settings.language") }}</div>
            <Icon :icon="icons[locale]" :style="{ fontSize: '20px' }" />
          </div>
          <div>
            <ion-select
              aria-label="Fruit"
              interface="action-sheet"
              fill="outline"
              :cancel-text="t('generic.cancel')"
              @ionChange="changeLanguage"
              :value="locale"
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
              @ionChange="toggleDarkPalette"
              :checked="layout.state.isDarkTheme"
            />
            <ion-icon :src="moonOutline" />
          </div>
        </div>
        <div>
          <div>{{ t("settings.clear_cache") }}</div>
          <div>
            <ion-button
              color="primary"
              shape="round"
              @click="clearBrowserCache"
            >
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </div>
        </div>
      </div>
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
</style>
