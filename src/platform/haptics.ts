import {
  impactFeedback as pluginImpact,
  vibrate,
} from "@tauri-apps/plugin-haptics";
import { isTauri } from "@tauri-apps/api/core";

export enum ImpactStyle {
  Heavy = 1,
  Medium = 2,
  Light = 3,
}

const impactStyleName = (style: ImpactStyle): string => {
  if (style === ImpactStyle.Heavy) return "heavy";
  if (style === ImpactStyle.Medium) return "medium";
  return "light";
};

export const Haptics = {
  async impact(options: { style: ImpactStyle }): Promise<void> {
    if (isTauri()) {
      try {
        await pluginImpact(impactStyleName(options.style) as never);
      } catch {
        // Haptics unavailable; ignore.
      }
      return;
    }
    navigator.vibrate?.(options.style === ImpactStyle.Heavy ? 30 : 10);
  },
};

export { vibrate };
