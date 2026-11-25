import type { YoutubeAudioItem } from "./youtube";

export interface PlayerAudio {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  src: string;
}

export interface ListenerHandle {
  remove(): Promise<void> | void;
}

export type PlayerEventData =
  | { position: number }
  | { repeating: boolean }
  | { favorite: boolean }
  | { id: string; index: number }
  | { id: string; src: string; expires_at: number }
  | { item: YoutubeAudioItem }
  | { code: number; name: string; message: string };

export interface PlayerPlugin {
  play(options: { audio_items: PlayerAudio[]; shuffle: boolean }): Promise<void>;
  seekTo(options: { position: number }): Promise<void>;
  resume(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  skipNext(): Promise<void>;
  skipPrevious(): Promise<void>;
  setRepeat(options: { repeating: boolean }): Promise<void>;
  getCurrentPosition(): Promise<{ position: number }>;
  isInQueue(options: { id: string }): Promise<{ is_in_queue: boolean }>;
  hasNext(): Promise<{ has_next: boolean }>;
  clearCache(): Promise<void>;
  addListener(
    event: string,
    callback: (data: PlayerEventData) => void,
  ): Promise<ListenerHandle>;
}

/**
 * Web fallback implementation of the player plugin: a single HTML5
 * `<audio>` element driving the same event contract as the native
 * PlayerPlugin, so the frontend store needs no changes.
 *
 * This is the desktop implementation until the native player lands;
 * on Android the Tauri gateway will forward to the Kotlin/ExoPlayer
 * foreground service instead.
 */
const listeners = new Map<string, Set<(data: PlayerEventData) => void>>();

const emit = (event: string, data?: PlayerEventData) => {
  listeners.get(event)?.forEach((callback) => callback(data as never));
};

const audio = new Audio();

let queue: PlayerAudio[] = [];
let index = -1;
let repeating = false;

const current = (): PlayerAudio | undefined => queue[index];

const loadAndPlay = (item: PlayerAudio) => {
  emit("onBuffering");
  audio.src = item.src;
  audio.play().catch((error) => {
    emit("onSourceError", {
      code: 2002,
      name: "AudioError",
      message: String(error),
    });
  });
};

const jumpTo = (new_index: number) => {
  if (new_index < 0 || new_index >= queue.length) return;
  index = new_index;
  const item = current()!;
  emit("onMediaItemChanged", { id: item.id, index });
  loadAndPlay(item);
};

audio.addEventListener("playing", () => {
  emit("onPlay", { position: audio.currentTime });
});

audio.addEventListener("pause", () => {
  emit("onPause", { position: audio.currentTime });
});

audio.addEventListener("waiting", () => {
  emit("onBuffering");
});

audio.addEventListener("ended", () => {
  if (repeating) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
    return;
  }
  if (index + 1 < queue.length) jumpTo(index + 1);
});

audio.addEventListener("error", () => {
  emit("onSourceError", {
    code: 2002,
    name: "AudioError",
    message: "Failed to load audio source",
  });
});

const shuffle = (items: PlayerAudio[]): PlayerAudio[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const player_plugin: PlayerPlugin = {
  async play(options) {
    queue = options.shuffle ? shuffle(options.audio_items) : options.audio_items;
    index = 0;
    if (queue.length) {
      emit("onMediaItemChanged", { id: queue[0].id, index: 0 });
      loadAndPlay(queue[0]);
    }
  },

  async seekTo(options) {
    audio.currentTime = options.position;
  },

  async resume() {
    await audio.play();
  },

  async pause() {
    audio.pause();
  },

  async stop() {
    audio.pause();
    audio.removeAttribute("src");
    queue = [];
    index = -1;
  },

  async skipNext() {
    jumpTo(index + 1);
  },

  async skipPrevious() {
    jumpTo(index - 1);
  },

  async setRepeat(options) {
    repeating = options.repeating;
    emit("onToggleRepeat", { repeating: options.repeating });
  },

  async getCurrentPosition() {
    return { position: audio.currentTime };
  },

  async isInQueue(options) {
    return { is_in_queue: queue.some((item) => item.id === options.id) };
  },

  async hasNext() {
    return { has_next: index + 1 < queue.length };
  },

  async clearCache() {},

  addListener(event, callback) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(callback);

    return Promise.resolve({
      remove: async () => {
        listeners.get(event)?.delete(callback);
      },
    });
  },
};
