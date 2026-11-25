/**
 * Web fallback for `@capgo/inappbrowser`.
 *
 * `open` maps to a regular browser tab/window. The in-app WebView flow used
 * for Spotify token extraction (`openWebView` + script injection) requires
 * the native runtime and throws here.
 */

import type { ListenerCallback, ListenerHandle } from "./types";

export interface UrlEvent {
  url: string;
}

export const InAppBrowser = {
  async open(options: { url: string }): Promise<void> {
    window.open(options.url, "_blank");
  },

  async openWebView(_options: Record<string, unknown>): Promise<void> {
    throw new Error("In-app browser requires the native runtime");
  },

  async setUrl(_options: { url: string }): Promise<void> {},

  async hide(): Promise<void> {},

  async close(): Promise<void> {},

  async executeScript(_options: { code: string }): Promise<void> {},

  async getCookies(_options: { url: string }): Promise<Record<string, string>> {
    return {};
  },

  async clearCache(): Promise<void> {},

  async clearAllCookies(): Promise<void> {},

  addListener(_event: string, _callback: ListenerCallback): ListenerHandle {
    return { remove: () => {} };
  },

  removeAllListeners(): void {},
};
