import { useDatabase } from "@/database";
import type {
  PlaylistAudio,
  PlaylistCollection,
  PlaylistDocument,
} from "@/types";

const usePlaylistService = () => {
  const db = useDatabase();
  const playlist_collection: PlaylistCollection = db.playlists;

  const get = async (id: string): Promise<PlaylistDocument> => {
    const playlist: PlaylistDocument | null = await playlist_collection
      .findOne(id)
      .exec();

    if (!playlist) throw Error("Playlist not found");

    return playlist;
  };

  const updateAudios = async (
    playlist_id: string,
    playlist_audios: PlaylistAudio[],
  ) => {
    const playlist = await get(playlist_id);

    await playlist.incrementalPatch({
      audios: playlist_audios,
    });
  };

  const isAudioIn = async (
    playlist_id: string,
    audio_id: string,
  ): Promise<boolean> => {
    const playlist: PlaylistDocument | null = await get(playlist_id);
    return playlist?.audios?.some((o) => o.audio_id === audio_id) ?? false;
  };

  const addAudio = async (playlist_id: string, audio_id: string) => {
    const playlist = await get(playlist_id);

    const playlist_audios: PlaylistAudio[] = playlist.audios ?? [];
    
    const position = playlist_audios.length
      ? Math.max(...playlist_audios.map((t) => t.position)) + 1
      : 0;
  
    const new_playlist_audio: PlaylistAudio = { audio_id, position };

    playlist_audios.push(new_playlist_audio);

    playlist.incrementalPatch({
      audios: playlist_audios,
    });
  };

  const removeAudio = async (playlist_id: string, audio_id: string) => {
    const playlist = await get(playlist_id);

    let playlist_audios = playlist.audios ?? [];

    const toRemove = playlist_audios.find((o) => o.audio_id === audio_id);
    if (toRemove) {
      playlist_audios = playlist_audios
        .filter((o) => o.audio_id !== audio_id)
        .map((o, i) => ({ ...o, position: i }));
    }

    playlist.incrementalPatch({
      audios: playlist_audios,
    });
  };

  return {
    get,
    updateAudios,
    isAudioIn,
    addAudio,
    removeAudio,
  };
};

export default usePlaylistService;
