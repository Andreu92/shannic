import { defineStore } from "pinia";
import { FAVORITES_PLAYLIST_ID } from "@/constants";
import useAudioService from "@/services/AudioService";
import usePlaylistService from "@/services/PlaylistService";
import type { AudioDocument, PlaylistDocument } from "@/types";
import { ref } from "vue";
import { useDatabase } from "@/database";
import { RxAudio } from "@/schemas/audio";
import { DeepReadonlyObject, RxChangeEvent } from "rxdb";
import { useAudioItem } from "@/composables/useAudioItem";
import { player_plugin } from "@/plugins/PlayerPlugin";

const useFavoritesStore = defineStore("favorites", () => {
  const db = useDatabase();

  const audio_item = useAudioItem();

  const playlist_service = usePlaylistService();
  const audio_service = useAudioService();

  const favorites = ref<string[]>([]);
  const audios = ref<DeepReadonlyObject<RxAudio>[]>([]);

  // Subscribe to changes in the favorites playlist (keep the refs updated)
  const init = () => {
    playlist_service
      .get(FAVORITES_PLAYLIST_ID)
      .then((favorites_playlist: PlaylistDocument) => {
        favorites_playlist.$.subscribe((playlist: PlaylistDocument) => {
          const favorites_id_list =
            playlist.audios?.map((a) => a.audio_id) ?? [];

          favorites.value = favorites_id_list;

          const positions_map = new Map(
            playlist.audios?.map((f) => [f.audio_id, f.position]),
          );

          audio_service
            .getList(favorites_id_list)
            .then((audio_documents: AudioDocument[]) => {
              const audios_as_json: DeepReadonlyObject<RxAudio>[] =
                audio_documents.map((a) => a.toJSON());

              audios.value = audios_as_json.sort((a, b) => {
                const p1 = positions_map.get(a.id) ?? 0;
                const p2 = positions_map.get(b.id) ?? 0;
                return p1 - p2;
              });
            });
        });
      });

    db.audios.$.subscribe((audio: RxChangeEvent<RxAudio>) => {
      const index = audios.value.findIndex(
        (a: RxAudio) => a.id == audio.documentId,
      );
      if (index == -1) return;
      audios.value[index] = audio.documentData;
    });
  };

  const toggle = (id: string) => {
    const is_fav = isFavorite(id);
    if (is_fav) remove(id);
    else add(id);
    return !is_fav;
  };

  const add = async (id: string) => {
    const item = await audio_service.get(id);
    if (item == null) return;

    playlist_service.addAudio(FAVORITES_PLAYLIST_ID, id).then(() => {
      audio_item.storeThumbnail(item);
    });
  };

  const remove = async (id: string) => {
    const item = await audio_service.get(id);
    if (item == null) return;

    playlist_service.removeAudio(FAVORITES_PLAYLIST_ID, id).then(async () => {
      const { is_in_queue } = await player_plugin.isInQueue({ id });
      if (!is_in_queue) {
        audio_item.deleteThumbnail(id);
        audio_item.deleteFile(item);
        audio_service.remove(id);
      }
    });
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
