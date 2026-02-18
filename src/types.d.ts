import type { RxCollection, RxDatabase, RxDocument } from "rxdb";
import type { RxAudio } from "@/schemas/audio";
import type { RxPlaylist, RxPlaylistMethods } from "@/schemas/playlist";
import type { RxSpotify } from "@/schemas/spotify";

export type AudioDocument = RxDocument<RxAudio>;
export type AudioCollection = RxCollection<RxAudio>;

export type PlaylistDocument = RxDocument<RxPlaylist, RxPlaylistMethods>;
export type PlaylistCollection = RxCollection<RxPlaylist, RxPlaylistMethods>;

export type SpotifyDocument = RxDocument<RxSpotify>;
export type SpotifyCollection = RxCollection<RxSpotify>;

export interface RxShannicCollections {
  audios: AudioCollection;
  playlists: PlaylistCollection;
  spotify: SpotifyCollection;
}

export type RxShannicDatabase = RxDatabase<RxShannicCollections>;

export interface SearchResult {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
}

export interface Audio extends SearchResult {
  duration: number;
  duration_text: string;
  expires_at: number;
  url: string;
  colors: Palette;
}

export interface Palette {
  dark_muted?: ColorTheme;
  dark_vibrant?: ColorTheme;
  light_muted?: ColorTheme;
  light_vibrant?: ColorTheme;
  muted?: ColorTheme;
  vibrant?: ColorTheme;
}

export interface ColorTheme {
  main_color: string;
  title_text_color: string;
  body_text_color: string;
}

export interface PlaylistAudio {
  audio_id: string;
  position: number;
}

export interface PlayerPlaylist {
  id: string;
  current_index: number;
  audios: string[];
}

export interface LanguageMessages {
  lang: Record<string, string>;
  [key: string]: unknown;
}
