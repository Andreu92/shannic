import type { ListenerCallback, ListenerHandle } from "./types";

export interface AppState {
  isActive: boolean;
}

/**
 * Web fallback for `@capacitor/app` (only the APIs the app uses).
 * App state maps to document visibility.
 */
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
