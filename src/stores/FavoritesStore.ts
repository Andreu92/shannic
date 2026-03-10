import { defineStore } from "pinia";
import { ref } from "vue";
import { useDatabase } from "@/database";
import { FAVORITES_PLAYLIST_ID } from "@/constants";
import type { RxAudio } from "@/schemas/audio";
import useAudioService from "@/services/AudioService";
import usePlaylistService from "@/services/PlaylistService";
import type { AudioDocument, PlaylistAudio, PlaylistDocument } from "@/types";

const useFavoritesStore = defineStore("favorites", () => {
  const db = useDatabase();

  const playlist_service = usePlaylistService();
  const audio_service = useAudioService();

  const favorites = ref<PlaylistAudio[]>([]);
  const audios = ref<RxAudio[]>([]);

  const init = async () => {
    const playlist: PlaylistDocument = await playlist_service.getPlaylist(
      FAVORITES_PLAYLIST_ID,
    );
    favorites.value = playlist.audios ?? [];

    const ids = playlist.audios?.map((a: PlaylistAudio) => a.audio_id) ?? [];

    const audio_documents = await audio_service.getAudiosByIds(ids);

    const positionsMap = new Map(
      favorites.value.map((f) => [f.audio_id, f.position]),
    );

    const sorted_audios = audio_documents
      .map((d) => d.toMutableJSON())
      .sort((a, b) => {
        const p1 = positionsMap.get(a.id) ?? 0;
        const p2 = positionsMap.get(b.id) ?? 0;
        return p1 - p2;
      });

    audios.value = sorted_audios;

    db.audios.update$.subscribe((audioDoc) => {
      const index = audios.value.findIndex((a) => a.id === audioDoc.documentId);
      if (index !== -1) {
        audios.value[index] = { ...audioDoc.documentData };
      }
    });
  };

  const toggleFavorite = async (id: string) => {
    const is_fav = isFavorite(id);
    if (is_fav) await deleteFavorite(id);
    else await addFavorite(id);
    return !is_fav;
  };

  const addFavorite = async (id: string) => {
    const new_favorite: PlaylistAudio =
      await playlist_service.addAudioToPlaylist(FAVORITES_PLAYLIST_ID, id);

    favorites.value.push(new_favorite);

    const audio: AudioDocument = await audio_service.getAudio(id);
    audios.value.push(audio.toMutableJSON());

    const positionsMap = new Map(
      favorites.value.map((f) => [f.audio_id, f.position]),
    );
    audios.value.sort((a, b) => {
      const p1 = positionsMap.get(a.id) ?? 0;
      const p2 = positionsMap.get(b.id) ?? 0;
      return p1 - p2;
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
