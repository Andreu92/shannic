export interface YoutubeSearch {
  has_next_page: boolean;
  items: YoutubeSearchItem[];
}

export interface YoutubeSearchItem {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
}

export interface YoutubeAudioItem extends YoutubeSearchItem {
  src: string;
  expires_at: number;
}

export interface YoutubePlugin {
  get(options: { id: string }): Promise<YoutubeAudioItem>;
  getByQuery(options: { artist: string; title: string }): Promise<YoutubeAudioItem>;
  search(options: { query: string; only_music?: boolean }): Promise<YoutubeSearch>;
  fetchNextPage(): Promise<YoutubeSearch>;
}

/**
 * Web fallback for the YouTube extraction plugin.
 *
 * Extraction is done by NewPipeExtractor running on the JVM (Android:
 * in-process via the Tauri gateway; desktop: JVM sidecar), so there is no
 * web implementation. Search/playback is unavailable until Phase 3.
 */
export const youtube_plugin: YoutubePlugin = {
  async get() {
    throw new Error("YouTube extraction requires the native runtime");
  },

  async getByQuery() {
    throw new Error("YouTube extraction requires the native runtime");
  },

  async search() {
    throw new Error("YouTube extraction requires the native runtime");
  },

  async fetchNextPage() {
    throw new Error("YouTube extraction requires the native runtime");
  },
};
