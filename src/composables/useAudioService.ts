import {
  PlaylistCollection,
  PlaylistDocument,
  AudioCollection,
  AudioDocument,
  Audio,
  Favorite,
} from "@/types";
import { useDatabase } from "@/database";
import { useAudioClient } from "@/composables/useAudioClient";
import { RxAudio } from "@/schemas/audio";

export const useAudioService = () => {
  const FAVORITES_ID = "1";
  const db = useDatabase();
  const audio_client = useAudioClient();

  const playlists: PlaylistCollection = db.playlists;
  const audios: AudioCollection = db.audios;

  const exists = async (id: string): Promise<boolean> => {
    const audio: AudioDocument | null = await audios.findOne(id).exec();
    return !!audio;
  };

  const create = async (id: string) => {
    const audio: Audio = await audio_client.get(id);
    audios.insert({
      ...audio,
      createdAt: Date.now(),
    });
  };

  const get = async (id: string): Promise<AudioDocument | null> => {
    const audio: AudioDocument | null = await audios.findOne(id).exec();

    if (!audio) return null;

    if (Date.now() >= audio.expirationDate) {
      const updated_audio: Audio = await audio_client.get(id);

      await audio.incrementalModify((audioDoc: RxAudio) => {
        audioDoc.title = updated_audio.title;
        audioDoc.author = updated_audio.author;
        audioDoc.artist = updated_audio.artist;
        audioDoc.duration = updated_audio.duration;
        audioDoc.thumbnails = updated_audio.thumbnails;
        audioDoc.url = updated_audio.url;
        audioDoc.expirationDate = updated_audio.expirationDate;
        audioDoc.updatedAt = Date.now();
        return audioDoc;
      });
    }

    return audio;
  };

  const getFavorites = async (): Promise<Favorite[]> => {
    const favorite_playlist: PlaylistDocument | null = await playlists
      .findOne(FAVORITES_ID)
      .exec();

    return favorite_playlist?.audios ?? [];
  };

  const getFavoriteAudios = async (): Promise<AudioDocument[]> => {
    const favorites: Favorite[] = await getFavorites();
    const favorite_audios: Map<string, AudioDocument> = await audios
      .findByIds(favorites.map((o) => o.audioId))
      .exec();
    return Array.from(favorite_audios.values());
  };

  const isFavorite = async (id: string): Promise<boolean> => {
    const favorites: Favorite[] = await getFavorites();
    return favorites.some((o) => o.audioId === id);
  };

  const toggleFavorite = async (id: string) => {
    const isFav = await isFavorite(id);
    if (isFav) removeFavorite(id);
    else addFavorite(id);
  };

  const addFavorite = async (id: string) => {
    const already_exists = await exists(id);
    if (!already_exists) create(id);

    const favorite_playlist: PlaylistDocument | null = await playlists
      .findOne(FAVORITES_ID)
      .exec();
    const favorites = favorite_playlist?.audios || [];

    const maxPos = favorites.length
      ? Math.max(...favorites.map((t) => t.position))
      : -1;

    favorites.push({
      audioId: id,
      position: maxPos + 1,
    });

    favorite_playlist!.incrementalPatch({
      audios: favorites,
    });
  };

  const removeFavorite = async (id: string) => {
    const favorite_playlist = await playlists.findOne(FAVORITES_ID).exec();
    let favorites = favorite_playlist?.audios || [];

    const toRemove = favorites.find((o) => o.audioId === id);
    if (toRemove) {
      const removedPos = toRemove.position;
      favorites = favorites
        .filter((o) => o.audioId !== id)
        .map((o) =>
          o.position > removedPos ? { ...o, position: o.position - 1 } : o
        );
    }

    favorite_playlist!.incrementalPatch({
      audios: favorites,
    });
  };

  const onChangeFavorites = (callback: Function) => {
    playlists
      .findOne(FAVORITES_ID)
      .$.subscribe((favorites) => callback(favorites));
  };

  return {
    get,
    getFavorites,
    getFavoriteAudios,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    onChangeFavorites,
  };
};
