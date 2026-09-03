import { Vibrant } from "node-vibrant/browser";
import type {
  YoutubeAudioItem,
  YoutubeSearchItem,
} from "@/plugins/YoutubePlugin";
import type { AudioDocument, AudioItem, Palette } from "@/types";
import { DEFAULT_COLOR_THEME, FAKE_SRC } from "../constants";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileTransfer } from "@capacitor/file-transfer";
import { fetchImage } from "@/utils";

export const useAudioItem = () => {
  const build = async (
    item: YoutubeAudioItem | YoutubeSearchItem,
  ): Promise<AudioItem> => {
    if ("src" in item && "expires_at" in item)
      return await buildWithPalette(item);
    return await buildWithPalette({ ...item, src: FAKE_SRC, expires_at: 0 });
  };

  const storeThumbnail = async (item: AudioDocument) => {
    if (item.thumbnail.startsWith("http")) {
      const file_info = await Filesystem.getUri({
        directory: Directory.Data,
        path: `img/${item.id}`,
      });

      const download_result = await FileTransfer.downloadFile({
        url: item.thumbnail,
        path: file_info.uri,
      });

      item.incrementalPatch({ thumbnail: download_result.path });
    }
  };

  const deleteThumbnail = (id: string) => {
    Filesystem.deleteFile({
      path: `img/${id}`,
      directory: Directory.Data,
    });
  };

  const deleteFile = async (item: AudioDocument) => {
    if (item.src.startsWith("file")) {
      Filesystem.deleteFile({
        path: item.id,
        directory: Directory.Data,
      }).then(() => {
        item.incrementalPatch({
          src: FAKE_SRC,
          expires_at: 0,
          updated_at: Date.now(),
        });
      });
    }
  };

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

  return { build, storeThumbnail, deleteThumbnail, deleteFile };
};
