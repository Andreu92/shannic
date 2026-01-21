import {
	AudioClient,
	type Audio as AudioClientAudio,
	type Search,
} from "@shannic/audio-client";
import type { Audio, SearchResult } from "@/types";

export const useAudioClient = () => {
	let next_token: string | null | undefined = null;

	const get = async (id: string): Promise<Audio> => {
		const audio_client_audio: AudioClientAudio = await AudioClient.get({
			id: id,
		});
		const audio: Audio = {
			...audio_client_audio,
			artist: audio_client_audio.author,
		};
		sanitize(audio);
		return audio;
	};

	const search = async (query: string): Promise<SearchResult[]> => {
		const search_data: Search = await AudioClient.search({
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
