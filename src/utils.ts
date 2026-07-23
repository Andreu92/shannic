import { toastController } from "@ionic/vue";
import { alertOutline } from "ionicons/icons";
import { Vibrant } from "node-vibrant/browser";
import { Capacitor } from "@capacitor/core";
import { type YoutubeAudioItem } from "@/plugins/YoutubePlugin";
import type { AudioItem, Palette } from "@/types";

export const buildAudio = async (
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

export const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  } else {
    return [m, s].map((v) => String(v).padStart(2, "0")).join(":");
  }
};

export const shuffleArray = <T>(array: T[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const showToast = async (
  message: string,
  color: string = "danger",
  icon: string = alertOutline,
) => {
  const toast = await toastController.create({
    message: message,
    duration: 5000,
    color: color,
    position: "bottom",
    swipeGesture: "vertical",
    icon: icon,
  });

  await toast.present();
};
