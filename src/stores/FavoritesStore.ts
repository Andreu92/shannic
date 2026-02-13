import { defineStore } from "pinia";
import { ref } from "vue";
import { FAVORITES_PLAYLIST_ID } from "@/constants";
import type { RxAudio } from "@/schemas/audio";
import useAudioService from "@/services/AudioService";
import usePlaylistService from "@/services/PlaylistService";
import type { AudioDocument, PlaylistAudio, PlaylistDocument } from "@/types";

const useFavoritesStore = defineStore("favorites", () => {
	const playlist_service = usePlaylistService();
	const audio_service = useAudioService();

	const favorites = ref<PlaylistAudio[]>([]);
	const audios = ref<RxAudio[]>([]);

	const init = async () => {
		const playlist: PlaylistDocument = await playlist_service.getPlaylist(
			FAVORITES_PLAYLIST_ID,
		);
		favorites.value = playlist.audios ?? [];

		const audio_document_array: AudioDocument[] = (
			await audio_service.getAudiosByIds(
				playlist.audios?.map((a: PlaylistAudio) => a.audio_id) ?? [],
			)
		).sort((a, b) => sortByPosition(a, b));

		audios.value = audio_document_array.map((d) => d.toMutableJSON());
	};

	const toggleFavorite = async (id: string) => {
		const is_fav = isFavorite(id);
		is_fav ? await deleteFavorite(id) : await addFavorite(id);
		return !is_fav;
	};

	const addFavorite = async (id: string, callback?: () => void) => {
		const new_favorite: PlaylistAudio =
			await playlist_service.addAudioToPlaylist(FAVORITES_PLAYLIST_ID, id);
		favorites.value.push(new_favorite);
		audio_service.getAudio(id).then((a: AudioDocument) => {
			audios.value.push(a.toMutableJSON());
			audios.value.sort((a, b) => sortByPosition(a, b));
			if (callback) callback();
		});
	};

	const deleteFavorite = async (id: string) => {
		await playlist_service.removeAudioFromPlaylist(FAVORITES_PLAYLIST_ID, id);
		favorites.value = favorites.value
			.filter((o) => o.audio_id !== id)
			.map((o, i) => ({ ...o, position: i }));
		audios.value = [...audios.value.filter((o) => o.id !== id)];
	};

	const isFavorite = (id: string): boolean => {
		return favorites.value.some((o) => o.audio_id === id);
	};

	const sortByPosition = (a: RxAudio, b: RxAudio) => {
		const p1 = favorites.value.find((f) => f.audio_id === a.id)?.position ?? 0;
		const p2 = favorites.value.find((f) => f.audio_id === b.id)?.position ?? 0;
		return p1 - p2;
	};

	const reorder = async (from: number, to: number) => {
		const audio = audios.value.splice(from, 1)[0];
		audios.value.splice(to, 0, audio);

		const new_favorites: PlaylistAudio[] = audios.value.map(
			({ id }, position) => ({
				audio_id: id,
				position,
			}),
		);

		favorites.value = new_favorites;

		await playlist_service.updatePlaylistAudios(
			FAVORITES_PLAYLIST_ID,
			new_favorites,
		);
	};

	return {
		init,
		favorites,
		audios,
		toggleFavorite,
		isFavorite,
		addFavorite,
		deleteFavorite,
		reorder,
	};
});

export default useFavoritesStore;
