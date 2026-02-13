<script setup lang="ts">
import {
	IonButton,
	IonButtons,
	IonHeader,
	IonIcon,
	IonImg,
	IonTitle,
	IonToolbar,
} from "@ionic/vue";
import { settingsOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import logoDarkTheme from "@/assets/img/logo-dark-theme.png";
import logoLightTheme from "@/assets/img/logo-light-theme.png";
import { useLayout } from "@/composables/useLayout";

const router = useRouter();
const layout = useLayout();
</script>

<template>
  <ion-header>
    <ion-toolbar style="padding-top: 5px;">
      <ion-title>
        <ion-img style="width: 90px;" :src="layout.state.isDarkTheme ? logoDarkTheme : logoLightTheme" />
      </ion-title>
      <ion-buttons slot="end">
        <div>
          <ion-button fill="clear" shape="round" @click="router.replace('/settings')">
            <ion-icon :icon="settingsOutline" />
          </ion-button>
        </div>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>