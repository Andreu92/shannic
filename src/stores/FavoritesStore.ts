import { defineStore } from "pinia";
import { FAVORITES_PLAYLIST_ID } from "@/constants";
import useAudioService from "@/services/AudioService";
import usePlaylistService from "@/services/PlaylistService";
import type { AudioDocument, PlaylistDocument } from "@/types";
import { ref } from "vue";

const useFavoritesStore = defineStore("favorites", () => {
  const playlist_service = usePlaylistService();
  const audio_service = useAudioService();

  let favorites_playlist: PlaylistDocument;

  const favorites = ref<string[]>([]);
  const audios = ref<AudioDocument[]>([]);

  const init = async () => {
    favorites_playlist = await playlist_service.get(FAVORITES_PLAYLIST_ID);

    favorites_playlist.$.subscribe(async (playlist: PlaylistDocument) => {
      const favorites_id_list = playlist.audios?.map((a) => a.audio_id) ?? [];
      favorites.value = favorites_id_list;

      const audio_documents: AudioDocument[] =
        await audio_service.getAudiosByIds(favorites_id_list);

      const positionsMap = new Map(
        favorites_playlist.audios?.map((f) => [f.audio_id, f.position]),
      );

      audios.value = audio_documents.sort((a, b) => {
        const p1 = positionsMap.get(a.id) ?? 0;
        const p2 = positionsMap.get(b.id) ?? 0;
        return p1 - p2;
      });
    });

    /*db.audios
      .findByIds(ids).$.subscribe;*/
  };

  const toggle = (id: string) => {
    const is_fav = isFavorite(id);
    if (is_fav) remove(id);
    else add(id);
    return !is_fav;
  };

  const add = (id: string) => {
    playlist_service.addAudio(FAVORITES_PLAYLIST_ID, id);
  };

  const remove = (id: string) => {
    playlist_service.removeAudio(FAVORITES_PLAYLIST_ID, id);
  };

  const isFavorite = (id: string): boolean => {
    return favorites.value.includes(id);
  };

  return {
    audios,
    init,
    add,
    remove,
    toggle,
    isFavorite,
  };
});

export default useFavoritesStore;
