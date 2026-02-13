import { Vibrant } from "node-vibrant/browser";
import {
	type YoutubeAudio,
	type YoutubeSearch,
	youtube_client_plugin,
} from "@/plugins/YoutubeClientPlugin";
import type { Audio, Palette } from "@/types";

const useYoutubeClient = () => {
	const get = async (id: string): Promise<Audio> => {
		const audio_client_audio: YoutubeAudio = await youtube_client_plugin.get({
			id: id,
		});

		return await buildAudio(audio_client_audio);
	};

	const getByQuery = async (artist: string, title: string): Promise<Audio> => {
		const audio_client_audio: YoutubeAudio =
			await youtube_client_plugin.getByQuery({
				artist: artist,
				title: title,
			});

		return await buildAudio(audio_client_audio);
	};

	const buildAudio = async (
		audio_client_audio: YoutubeAudio,
	): Promise<Audio> => {
		const palette = await Vibrant.from(
			audio_client_audio.thumbnail.base64,
		).getPalette();

		const audio: Audio = {
			...audio_client_audio,
			thumbnail: audio_client_audio.thumbnail.url,
			colors: getFormattedColors(palette),
		};

		return audio;
	};

	const search = async (
		query: string,
		next_token: string | null = null,
		limit?: number,
	): Promise<YoutubeSearch> => {
		const search_data: YoutubeSearch = await youtube_client_plugin.search({
			query: query,
			next_token: next_token,
			limit: limit,
		});

		return search_data;
	};

	const getFormattedColors = (
		palette: Awaited<ReturnType<typeof Vibrant.prototype.getPalette>>,
	): Palette => {
		const colors: Palette = {} as Palette;

		Object.keys(palette).forEach((key) => {
			const item = palette[key];
			const snake_case_key = key
				.replace(/([a-z])([A-Z])/g, "$1_$2")
				.toLowerCase() as keyof Palette;
			if (item) {
				colors[snake_case_key] = {
					main_color: item.hex,
					title_text_color: item.titleTextColor,
					body_text_color: item.bodyTextColor,
				};
			}
		});

		return colors;
	};

	return { search, get, getByQuery };
};

export default useYoutubeClient;
