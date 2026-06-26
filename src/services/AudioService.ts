import useYoutubeClient from "@/clients/YoutubeClient";
import { useDatabase } from "@/database";
import type { RxAudio } from "@/schemas/audio";
import type { AudioItem, AudioCollection, AudioDocument } from "@/types";

const useAudioService = () => {
  const youtube_client = useYoutubeClient();
  const db = useDatabase();
  const audio_collection: AudioCollection = db.audios;

  const getAudio = async (id: string, url?: string): Promise<AudioDocument> => {
    const audio_doc: AudioDocument | null = await audio_collection
      .findOne(id)
      .exec();

    if (!audio_doc) {
      if (!url) throw new Error("URL is required for new audio");
      const audio_item: AudioItem = await youtube_client.get(url);
      return await createAudio(audio_item);
    }

    if (audio_doc.expires_at && audio_doc.expires_at - 10000 < Date.now()) {
      const audio_item: AudioItem = await youtube_client.get(audio_doc.url);
      return await updateAudio(audio_item);
    }

    return audio_doc;
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
    const audio: AudioDocument | null = await audio_collection
      .findOne(updated_audio.id)
      .exec();

    if (!audio) throw new Error("Audio not found");

    return await audio.incrementalModify((audioDoc: RxAudio) => {
      audioDoc.url = updated_audio.url;
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

  const refreshSrc = async (
    id: string,
    src: string,
    expires_at: number,
  ): Promise<void> => {
    const audio: AudioDocument | null = await audio_collection
      .findOne(id)
      .exec();

    if (!audio) throw new Error("Audio not found");

    audio.incrementalPatch({
      src,
      expires_at,
      updated_at: Date.now(),
    });
  };

  return {
    getAudio,
    getAudiosByIds,
    createAudio,
    updateAudio,
    refreshSrc,
  };
};

export default useAudioService;
