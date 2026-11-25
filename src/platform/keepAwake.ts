/**
 * Web fallback for `@capgo/capacitor-keep-awake` using the Screen Wake
 * Lock API. No-op where the API is not available (e.g. desktop).
 */

let wake_lock: WakeLockSentinel | null = null;

export const KeepAwake = {
  async keepAwake(): Promise<void> {
    try {
      wake_lock = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      // Wake Lock unavailable or denied; sleep is allowed then.
    }
  },

  async allowSleep(): Promise<void> {
    try {
      await wake_lock?.release();
    } finally {
      wake_lock = null;
    }
  },
};
