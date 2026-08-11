<script setup lang="ts">
import { IonIcon } from "@ionic/vue";

interface Props {
  enabled: boolean;
  icon: string;
  size?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: "40px",
});
</script>

<template>
  <div class="flex center toggle-button" :class="{ 'is-active': props.enabled }">
    <ion-icon color="dark" :icon="props.icon" style="font-size: 1.4rem" />
  </div>
</template>

<style lang="scss" scoped>
.toggle-button {
  flex-shrink: 0;
  width: v-bind(size);
  height: v-bind(size);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  &.is-active {
    background: rgba(var(--ion-color-primary-rgb), 0.4);
  }
}
</style>
