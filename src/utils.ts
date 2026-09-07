import { CapacitorHttp, HttpOptions, HttpResponse } from "@capacitor/core";
import { toastController } from "@ionic/vue";
import { alertOutline } from "ionicons/icons";
import { BROWSER_USER_AGENT, YT_BASE_URL } from "@/constants";
import iconLight from "@/assets/img/icon-light.png";

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

export const fetchImage = async (url: string) => {
  try {
    const options: HttpOptions = {
      url,
      responseType: "blob",
      headers: {
        Origin: YT_BASE_URL,
        "User-Agent": BROWSER_USER_AGENT,
      },
    };

    const response: HttpResponse = await CapacitorHttp.get(options);
    if (response.status === 200 && response.data) return response;
  } catch {
    throw new Error("Failed to fetch image");
  }
  return null;
};

export const onImgError = async (url: string, e: Event) => {
  const img = e.target as HTMLImageElement;

  try {
    const response = await fetchImage(url);
    img.src = `data:${response!.headers["Content-Type"]};base64,${response!.data}`;
  } catch {
    if (img.src !== iconLight) img.src = iconLight;
  }
};
