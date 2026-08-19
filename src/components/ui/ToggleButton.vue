<script setup lang="ts">
import { IonIcon } from "@ionic/vue";
import { Component } from "vue";

interface Props {
  enabled: boolean;
  icon: string | Component;
  size?: number;
}

const props = withDefaults(defineProps<Props>(), {
  size: 40,
});
</script>

<template>
  <div class="flex center toggle-button" :class="{ 'is-active': props.enabled }">
    <ion-icon v-if="typeof props.icon === 'string'" color="dark" :icon="props.icon" style="font-size: 1.4rem" />
    <Component :is="props.icon" v-else :height="size-17" />
  </div>
</template>

<style lang="scss" scoped>
.toggle-button {
  flex-shrink: 0;
  width: v-bind("`${size}px`");
  height: v-bind("`${size}px`");
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  &.is-active {
    background: rgba(var(--ion-color-primary-rgb), 0.4);
  }
}
</style>
