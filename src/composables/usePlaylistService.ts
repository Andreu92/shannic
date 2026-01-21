import { useDatabase } from "@/database";
import type {
	PlaylistAudio,
	PlaylistCollection,
	PlaylistDocument,
} from "@/types";

export const usePlaylistService = () => {
	const db = useDatabase();
	const playlist_collection: PlaylistCollection = db.playlists;

	const getPlaylist = async (id: string): Promise<PlaylistDocument> => {
		const playlist: PlaylistDocument | null = await playlist_collection
			.findOne(id)
			.exec();

		if (!playlist) throw Error("Playlist not found");

		return playlist;
	};

	const updatePlaylistAudios = async (
		playlist_id: string,
		playlist_audios: PlaylistAudio[],
	) => {
		const playlist = await getPlaylist(playlist_id);

		await playlist.incrementalPatch({
			audios: playlist_audios,
		});
	};

	const isAudioInPlaylist = async (
		playlist_id: string,
		audio_id: string,
	): Promise<boolean> => {
		const playlist: PlaylistDocument | null = await getPlaylist(playlist_id);
		return playlist?.audios?.some((o) => o.audioId === audio_id) ?? false;
	};

	const toggleAudioToPlaylist = async (
		playlist_id: string,
		audio_id: string,
	) => {
		const is_in = await isAudioInPlaylist(playlist_id, audio_id);
		if (is_in) removeAudioFromPlaylist(playlist_id, audio_id);
		else addAudioToPlaylist(playlist_id, audio_id);
	};

	const addAudioToPlaylist = async (
		playlist_id: string,
		audio_id: string,
	): Promise<PlaylistAudio> => {
		const playlist = await getPlaylist(playlist_id);

		const playlist_audios: PlaylistAudio[] = playlist.audios ?? [];
		const position = playlist_audios.length
			? Math.max(...playlist_audios.map((t) => t.position)) + 1
			: 0;

		const new_playlist_audio: PlaylistAudio = {
			audioId: audio_id,
			position,
		};

		playlist_audios.push(new_playlist_audio);

		playlist.incrementalPatch({
			audios: playlist_audios,
		});

		return new_playlist_audio;
	};

	const removeAudioFromPlaylist = async (
		playlist_id: string,
		audio_id: string,
	) => {
		const playlist = await getPlaylist(playlist_id);

		let playlist_audios = playlist.audios ?? [];

		const toRemove = playlist_audios.find((o) => o.audioId === audio_id);
		if (toRemove) {
			playlist_audios = playlist_audios
				.filter((o) => o.audioId !== audio_id)
				.map((o, i) => ({ ...o, position: i }));
		}

		playlist.incrementalPatch({
			audios: playlist_audios,
		});
	};

	return {
		getPlaylist,
		updatePlaylistAudios,
		isAudioInPlaylist,
		addAudioToPlaylist,
		removeAudioFromPlaylist,
		toggleAudioToPlaylist,
	};
};
