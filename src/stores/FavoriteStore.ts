import { defineStore } from "pinia";
import { Favorite, PlaylistDocument } from "@/types";
import { useAudioService } from "@/composables/useAudioService";
import { ref } from "vue";

export const useFavoritesStore = defineStore("favorites", () => {
  const audio_service = useAudioService();
  const favorites = ref<Favorite[]>([]);

  const init = async () => {
    favorites.value = await audio_service.getFavorites();
  };

  const subscribe = () => {
    audio_service.onChangeFavorites((favs: PlaylistDocument) => {
      favorites.value = [...(favs?.audios || [])];
    });
  };

  const isFavorite = (id: string): boolean => {
    return favorites.value.some((o) => o.audioId === id);
  };

  return {
    favorites,
    init,
    subscribe,
    isFavorite,
  };
});
