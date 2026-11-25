/**
 * Web fallbacks for `@capacitor/filesystem` and `@capacitor/file-transfer`.
 *
 * Only the API surface the app uses is mirrored. Downloads require the
 * native runtime (Tauri FS + HTTP plugin in Phase 3) and throw here.
 */

import type { ListenerCallback, ListenerHandle } from "./types";

export const Directory = {
  Data: "data",
} as const;

export interface FsEntry {
  name: string;
  type: "file" | "directory";
}

export const Filesystem = {
  async getUri(_options: {
    directory: string;
    path: string;
  }): Promise<{ uri: string }> {
    throw new Error("Filesystem requires the native runtime");
  },

  async deleteFile(_options: {
    path: string;
    directory: string;
  }): Promise<void> {},

  async readdir(_options: {
    path: string;
    directory: string;
  }): Promise<{ files: FsEntry[] }> {
    return { files: [] };
  },

  async rmdir(_options: {
    path: string;
    directory: string;
    recursive?: boolean;
  }): Promise<void> {},
};

export interface DownloadProgress {
  bytes: number;
  contentLength: number;
}

export const FileTransfer = {
  async downloadFile(_options: {
    url: string;
    path: string;
    progress?: boolean;
    headers?: Record<string, string>;
  }): Promise<{ path: string }> {
    throw new Error("Downloads require the native runtime");
  },

  addListener(
    _event: "progress",
    _callback: ListenerCallback,
  ): ListenerHandle {
    return { remove: () => {} };
  },
};

/**
 * Web fallback for `Capacitor.convertFileSrc`. Native runtimes rewrite a
 * local path to a servable URL; the web fallback returns it as-is.
 */
export const convertFileSrc = (path: string): string => path;
