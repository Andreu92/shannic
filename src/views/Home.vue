<script setup lang="ts">
import { IonContent, IonPage } from "@ionic/vue";
import AppHeader from "@/components/layout/AppHeader.vue";
</script>

<template>
  <ion-page>
    <AppHeader />
    <ion-content :fullscreen="true"> TO DO </ion-content>
  </ion-page>
</template>
