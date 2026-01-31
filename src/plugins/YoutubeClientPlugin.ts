import { registerPlugin } from "@capacitor/core";

interface YoutubeSearchResult {
	id: string;
	title: string;
	author: string;
	thumbnail: string;
	duration: string;
}

export interface YoutubeSearch {
	next_token: string | null;
	results: YoutubeSearchResult[];
}

export interface YoutubeAudio {
	id: string;
	title: string;
	author: string;
	thumbnail: {
		url: string;
		base64: string;
	};
	duration: number;
	durationText: string;
	url: string;
	expirationDate: number;
	color: string;
}

export interface YoutubeClientPlugin {
	get(options: { id: string }): Promise<YoutubeAudio>;
	search(options: {
		query: string;
		next_token?: string | null;
	}): Promise<YoutubeSearch>;
}

export const youtube_client_plugin: YoutubeClientPlugin =
	registerPlugin("YoutubeClient");
