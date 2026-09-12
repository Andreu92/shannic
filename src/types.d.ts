import type { RxCollection, RxDatabase, RxDocument } from "rxdb";
import type { RxAudio, RxAudioMethods } from "@/schemas/audio";
import type { RxPlaylist, RxPlaylistMethods } from "@/schemas/playlist";

export type AudioDocument = RxDocument<RxAudio, RxAudioMethods>;
export type AudioCollection = RxCollection<RxAudio, RxAudioMethods>;

export type PlaylistDocument = RxDocument<RxPlaylist, RxPlaylistMethods>;
export type PlaylistCollection = RxCollection<RxPlaylist, RxPlaylistMethods>;

export interface RxShannicCollections {
  audios: AudioCollection;
  playlists: PlaylistCollection;
}

export type RxShannicDatabase = RxDatabase<RxShannicCollections>;

export interface AudioItem {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  src: string;
  expires_at: number;
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

export interface AccessToken {
  client_id?: string;
  access_token: string;
  expires_at: number;
}

export interface SpotifyAccessToken {
  clientId: string;
  accessToken: string;
  accessTokenExpirationTimestampMs: number;
  isAnonymous: boolean;
}

export interface SpotifyClientToken {
  response_type: string;
  granted_token: {
    token: string;
    expires_after_seconds: number;
    refresh_after_seconds: number;
    domains: {
      domain: string;
    }[];
  };
}