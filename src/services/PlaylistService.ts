import { useDatabase } from "@/database";
import { nanoid } from "nanoid";
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

  const add = (playlist_name: string) => {
    playlist_collection.insert({
      id: nanoid(),
      title: playlist_name,
      created_at: Date.now(),
    });
  };

  const remove = (playlist_id: string) => {
    playlist_collection.findOne(playlist_id).remove();
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

    if (playlist_audios.some((o) => o.audio_id === audio_id)) return;

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

    if (!playlist_audios.some((o) => o.audio_id === audio_id)) return;

    playlist_audios = playlist_audios
      .filter((o) => o.audio_id !== audio_id)
      .map((o, i) => ({ ...o, position: i }));

    playlist.incrementalPatch({
      audios: playlist_audios,
    });
  };

  const getSortedAudiosAsJson = async (playlist_id: string) => {
    const playlist = await get(playlist_id);

    const audio_map = await db.audios
      .findByIds(playlist.audios?.map((a) => a.audio_id) ?? [])
      .exec();

    const audios_as_json = Array.from(audio_map.values()).map((a) =>
      a.toJSON(),
    );

    const positions_map = new Map(
      playlist.audios?.map((f) => [f.audio_id, f.position]),
    );

    return audios_as_json.sort((a, b) => {
      const p1 = positions_map.get(a.id) ?? 0;
      const p2 = positions_map.get(b.id) ?? 0;
      return p1 - p2;
    });
  };

  return {
    get,
    add,
    remove,
    updateAudios,
    isAudioIn,
    addAudio,
    removeAudio,
    getSortedAudiosAsJson,
  };
};

export default usePlaylistService;
