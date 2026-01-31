import { defineStore } from "pinia";
import { ref } from "vue";
import { useAudioService } from "@/composables/useAudioService";
import { usePlaylistService } from "@/composables/usePlaylistService";
import { FAVORITES_PLAYLIST_ID } from "@/constants";
import { player_plugin } from "@/plugins/PlayerPlugin";
import type { RxAudio } from "@/schemas/audio";
import { usePlayerStore } from "@/stores/PlayerStore";
import type { AudioDocument, PlaylistAudio, PlaylistDocument } from "@/types";

export const useFavoritesStore = defineStore("favorites", () => {
	const playlist_service = usePlaylistService();
	const audio_service = useAudioService();
	const player_store = usePlayerStore();

	const favorites = ref<PlaylistAudio[]>([]);
	const audios = ref<RxAudio[]>([]);

	const init = async () => {
		const playlist: PlaylistDocument = await playlist_service.getPlaylist(
			FAVORITES_PLAYLIST_ID,
		);
		favorites.value = playlist.audios ?? [];

		const audio_document_array: AudioDocument[] = (
			await audio_service.getAudiosByIds(
				playlist.audios?.map((a: PlaylistAudio) => a.audioId) ?? [],
			)
		).sort((a, b) => sortByPosition(a, b));

		audios.value = audio_document_array.map((d) => d.toMutableJSON());
	};

	const toggleFavorite = async (id: string) => {
		const is_fav = isFavorite(id);
		is_fav ? await deleteFavorite(id) : await addFavorite(id);
		if (player_store.audio) player_plugin.toggleFavorite({ favorite: !is_fav });
	};

	const addFavorite = async (id: string) => {
		const new_favorite: PlaylistAudio =
			await playlist_service.addAudioToPlaylist(FAVORITES_PLAYLIST_ID, id);
		favorites.value.push(new_favorite);
		audio_service.getAudio(id).then((a: AudioDocument) => {
			audios.value.push(a.toMutableJSON());
			audios.value.sort((a, b) => sortByPosition(a, b));
		});
	};

	const deleteFavorite = async (id: string) => {
		await playlist_service.removeAudioFromPlaylist(FAVORITES_PLAYLIST_ID, id);
		favorites.value = favorites.value
			.filter((o) => o.audioId !== id)
			.map((o, i) => ({ ...o, position: i }));
		audios.value = [...audios.value.filter((o) => o.id !== id)];
	};

	const isFavorite = (id: string): boolean => {
		return favorites.value.some((o) => o.audioId === id);
	};

	const sortByPosition = (a: RxAudio, b: RxAudio) => {
		const p1 = favorites.value.find((f) => f.audioId === a.id)?.position ?? 0;
		const p2 = favorites.value.find((f) => f.audioId === b.id)?.position ?? 0;
		return p1 - p2;
	};

	const reorder = async (from: number, to: number) => {
		const audio = audios.value.splice(from, 1)[0];
		audios.value.splice(to, 0, audio);

		const new_favorites: PlaylistAudio[] = audios.value.map(
			({ id }, position) => ({
				audioId: id,
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
		deleteFavorite,
		reorder,
	};
});
