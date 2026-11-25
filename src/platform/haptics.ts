/**
 * Web fallback for `@capacitor/haptics` using the Vibration API.
 * No-op where vibration is not available (desktop).
 */

export enum ImpactStyle {
  Heavy = 1,
  Medium = 2,
  Light = 3,
}

export const Haptics = {
  impact(options: { style: ImpactStyle }): void {
    const duration = options.style === ImpactStyle.Heavy ? 30 : 10;
    navigator.vibrate?.(duration);
  },
};
