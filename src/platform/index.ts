/**
 * Platform abstraction layer: native capabilities with web fallbacks.
 *
 * Native runtimes (Android via the Tauri gateway, desktop via Tauri
 * plugins / the JVM sidecar) replace these fallbacks in Phase 3.
 */

export type { ListenerCallback, ListenerHandle } from "./types";
export { App, type AppState } from "./app";export {
  Directory,
  Filesystem,
  FileTransfer,
  convertFileSrc,
  type DownloadProgress,
  type FsEntry,
} from "./fs";
export { InAppBrowser, type UrlEvent } from "./inappbrowser";
