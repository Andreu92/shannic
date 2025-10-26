import {
  Audio,
  PlaylistCollection,
  PlaylistDocument,
  AudioCollection,
  AudioDocument,
} from "@/types";
import { useDatabase } from "@/database";
import { useAudioClient } from "@/composables/useAudioClient";

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

      await audio.incrementalModify((audioDoc) => {
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

  const getFavorites = async (query?: string): Promise<AudioDocument[]> => {
    const favorite_playlist: PlaylistDocument | null = await playlists
      .findOne(FAVORITES_ID)
      .exec();

    if (!favorite_playlist) return [];

    const favorite_ids = favorite_playlist?.audios || [];

    const selector: any = {
      id: { $in: favorite_ids.map((o) => o.audioId) },
    };

    if (query && query.trim() !== "") {
      selector.title = { $regex: query, $options: "i" };
      selector.artist = { $regex: query, $options: "i" };
    }

    const favorites: AudioDocument[] = await audios.find({ selector }).exec();

    return favorites;
  };

  const isFavorite = async (id: string): Promise<boolean> => {
    const favorite_playlist: PlaylistDocument | null = await playlists
      .findOne(FAVORITES_ID)
      .exec();

    if (!favorite_playlist) return false;

    const favorites = favorite_playlist?.audios || [];
    return favorites.some((o) => o.audioId === id);
  };

  const addFavorite = async (id: string) => {
    const already_exists = await exists(id);
    if (!already_exists) {
      create(id);
    }

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
    isFavorite,
    addFavorite,
    removeFavorite,
    onChangeFavorites,
  };
};
