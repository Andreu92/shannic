import { Network } from "@capacitor/network";
import { defineStore } from "pinia";
import { ref } from "vue";

const useNetworkStore = defineStore("network", () => {
  const is_online = ref<boolean>(true);

  Network.getStatus().then((status) => {
    is_online.value = status.connected;
  });

  Network.addListener("networkStatusChange", (status) => {
    is_online.value = status.connected;
  });

  return { is_online };
});

export default useNetworkStore;