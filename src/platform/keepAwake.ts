let wake_lock: WakeLockSentinel | null = null;
let wanted = false;

async function acquire(): Promise<void> {
  if (wake_lock && !wake_lock.released) return;
  try {
    wake_lock = (await navigator.wakeLock?.request("screen")) ?? null;
    wake_lock?.addEventListener("release", () => {
      wake_lock = null;
    });
  } catch {
    console.error("Can't keep screen awake!")
  }
}

document.addEventListener("visibilitychange", () => {
  if (wanted && document.visibilityState === "visible") acquire();
});

export const KeepAwake = {
  async keepAwake(): Promise<void> {
    wanted = true;
    await acquire();
  },

  async allowSleep(): Promise<void> {
    wanted = false;
    try {
      await wake_lock?.release();
    } finally {
      wake_lock = null;
    }
  },
};
