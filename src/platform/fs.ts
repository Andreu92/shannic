/**
 * Filesystem + downloads layer.
 *
 * Inside the app: `tauri-plugin-fs` (files live in the app data dir,
 * equivalent to Capacitor's `Directory.Data`) plus `tauri-plugin-http`
 * for downloading. Downloads return the absolute local path; playback of
 * local files goes through the asset protocol (`convertFileSrc`).
 * Outside the app: web fallbacks as before.
 */

import { convertFileSrc as tauriConvertFileSrc } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import {
  mkdir,
  readDir,
  remove,
  writeFile,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import { fetch as pluginFetch } from "@tauri-apps/plugin-http";
import { isTauri } from "@tauri-apps/api/core";
import type { ListenerCallback, ListenerHandle } from "./types";

export const Directory = {
  Data: "data",
} as const;

export interface FsEntry {
  name: string;
  type: "file" | "directory";
}

const isAbsolutePath = (path: string): boolean =>
  path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);

const parentDir = (path: string): string => {
  const dir = path.split(/[\\/]/).slice(0, -1).join("/");
  return dir;
};

const joinAppData = async (path: string): Promise<string> => {
  const base = await appDataDir();
  const sep = base.endsWith("/") || base.endsWith("\\") ? "" : "/";
  return `${base}${sep}${path}`;
};

export const Filesystem = {
  /** Resolves a relative path inside the app data dir to an absolute one. */
  async getUri(options: {
    directory: string;
    path: string;
  }): Promise<{ uri: string }> {
    if (!isTauri()) throw new Error("Filesystem requires the native runtime");
    return { uri: await joinAppData(options.path) };
  },

  async deleteFile(options: {
    path: string;
    directory: string;
  }): Promise<void> {
    if (!isTauri()) return;
    await remove(options.path, { baseDir: BaseDirectory.AppData });
  },

  async readdir(options: {
    path: string;
    directory: string;
  }): Promise<{ files: FsEntry[] }> {
    if (!isTauri()) return { files: [] };
    const entries = await readDir(options.path || ".", {
      baseDir: BaseDirectory.AppData,
    });
    return {
      files: entries.map((entry) => ({
        name: entry.name,
        type: entry.isDirectory ? "directory" : "file",
      })),
    };
  },

  async rmdir(options: {
    path: string;
    directory: string;
    recursive?: boolean;
  }): Promise<void> {
    if (!isTauri()) return;
    await remove(options.path || ".", {
      baseDir: BaseDirectory.AppData,
      recursive: options.recursive,
    });
  },
};

export interface DownloadProgress {
  bytes: number;
  contentLength: number;
}

export const FileTransfer = {
  /**
   * Downloads `url` to `path` (absolute or relative to the app data dir)
   * via the HTTP plugin, creating parent directories as needed.
   * Note: byte-level progress events need a Rust command (Phase 3).
   */
  async downloadFile(options: {
    url: string;
    path: string;
    progress?: boolean;
    headers?: Record<string, string>;
  }): Promise<{ path: string }> {
    if (!isTauri()) throw new Error("Downloads require the native runtime");

    const response = await pluginFetch(options.url, {
      headers: options.headers,
    });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const data = new Uint8Array(await response.arrayBuffer());
    const absolute = isAbsolutePath(options.path);

    const dir = parentDir(options.path);
    if (dir) {
      await mkdir(dir, {
        baseDir: absolute ? undefined : BaseDirectory.AppData,
        recursive: true,
      }).catch(() => {
        // Directory may already exist.
      });
    }

    await writeFile(options.path, data, {
      baseDir: absolute ? undefined : BaseDirectory.AppData,
    });

    return {
      path: absolute ? options.path : await joinAppData(options.path),
    };
  },

  addListener(_event: "progress", _callback: ListenerCallback): ListenerHandle {
    return { remove: () => {} };
  },
};

/**
 * Maps a local path to a URL the WebView can load (asset protocol inside
 * the app). Remote URLs and unresolved sources pass through untouched.
 */
export const convertFileSrc = (path: string): string => {
  if (!isTauri()) return path;
  return tauriConvertFileSrc(path);
};
