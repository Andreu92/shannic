import { toastController } from "@ionic/vue";
import { alertOutline } from "ionicons/icons";
import { BROWSER_USER_AGENT, FAKE_SRC, YT_BASE_URL } from "@/constants";
import { httpFetch } from "@/platform";
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

export const isLocalPath = (path: string): boolean =>
  !path.startsWith("http") && !path.startsWith(FAKE_SRC);

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
    const response = await httpFetch(url, {
      headers: {
        Origin: YT_BASE_URL,
        "User-Agent": BROWSER_USER_AGENT,
      },
    });

    if (response.ok && response.body) return { blob: await response.blob() };
  } catch {
    throw new Error("Failed to fetch image");
  }
  return null;
};

export const onImgError = async (url: string, e: Event) => {
  const img = e.target as HTMLImageElement;

  try {
    const response = await fetchImage(url);
    img.src = URL.createObjectURL(response!.blob);
  } catch {
    if (img.src !== iconLight) img.src = iconLight;
  }
};
