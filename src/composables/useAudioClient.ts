import { Vibrant } from "node-vibrant/browser";
import {
	type YoutubeAudio,
	type YoutubeSearch,
	youtube_client_plugin,
} from "@/plugins/YoutubeClientPlugin";
import type { Audio, SearchResult } from "@/types";

export const useAudioClient = () => {
	let next_token: string | null | undefined = null;

	const get = async (id: string): Promise<Audio> => {
		const audio_client_audio: YoutubeAudio = await youtube_client_plugin.get({
			id: id,
		});

		const palette = await Vibrant.from(
			audio_client_audio.thumbnail.base64,
		).getPalette();

		console.log(palette);

		const audio: Audio = {
			...audio_client_audio,
			artist: audio_client_audio.author,
			colors: {
				background: palette.Muted?.hex || palette.Vibrant?.hex || "#000000",
				text: palette.Muted?.titleTextColor || palette.Vibrant?.titleTextColor || "#FFFFFF",
			},
		};
		sanitize(audio);
		return audio;
	};

	const search = async (query: string): Promise<SearchResult[]> => {
		const search_data: YoutubeSearch = await youtube_client_plugin.search({
			query: query,
			next_token: next_token,
		});
		const search_results: SearchResult[] = search_data.results;
		for (const result of search_results) {
			result.artist = result.author;
			sanitize(result);
		}
		next_token = search_data.next_token;
		return search_results;
	};

	const clearToken = (): void => {
		next_token = null;
	};

	const sanitize = (result: SearchResult | Audio) => {
		const regex = /^(.+?)\s*-\s*(.+)$/;
		const match = result.title.match(regex);

		if (match) {
			result.title = match[2].trim();
			result.artist = match[1].trim();
		}
	};

	return { search, get, clearToken };
};
