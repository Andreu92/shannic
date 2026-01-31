import { type PluginListenerHandle, registerPlugin } from "@capacitor/core";

export interface PlayerAudio {
	id: string;
	title: string;
	duration: number;
	thumbnail: string;
	author: string;
	artist: string;
	url: string;
	favorite: boolean;
}

export interface PlayerPlugin {
	play(options: PlayerAudio): Promise<void>;
	seekTo(options: { position: number }): Promise<void>;
	resume(): Promise<void>;
	pause(): Promise<void>;
	stop(): Promise<void>;
	skipNext(): Promise<void>;
	skipPrevious(): Promise<void>;
	toggleRepeat(options: { repeating: boolean }): Promise<void>;
	toggleFavorite(options: { favorite: boolean }): Promise<void>;
	addListener(
		event: string,
		callback: (
			data:
				| { position: number }
				| { repeating: boolean }
				| { favorite: boolean },
		) => void,
	): Promise<PluginListenerHandle>;
}

export const player_plugin: PlayerPlugin = registerPlugin("PlayerPlugin");
