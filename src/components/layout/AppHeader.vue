<script setup lang="ts">
import {
  IonButtons,
  IonHeader,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { useRouter } from "vue-router";
import logoDarkTheme from "@/assets/img/logo-dark-theme.png";
import logoLightTheme from "@/assets/img/logo-light-theme.png";
import { useLayout } from "@/composables/useLayout";
import useNetworkStore from "@/stores/NetworkStore";
import WifiOffIcon from "@iconify-vue/material-symbols/wifi-off";
import SettingsIcon from "@iconify-vue/material-symbols/settings";

const router = useRouter();
const layout = useLayout();
const network_store = useNetworkStore();
</script>

<template>
  <ion-header>
    <ion-toolbar style="padding-top: 5px">
      <ion-title>
        <img
          style="width: 90px"
          :src="layout.state.isDarkTheme ? logoDarkTheme : logoLightTheme"
        />
      </ion-title>
      <ion-buttons slot="end">
        <div
          style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin-right: 12px;
          "
        >
          <WifiOffIcon v-if="!network_store.is_online" width="22" height="22" />
          <SettingsIcon
            width="22"
            height="22"
            @click="router.replace('/settings')"
          />
        </div>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>
