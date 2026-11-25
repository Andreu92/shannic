import type { ListenerCallback, ListenerHandle } from "./types";

export interface AppState {
  isActive: boolean;
}

export const App = {
  addListener(
    _event: "appStateChange",
    callback: ListenerCallback,
  ): ListenerHandle {
    const handler = () =>
      callback({ isActive: document.visibilityState === "visible" });

    document.addEventListener("visibilitychange", handler);

    return {
      remove: () => document.removeEventListener("visibilitychange", handler),
    };
  },
};
