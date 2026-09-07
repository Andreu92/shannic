import { useDatabase } from "@/database";
import { youtube_plugin, YoutubeAudioItem } from "@/plugins/YoutubePlugin";
import type { RxAudio } from "@/schemas/audio";
import type { AudioItem, AudioCollection, AudioDocument } from "@/types";
import { useAudioItem } from "@/composables/useAudioItem";

const useAudioService = () => {
  const db = useDatabase();
  const audio_item = useAudioItem();
  const audio_collection: AudioCollection = db.audios;

  const get = async (id: string): Promise<AudioDocument | null> => {
    const audio_doc: AudioDocument | null = await audio_collection
      .findOne(id)
      .exec();

    return audio_doc;
  };

  const fetch = async (id: string): Promise<AudioItem> => {
    const yt_audio_item: YoutubeAudioItem = await youtube_plugin.get({ id });
    return await audio_item.build(yt_audio_item);
  };

  const getList = async (ids: string[]): Promise<AudioDocument[]> => {
    const audio_map: Map<string, AudioDocument> = await audio_collection
      .findByIds(ids)
      .exec();

    return Array.from(audio_map.values());
  };

  const create = async (audio: AudioItem): Promise<AudioDocument> => {
    return await audio_collection.insertIfNotExists({
      ...audio,
      created_at: Date.now(),
    });
  };

  const update = async (updated_audio: AudioItem): Promise<AudioDocument> => {
    const audio: AudioDocument | null = await get(updated_audio.id);

    if (!audio) throw new Error("Audio not found");

    return await audio.incrementalModify((audioDoc: RxAudio) => {
      audioDoc.src = updated_audio.src;
      audioDoc.title = updated_audio.title;
      audioDoc.author = updated_audio.author;
      audioDoc.duration = updated_audio.duration;
      if (!audioDoc.thumbnail.startsWith("file"))
        audioDoc.thumbnail = updated_audio.thumbnail;
      audioDoc.colors = updated_audio.colors;
      audioDoc.expires_at = updated_audio.expires_at;
      audioDoc.updated_at = Date.now();
      return audioDoc;
    });
  };

  const remove = async (id: string): Promise<void> => {
    const audio: AudioDocument | null = await get(id);
    if (audio) {
      audio.remove();
      db.audios.cleanup(0);
    }
  };

  const getCreateOrUpdate = async (id: string): Promise<AudioDocument> => {
    const audio_doc: AudioDocument | null = await get(id);

    if (!audio_doc) {
      const audio_item: AudioItem = await fetch(id);
      return await create(audio_item);
    }

    if (audio_doc.expires_at && audio_doc.expires_at - 10 < Date.now() / 1000) {
      const audio_item: AudioItem = await fetch(id);
      return await update(audio_item);
    }

    return audio_doc;
  };

  const createOrUpdate = async (
    audio_item: AudioItem,
  ): Promise<AudioDocument> => {
    const audio_doc: AudioDocument | null = await get(audio_item.id);

    if (!audio_doc) return await create(audio_item);

    return await update(audio_item);
  };

  const refreshSrc = async (
    id: string,
    src: string,
    expires_at: number,
  ): Promise<void> => {
    const audio: AudioDocument | null = await get(id);

    if (!audio) throw new Error("Audio not found");

    audio.incrementalPatch({
      src,
      expires_at,
      updated_at: Date.now(),
    });
  };

  return {
    get,
    getList,
    create,
    update,
    remove,
    refreshSrc,
    getCreateOrUpdate,
    createOrUpdate,
  };
};

export default useAudioService;
