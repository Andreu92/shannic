import type { RxCollection, RxDocument } from "rxdb";
import type { RxAudio } from "@/schemas/audio";
import type { RxPlaylist, RxPlaylistMethods } from "@/schemas/playlist";

export type AudioDocument = RxDocument<RxAudio>;
export type AudioCollection = RxCollection<RxAudio>;

export type PlaylistDocument = RxDocument<RxPlaylist, RxPlaylistMethods>;
export type PlaylistCollection = RxCollection<RxPlaylist, RxPlaylistMethods>;

export interface RxShannicCollections {
	audios: AudioCollection;
	playlists: PlaylistCollection;
}

export type RxShannicDatabase = RxDatabase<RxShannicCollections>;

export interface SearchResult {
	id: string;
	title: string;
	author: string;
	artist?: string;
	thumbnail: string;
	duration: string;
}

export interface Audio {
	id: string;
	title: string;
	author: string;
	artist: string;
	duration: number;
	durationText: string;
	expirationDate: number;
	thumbnail: {
		url: string;
		base64?: string;
	}
	url: string;
	colors: {
		background: string;
		text: string;
	}
}

export interface PlaylistAudio {
	audioId: string;
	position: number;
}

export interface PlayerPlaylist {
	id: string;
	currentIndex: number;
	audios: string[];
}

export interface SpotifyAuthToken {
	clientId: string;
	accessToken: string;
	accessTokenExpirationTimestampMs: number;
	isAnonymous: boolean;
}
