import { useDatabase } from "@/database";
import { youtube_plugin, YoutubeAudioItem } from "@/plugins/YoutubePlugin";
import type { RxAudio } from "@/schemas/audio";
import type { AudioItem, AudioCollection, AudioDocument } from "@/types";
import { buildAudio } from "@/utils";

const useAudioService = () => {
  const db = useDatabase();
  const audio_collection: AudioCollection = db.audios;

  const getAudioById = async (id: string): Promise<AudioDocument | null> => {
    const audio_doc: AudioDocument | null = await audio_collection
      .findOne(id)
      .exec();

    return audio_doc;
  };

  const fetchAudio = async (id: string): Promise<AudioItem> => {
    const yt_audio_item: YoutubeAudioItem = await youtube_plugin.get({ id });
    return await buildAudio(yt_audio_item);
  };

  const getAudiosByIds = async (ids: string[]): Promise<AudioDocument[]> => {
    const audio_map: Map<string, AudioDocument> = await audio_collection
      .findByIds(ids)
      .exec();
    return Array.from(audio_map.values());
  };

  const createAudio = async (audio: AudioItem): Promise<AudioDocument> => {
    return await audio_collection.insertIfNotExists({
      ...audio,
      created_at: Date.now(),
    });
  };

  const updateAudio = async (
    updated_audio: AudioItem,
  ): Promise<AudioDocument> => {
    const audio: AudioDocument | null = await getAudioById(updated_audio.id);

    if (!audio) throw new Error("Audio not found");

    return await audio.incrementalModify((audioDoc: RxAudio) => {
      audioDoc.src = updated_audio.src;
      audioDoc.title = updated_audio.title;
      audioDoc.author = updated_audio.author;
      audioDoc.duration = updated_audio.duration;
      audioDoc.thumbnail = updated_audio.thumbnail;
      audioDoc.colors = updated_audio.colors;
      audioDoc.expires_at = updated_audio.expires_at;
      audioDoc.updated_at = Date.now();
      return audioDoc;
    });
  };

  const getCreateOrUpdateAudio = async (id: string): Promise<AudioDocument> => {
    const audio_doc: AudioDocument | null = await getAudioById(id);

    if (!audio_doc) {
      const audio_item: AudioItem = await fetchAudio(id);
      return await createAudio(audio_item);
    }

    if (audio_doc.expires_at && audio_doc.expires_at - 10 < Date.now() / 1000) {
      const audio_item: AudioItem = await fetchAudio(id);
      return await updateAudio(audio_item);
    }

    return audio_doc;
  };

  const createOrUpdateAudio = async (
    audio_item: AudioItem,
  ): Promise<AudioDocument> => {
    const audio_doc: AudioDocument | null = await getAudioById(audio_item.id);

    if (!audio_doc) return await createAudio(audio_item);

    return await updateAudio(audio_item);
  };

  const refreshSrc = async (
    id: string,
    src: string,
    expires_at: number,
  ): Promise<void> => {
    const audio: AudioDocument | null = await getAudioById(id);

    if (!audio) throw new Error("Audio not found");

    audio.incrementalPatch({
      src,
      expires_at,
      updated_at: Date.now(),
    });
  };

  return {
    getAudioById,
    getAudiosByIds,
    createAudio,
    updateAudio,
    refreshSrc,
    getCreateOrUpdateAudio,
    createOrUpdateAudio,
  };
};

export default useAudioService;
