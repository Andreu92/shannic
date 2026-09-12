import { useDatabase } from "@/database";
import {
  youtube_plugin,
  YoutubeAudioItem,
  YoutubeSearchItem,
} from "@/plugins/YoutubePlugin";
import type { RxAudio } from "@/schemas/audio";
import type {
  AudioItem,
  AudioCollection,
  AudioDocument,
  Palette,
} from "@/types";
import { Vibrant } from "node-vibrant/browser";
import { DEFAULT_COLOR_THEME, FAKE_SRC } from "@/constants";
import { fetchImage } from "@/utils";

const useAudioService = () => {
  const db = useDatabase();
  const audio_collection: AudioCollection = db.audios;

  const build = async (
    item: YoutubeAudioItem | YoutubeSearchItem,
  ): Promise<AudioItem> => {
    const formatPalette = (
      palette: Awaited<ReturnType<typeof Vibrant.prototype.getPalette>>,
    ): Palette => {
      const colors: Palette = {};
      for (const [key, item] of Object.entries(palette)) {
        if (!item) continue;
        const snakeKey = key
          .replace(/([a-z])([A-Z])/g, "$1_$2")
          .toLowerCase() as keyof Palette;
        colors[snakeKey] = {
          main_color: item.hex,
          title_text_color: item.titleTextColor,
          body_text_color: item.bodyTextColor,
        };
      }
      return colors;
    };

    const buildWithPalette = async (
      item: YoutubeAudioItem,
    ): Promise<AudioItem> => {
      try {
        const response = await fetchImage(item.thumbnail);
        const palette = await Vibrant.from(
          `data:${response!.headers["Content-Type"]};base64,${response!.data}`,
        ).getPalette();
        const colors: Palette = formatPalette(palette);
        return { ...item, colors };
      } catch {
        return { ...item, colors: { vibrant: DEFAULT_COLOR_THEME } };
      }
    };

    if ("src" in item && "expires_at" in item)
      return await buildWithPalette(item);
    return await buildWithPalette({ ...item, src: FAKE_SRC + item.id, expires_at: 0 });
  };

  const get = async (id: string): Promise<AudioDocument | null> => {
    const audio_doc: AudioDocument | null = await audio_collection
      .findOne(id)
      .exec();

    return audio_doc;
  };

  const fetch = async (id: string): Promise<AudioItem> => {
    const yt_audio_item: YoutubeAudioItem = await youtube_plugin.get({ id });
    return await build(yt_audio_item);
  };

  const getList = async (ids: string[]): Promise<AudioDocument[]> => {
    const audio_map: Map<string, AudioDocument> = await audio_collection
      .findByIds(ids)
      .exec();

    return Array.from(audio_map.values());
  };

  const create = async (
    item: YoutubeAudioItem | YoutubeSearchItem,
  ): Promise<AudioDocument> => {
    const audio_item = await build(item);
    
    const created_audio = await audio_collection.upsert({
      ...audio_item,
      created_at: Date.now()
    });

    return created_audio;
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
    if (audio) await audio.remove();
  };

  const getCreateOrUpdate = async (id: string): Promise<AudioDocument> => {
    const audio_doc: AudioDocument | null = await get(id);

    if (!audio_doc) {
      const audio_item: AudioItem = await fetch(id);
      return await create(audio_item);
    }

    if (audio_doc.isExpired()) {
      const audio_item: AudioItem = await fetch(id);
      return await update(audio_item);
    }

    return audio_doc;
  };

  const createOrUpdate = async (
    item: YoutubeAudioItem | YoutubeSearchItem,
  ): Promise<AudioDocument> => {
    const audio_doc: AudioDocument | null = await get(item.id);
    const audio_item: AudioItem = await build(item);

    if (!audio_doc) return await create(audio_item);

    return await update(audio_item);
  };

  return {
    build,
    get,
    getList,
    create,
    update,
    remove,
    getCreateOrUpdate,
    createOrUpdate,
  };
};

export default useAudioService;
