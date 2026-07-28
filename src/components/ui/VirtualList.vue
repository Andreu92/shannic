<script setup lang="ts" generic="T">
import { computed, ref, watch } from "vue";
import { useVirtualizer } from "@tanstack/vue-virtual";
import { IonSpinner } from "@ionic/vue";

const emit = defineEmits(["loadNextPage"]);

const props = withDefaults(
  defineProps<{
    items: T[];
    loading: boolean;
    estimateSize?: number;
    overscan?: number;
    loadingNextPage?: boolean;
    hasMore?: boolean;
  }>(),
  {
    estimateSize: 65,
    overscan: 5,
    loadingNextPage: false,
    hasMore: false,
  },
);

const is_scrollable = ref<boolean>(false);
const vlist_ref = ref<HTMLDivElement | null>(null);
const vlist_wrapper_ref = ref<HTMLDivElement | null>(null);

const row_virtualizer_options = computed(() => {
  return {
    count: props.items.length,
    getScrollElement: () => vlist_ref.value,
    estimateSize: () => props.estimateSize,
    overscan: props.overscan,
  };
});

const row_virtualizer = useVirtualizer(row_virtualizer_options);

watch(
  () => row_virtualizer.value.getVirtualItems(),
  (items) => {
    if (!items.length) return;

    is_scrollable.value =
      row_virtualizer.value.getTotalSize() >
      (vlist_wrapper_ref.value?.clientHeight ?? 0);

    const lastItem = items[items.length - 1];
    if (
      lastItem.index >= props.items.length - 1 &&
      is_scrollable.value &&
      props.hasMore &&
      !props.loadingNextPage
    ) {
      emit("loadNextPage");
    }
  },
);
</script>

<template>
  <div
    ref="vlist_wrapper_ref"
    class="flex col grow"
    :class="loading ? 'center' : ''"
    style="overflow-y: auto"
  >
    <ion-spinner
      v-if="loading"
      name="dots"
      style="width: 50px; height: 50px"
    ></ion-spinner>
    <div
      v-else
      ref="vlist_ref"
      style="padding: 0px 5px; width: 100%; overflow-y: auto"
    >
      <div
        style="width: 100%; position: relative"
        :style="{
          height: `${row_virtualizer.getTotalSize()}px`,
        }"
      >
        <div
          v-for="virtual_row in row_virtualizer.getVirtualItems()"
          :key="virtual_row.index"
          style="position: absolute; top: 0; left: 0; width: 100%"
          :style="{
            height: `${virtual_row.size}px`,
            transform: `translateY(${virtual_row.start}px)`,
          }"
        >
          <slot
            v-if="virtual_row.index < items.length"
            name="item"
            :item="items[virtual_row.index]"
            :index="virtual_row.index"
          ></slot>
        </div>
      </div>
      <div
        v-if="loadingNextPage"
        class="flex center"
        style="width: 100%; height: 50px"
      >
        <ion-spinner
          name="dots"
          style="width: 30px; height: 30px"
        ></ion-spinner>
      </div>
    </div>
  </div>
</template>
