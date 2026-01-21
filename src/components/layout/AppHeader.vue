<script setup lang="ts">
import type {
	IonToggleCustomEvent,
	ToggleChangeEventDetail,
} from "@ionic/core";
import {
	IonButtons,
	IonHeader,
	IonIcon,
	IonImg,
	IonTitle,
	IonToggle,
	IonToolbar,
} from "@ionic/vue";
import { moonOutline, sunnyOutline } from "ionicons/icons";
import logoDarkTheme from "@/assets/img/logo-dark-theme.png";
import logoLightTheme from "@/assets/img/logo-light-theme.png";
import { useLayout } from "@/composables/useLayout";

const layout = useLayout();

const toggleDarkPalette = (
	event: IonToggleCustomEvent<ToggleChangeEventDetail<boolean>>,
) => {
	layout.isDarkTheme = event.detail.checked;
	document.documentElement.classList.toggle(
		"ion-palette-dark",
		event.detail.checked,
	);
};
</script>

<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>
        <ion-img style="width: 90px;" :src="layout.isDarkTheme ? logoDarkTheme : logoLightTheme" />
      </ion-title>
      <ion-buttons slot="end">
        <div class="toggle-dark-mode">
          <ion-icon :src="sunnyOutline" />
          <ion-toggle @ionChange="toggleDarkPalette" :checked="layout.isDarkTheme" />
          <ion-icon :src="moonOutline" />
        </div>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<style lang="css" scoped>
.toggle-dark-mode {
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 8px;
  border-radius: 99px;
}
</style>
