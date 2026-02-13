import { type PluginListenerHandle, registerPlugin } from "@capacitor/core";

export interface PlayerAudio {
	id: string;
	title: string;
	author: string;
	duration: number;
	thumbnail: string;
	url?: string;
	expires_at?: number;
	favorite: boolean;
}

export interface PlayerPlugin {
	play(options: {
		audio_items: PlayerAudio[];
		shuffle: boolean;
	}): Promise<void>;
	seekTo(options: { position: number }): Promise<void>;
	resume(): Promise<void>;
	pause(): Promise<void>;
	stop(): Promise<void>;
	skipNext(): Promise<void>;
	skipPrevious(): Promise<void>;
	toggleRepeat(options: { repeating: boolean }): Promise<void>;
	toggleFavorite(options: { favorite: boolean }): Promise<void>;
	getCurrentPosition(): Promise<{ position: number }>;
	addListener(
		event: string,
		callback: (
			data:
				| { position: number }
				| { repeating: boolean }
				| { favorite: boolean }
				| { index: number },
		) => void,
	): Promise<PluginListenerHandle>;
}

export const player_plugin: PlayerPlugin = registerPlugin("PlayerPlugin");
