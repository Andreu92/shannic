import { Vibrant } from "node-vibrant/browser";
import {
  type YoutubeAudioItem,
  type YoutubeSearch,
  youtube_client_plugin,
} from "@/plugins/YoutubeClientPlugin";
import type { AudioItem, Palette } from "@/types";
import { Capacitor } from "@capacitor/core";

const useYoutubeClient = () => {
  const get = async (url: string): Promise<AudioItem> => {
    const yt_audio_item: YoutubeAudioItem = await youtube_client_plugin.get({
      url,
    });

    return await buildAudio(yt_audio_item);
  };

  const getByQuery = async (
    artist: string,
    title: string,
  ): Promise<AudioItem> => {
    const yt_audio_item: YoutubeAudioItem =
      await youtube_client_plugin.getByQuery({ artist, title });

    return await buildAudio(yt_audio_item);
  };

  const buildAudio = async (
    yt_audio_item: YoutubeAudioItem,
  ): Promise<AudioItem> => {
    const palette = await Vibrant.from(
      Capacitor.convertFileSrc(yt_audio_item.thumbnail),
    ).getPalette();

    const audio: AudioItem = {
      ...yt_audio_item,
      colors: getFormattedColors(palette),
    };

    return audio;
  };

  const search = async (
    query: string,
    only_music: boolean = false,
  ): Promise<YoutubeSearch> => {
    const search_data: YoutubeSearch = await youtube_client_plugin.search({
      query,
      only_music,
    });

    return search_data;
  };

  const fetchNextPage = async (): Promise<YoutubeSearch> => {
    const search_data: YoutubeSearch =
      await youtube_client_plugin.fetchNextPage();

    return search_data;
  };

  const getFormattedColors = (
    palette: Awaited<ReturnType<typeof Vibrant.prototype.getPalette>>,
  ): Palette => {
    const colors: Palette = {} as Palette;

    Object.keys(palette).forEach((key) => {
      const item = palette[key];
      const snake_case_key = key
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .toLowerCase() as keyof Palette;
      if (item) {
        colors[snake_case_key] = {
          main_color: item.hex,
          title_text_color: item.titleTextColor,
          body_text_color: item.bodyTextColor,
        };
      }
    });

    return colors;
  };

  return { search, fetchNextPage, get, getByQuery };
};

export default useYoutubeClient;
