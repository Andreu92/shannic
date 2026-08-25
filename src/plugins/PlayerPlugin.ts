import { type PluginListenerHandle, registerPlugin } from "@capacitor/core";
import { type YoutubeAudioItem } from "./YoutubePlugin";

export interface PlayerAudio {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  src: string;
}

export interface PlayerPlugin {
  play(options: {
    audio_items: PlayerAudio[];
    shuffle: boolean;
  }): Promise<void>;
  seekTo(options: { position: number }): Promise<void>;
  resume(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  skipNext(): Promise<void>;
  skipPrevious(): Promise<void>;
  setRepeat(options: { repeating: boolean }): Promise<void>;
  setFavorite(options: { favorite: boolean; }): Promise<void>;
  getCurrentPosition(): Promise<{ position: number }>;
  isInQueue(options: { id: string }): Promise<{ is_in_queue: boolean }>;
  hasNext(): Promise<{ has_next: boolean }>;
  clearCache(): Promise<void>;
  addListener(
    event: string,
    callback: (
      data:
        | { position: number }
        | { repeating: boolean }
        | { favorite: boolean }
        | { id: string, index: number }
        | { id: string; src: string; expires_at: number }
        | { item: YoutubeAudioItem }
        | { code: number, name: string, message: string}
    ) => void,
  ): Promise<PluginListenerHandle>;
}

export const player_plugin: PlayerPlugin = registerPlugin("PlayerPlugin");
