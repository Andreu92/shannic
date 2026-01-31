import {
	addRxPlugin,
	createRxDatabase,
	type DexieSettings,
	type DexieStorageInternals,
	type RxStorage,
	removeRxDatabase,
} from "rxdb";
import {
	getRxStorageDexie,
	type RxStorageDexie,
} from "rxdb/plugins/storage-dexie";
import { type App, inject, type Plugin } from "vue";

import { audioSchema } from "@/schemas/audio";
import { playlistMethods, playlistSchema } from "@/schemas/playlist";
import type { RxShannicCollections, RxShannicDatabase } from "@/types";

let storage: RxStorageDexie | RxStorage<DexieStorageInternals, DexieSettings>;
if (import.meta.env.DEV) {
	const { RxDBDevModePlugin } = await import("rxdb/plugins/dev-mode");
	addRxPlugin(RxDBDevModePlugin);

	const { wrappedValidateAjvStorage } = await import(
		"rxdb/plugins/validate-ajv"
	);
	storage = wrappedValidateAjvStorage({
		storage: getRxStorageDexie(),
	});
} else {
	storage = getRxStorageDexie();
}

const KEY_DATABASE = Symbol("shannic_db");

export function useDatabase(): RxShannicDatabase {
	return inject(KEY_DATABASE) as RxShannicDatabase;
}

export async function createDatabase(): Promise<Plugin> {
	await removeRxDatabase("shannic", storage);

	const db: RxShannicDatabase = await createRxDatabase<RxShannicCollections>({
		name: "shannic",
		storage: storage,
	});

	await db.addCollections({
		audios: {
			schema: audioSchema,
		},
		playlists: {
			schema: playlistSchema,
			methods: playlistMethods,
		},
	});

	db.playlists.insertIfNotExists({
		id: "1",
		title: "favorites",
		createdAt: Date.now(),
	});

	return {
		install(app: App) {
			app.provide(KEY_DATABASE, db);
		},
	};
}
