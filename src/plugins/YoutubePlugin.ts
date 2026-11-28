import { invoke } from "@tauri-apps/api/core";

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

interface YoutubePlugin {
  get(options: { id: string }): Promise<YoutubeAudioItem>;
  getByQuery(options: { artist: string; title: string }): Promise<YoutubeAudioItem>;
  search(options: { query: string; only_music?: boolean }): Promise<YoutubeSearch>;
  fetchNextPage(): Promise<YoutubeSearch>;
}

export const youtube_plugin: YoutubePlugin = {
  get(options) {
    return invoke<YoutubeAudioItem>(`get`, { payload: options });
  },

  getByQuery(options) {
    return invoke<YoutubeAudioItem>(`get_by_query`, { payload: options });
  },

  search(options) {
    return invoke<YoutubeSearch>(`search`, { payload: options });
  },

  fetchNextPage() {
    return invoke<YoutubeSearch>(`fetch_next_page`, { payload: {} });
  },
};