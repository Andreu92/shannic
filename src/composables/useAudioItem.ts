import { Vibrant } from "node-vibrant/browser";
import { Capacitor } from "@capacitor/core";
import type {
  YoutubeAudioItem,
  YoutubeSearchItem,
} from "@/plugins/YoutubePlugin";
import type { AudioItem, Palette } from "@/types";
import { FAKE_SRC } from "../constants";

export const useAudioItem = () => {
  const build = async (
    item: YoutubeAudioItem | YoutubeSearchItem,
  ): Promise<AudioItem> => {
    if ("src" in item && "expires_at" in item) return await buildWithPalette(item);
    return await buildWithPalette({ ...item, src: FAKE_SRC, expires_at: 0 });
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
    let colors: Palette = {};
    try {
      const palette = await Vibrant.from(
        Capacitor.convertFileSrc(item.thumbnail),
      ).getPalette();
      colors = formatPalette(palette);
    } catch {
      // TO DO: thumbnail unreadable — fall back to empty palette
    }
    return { ...item, colors };
  };

  return { build };
};
