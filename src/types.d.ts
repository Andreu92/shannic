import { RxCollection, RxDocument } from "rxdb";
import { RxAudio } from "@/schemas/audio";
import { RxPlaylist } from "@/schemas/playlist";

export type AudioDocument = RxDocument<RxAudio, {}>;
export type AudioCollection = RxCollection<RxAudio, {}, {}>;

export type PlaylistDocument = RxDocument<RxPlaylist, {}>;
export type PlaylistCollection = RxCollection<RxPlaylist, {}, {}>;

export interface RxShannicCollections {
  audios: AudioCollection;
  playlists: PlaylistCollection;
}

export type RxShannicDatabase = RxDatabase<RxShannicCollections>;

export interface Thumbnail {
  url: string,
  height: number,
  width: number
}

export interface SearchResult {
  id: string,
  title: string,
  author: string,
  artist?: string,
  thumbnails: Thumbnail[],
  duration: string,
}

export interface Audio extends SearchResult {
  expirationDate: number,
  duration: number,
  url: string,
  colors?: {
    background: string,
    text: string,
    body: string
  }
}

export interface Favorite {
  audioId: string,
  position: number
}

export interface SpotifyAuthToken {
  clientId: string,
  accessToken: string,
  accessTokenExpirationTimestampMs: number,
  isAnonymous: boolean
}