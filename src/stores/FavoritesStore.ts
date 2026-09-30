import { defineStore } from "pinia";
import { FAVORITES_PLAYLIST_ID } from "@/constants";
import useAudioService from "@/services/AudioService";
import usePlaylistService from "@/services/PlaylistService";
import { computed, ref } from "vue";
import { player_plugin } from "@/plugins/PlayerPlugin";
import { PlaylistAudio } from "@/types";

const useFavoritesStore = defineStore("favorites", () => {
  const playlist_service = usePlaylistService();
  const audio_service = useAudioService();

  const favorite_audios = ref<PlaylistAudio[]>([]);
  const favorites = computed(
    () => favorite_audios.value.map((a) => a.audio_id) ?? [],
  );

  const init = async () => {
    const favorites_playlist = await playlist_service.get(
      FAVORITES_PLAYLIST_ID,
    );

    favorites_playlist.$.subscribe(async (playlist) => {
      favorite_audios.value = [ ...playlist.audios ?? [] ];
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
      item.downloadThumbnail();
    });
  };

  const remove = async (id: string) => {
    const item = await audio_service.get(id);
    if (item == null) return;

    await playlist_service.removeAudio(FAVORITES_PLAYLIST_ID, id);

    const { is_in_queue } = await player_plugin.isInQueue({ id });
    if (!is_in_queue) {
      item.deleteThumbnail();
      item.deleteFile();
      audio_service.remove(id);
    }
  };

  const isFavorite = (id: string): boolean => {
    return favorites.value.includes(id);
  };

  return {
    favorite_audios,
    init,
    add,
    remove,
    toggle,
    isFavorite,
  };
});

export default useFavoritesStore;
