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
	items: YoutubeSearchResult[];
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
	duration_text: string;
	url: string;
	expires_at: number;
}

export interface YoutubeClientPlugin {
	get(options: { id: string }): Promise<YoutubeAudio>;
	getByQuery(options: { artist: string; title: string }): Promise<YoutubeAudio>;
	search(options: {
		query: string;
		next_token?: string | null;
		limit?: number;
	}): Promise<YoutubeSearch>;
}

export const youtube_client_plugin: YoutubeClientPlugin = registerPlugin(
	"YoutubeClientPlugin",
);
