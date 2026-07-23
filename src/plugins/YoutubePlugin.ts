import { registerPlugin } from "@capacitor/core";

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
  url: string;
}

export interface YoutubeAudioItem extends YoutubeSearchItem {
  src: string;
  expires_at: number;
}

export interface YoutubePlugin {
  get(options: { url: string }): Promise<YoutubeAudioItem>;
  getByQuery(options: {
    artist: string;
    title: string;
  }): Promise<YoutubeAudioItem>;
  search(options: {
    query: string;
    only_music?: boolean;
  }): Promise<YoutubeSearch>;
  fetchNextPage(): Promise<YoutubeSearch>;
}

export const youtube_plugin: YoutubePlugin = registerPlugin(
  "YoutubePlugin",
);
