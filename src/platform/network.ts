import type { ListenerCallback, ListenerHandle } from "./types";

export interface NetworkStatus {
  connected: boolean;
}

export const Network = {
  async getStatus(): Promise<NetworkStatus> {
    return { connected: navigator.onLine };
  },

  addListener(
    _event: "networkStatusChange",
    callback: ListenerCallback,
  ): ListenerHandle {
    const onOnline = () => callback({ connected: true });
    const onOffline = () => callback({ connected: false });

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return {
      remove: () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      },
    };
  },
};
