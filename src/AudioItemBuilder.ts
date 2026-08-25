import { Vibrant } from "node-vibrant/browser";
import { Capacitor } from "@capacitor/core";
import type { YoutubeAudioItem } from "@/plugins/YoutubePlugin";
import type { AudioItem, Palette, SearchResult } from "@/types";
import { FAKE_SRC } from "./constants";

function formatPalette(
  palette: Awaited<ReturnType<typeof Vibrant.prototype.getPalette>>,
): Palette {
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
}

async function buildWithPalette(
  source: SearchResult,
  extra: Pick<AudioItem, "src" | "expires_at">,
): Promise<AudioItem> {
  let colors: Palette = {};
  try {
    const palette = await Vibrant.from(
      Capacitor.convertFileSrc(source.thumbnail),
    ).getPalette();
    colors = formatPalette(palette);
  } catch {
    // TO DO: thumbnail unreadable — fall back to empty palette
  }
  return { ...source, colors, src: extra.src, expires_at: extra.expires_at };
}

export const AudioItemBuilder = {
  build(yt: YoutubeAudioItem): Promise<AudioItem> {
    return buildWithPalette(yt, { src: yt.src, expires_at: yt.expires_at });
  },
  fromSearchResult(sr: SearchResult): Promise<AudioItem> {
    return buildWithPalette(sr, { src: FAKE_SRC, expires_at: 0 });
  },
};