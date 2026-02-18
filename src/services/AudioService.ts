import useYoutubeClient from "@/clients/YoutubeClient";
import { useDatabase } from "@/database";
import type { RxAudio } from "@/schemas/audio";
import type { Audio, AudioCollection, AudioDocument } from "@/types";

const useAudioService = () => {
  const youtube_client = useYoutubeClient();
  const db = useDatabase();
  const audio_collection: AudioCollection = db.audios;

  const getAudio = async (id: string): Promise<AudioDocument> => {
    const audio: AudioDocument | null = await audio_collection
      .findOne(id)
      .exec();

    if (!audio) {
      const audio: Audio = await youtube_client.get(id);
      return await createAudio(audio);
    }

    if (audio.expires_at - 10000 < Date.now()) {
      const audio: Audio = await youtube_client.get(id);
      return await updateAudio(audio);
    }

    return audio;
  };

  const getAudiosByIds = async (ids: string[]): Promise<AudioDocument[]> => {
    const audios: AudioDocument[] = await audio_collection
      .find({
        selector: {
          id: { $in: ids },
        },
      })
      .exec();

    return audios;
  };

  const createAudio = async (audio: Audio): Promise<AudioDocument> => {
    return await audio_collection.insertIfNotExists({
      ...audio,
      created_at: Date.now(),
    });
  };

  const updateAudio = async (updated_audio: Audio): Promise<AudioDocument> => {
    const audio: AudioDocument | null = await audio_collection
      .findOne(updated_audio.id)
      .exec();

    if (!audio) throw new Error("Audio not found");

    return await audio.incrementalModify((audioDoc: RxAudio) => {
      audioDoc.title = updated_audio.title;
      audioDoc.author = updated_audio.author;
      audioDoc.duration = updated_audio.duration;
      audioDoc.duration_text = updated_audio.duration_text;
      audioDoc.thumbnail = updated_audio.thumbnail;
      audioDoc.url = updated_audio.url;
      audioDoc.colors = updated_audio.colors;
      audioDoc.expires_at = updated_audio.expires_at;
      audioDoc.updated_at = Date.now();
      return audioDoc;
    });
  };

  const refreshUrl = async (
    id: string,
    url: string,
    expires_at: number,
  ): Promise<void> => {
    const audio: AudioDocument | null = await audio_collection
      .findOne(id)
      .exec();

    if (!audio) throw new Error("Audio not found");

    audio.incrementalPatch({
      url,
      expires_at,
      updated_at: Date.now(),
    });
  };

  return {
    getAudio,
    getAudiosByIds,
    createAudio,
    updateAudio,
    refreshUrl,
  };
};

export default useAudioService;
