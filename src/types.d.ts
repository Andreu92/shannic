import { RxCollection, RxDocument } from "rxdb";
import { Audio } from "@/schemas/audio";
import { Playlist } from "@/schemas/playlist";

export type AudioDocument = RxDocument<Audio, {}>;
export type AudioCollection = RxCollection<Audio, {}, {}>;

export type PlaylistDocument = RxDocument<Playlist, {}>;
export type PlaylistCollection = RxCollection<Playlist, {}, {}>;

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
  duration: number,
  url: string,
  expirationDate: number
}

export interface SpotifyAuthToken {
  clientId: string,
  accessToken: string,
  accessTokenExpirationTimestampMs: number,
  isAnonymous: boolean
}