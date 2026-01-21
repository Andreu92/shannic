import type { RxCollection, RxDocument } from "rxdb";
import type { RxAudio } from "@/schemas/audio";
import type { RxPlaylist } from "@/schemas/playlist";

export type AudioDocument = RxDocument<RxAudio>;
export type AudioCollection = RxCollection<RxAudio>;

export type PlaylistDocument = RxDocument<RxPlaylist>;
export type PlaylistCollection = RxCollection<RxPlaylist>;

export interface RxShannicCollections {
	audios: AudioCollection;
	playlists: PlaylistCollection;
}

export type RxShannicDatabase = RxDatabase<RxShannicCollections>;

export interface Thumbnail {
	url: string;
	height: number;
	width: number;
}

export interface SearchResult {
	id: string;
	title: string;
	author: string;
	artist?: string;
	thumbnails: Thumbnail[];
	duration: string;
}

export interface Audio extends SearchResult {
	duration: number;
	expirationDate: number;
	artist: string;
	url: string;
	colors?: {
		background: string;
		text: string;
		body: string;
	};
}

export interface PlaylistAudio {
	audioId: string;
	position: number;
}

export interface SpotifyAuthToken {
	clientId: string;
	accessToken: string;
	accessTokenExpirationTimestampMs: number;
	isAnonymous: boolean;
}
