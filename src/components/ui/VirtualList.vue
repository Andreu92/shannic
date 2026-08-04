<script setup lang="ts" generic="T">
import { computed, ref, watch } from "vue";
import { useVirtualizer } from "@tanstack/vue-virtual";
import { IonSpinner } from "@ionic/vue";
import { IonFab, IonFabButton } from "@ionic/vue";
import { arrowDown, arrowUp } from "ionicons/icons";

const emit = defineEmits(["loadNextPage"]);

const props = withDefaults(
  defineProps<{
    items: T[];
    loading?: boolean;
    estimateSize?: number;
    overscan?: number;
    loadingNextPage?: boolean;
    hasMore?: boolean;
  }>(),
  {
    loading: false,
    estimateSize: 65,
    overscan: 5,
    loadingNextPage: false,
    hasMore: false,
  },
);

const is_scrollable = ref<boolean>(false);
const vlist_ref = ref<HTMLDivElement | null>(null);
const show_up = ref(false);
const show_down = ref(false);

const row_virtualizer_options = computed(() => {
  return {
    count: props.items.length,
    getScrollElement: () => vlist_ref.value,
    estimateSize: () => props.estimateSize,
    overscan: props.overscan,
  };
});

const row_virtualizer = useVirtualizer(row_virtualizer_options);

const handleScroll = () => {
  if (!vlist_ref.value) return;

  const { scrollTop, scrollHeight, clientHeight } = vlist_ref.value;
  show_up.value = scrollTop > 100;
  show_down.value =
    scrollHeight > clientHeight && scrollTop < scrollHeight - 100;
};

const scrollToTop = () => {
  vlist_ref.value?.scrollTo({ top: 0, behavior: "smooth" });
};

const scrollToBottom = () => {
  vlist_ref.value?.scrollTo({
    top: vlist_ref.value.scrollHeight,
    behavior: "smooth",
  });
};

watch(
  () => row_virtualizer.value.getVirtualItems(),
  (items) => {
    if (!items.length) return;

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

watch(
  () => vlist_ref.value,
  (el) => {
    if (el) {
      el.scrollTop = 0;
      const { scrollHeight, clientHeight } = el;
      is_scrollable.value = scrollHeight > clientHeight;
      handleScroll();
    }
  },
);

watch(
  () => props.items,
  (items) => {
    if (items.length) handleScroll();
  },
  { deep: true },
);
</script>

<template>
  <div
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
      @scroll="handleScroll"
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

  <!-- Scroll to top/bottom buttons -->
  <ion-fab
    v-if="vlist_ref != null"
    slot="fixed"
    horizontal="end"
    vertical="bottom"
  >
    <div class="flex center">
      <Transition name="fade">
        <ion-fab-button v-show="show_up" size="small" @click="scrollToTop">
          <ion-icon :icon="arrowUp" color="dark"></ion-icon>
        </ion-fab-button>
      </Transition>
    </div>
    <div class="flex center">
      <Transition name="fade">
        <ion-fab-button v-show="show_down" size="small" @click="scrollToBottom">
          <ion-icon :icon="arrowDown" color="dark"></ion-icon>
        </ion-fab-button>
      </Transition>
    </div>
  </ion-fab>
</template>
