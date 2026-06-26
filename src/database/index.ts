import {
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
  type DexieSettings,
  type DexieStorageInternals,
  type RxStorage,
} from "rxdb";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import {
  getRxStorageDexie,
  type RxStorageDexie,
} from "rxdb/plugins/storage-dexie";
import { type App, inject, type Plugin } from "vue";
import { FAVORITES_PLAYLIST_ID, SPOTIFY_CONFIG_ID } from "@/constants";
import { audioSchema, RxAudio } from "@/schemas/audio";
import { playlistMethods, playlistSchema } from "@/schemas/playlist";
import { spotifySchema } from "@/schemas/spotify";
import type { RxShannicCollections, RxShannicDatabase } from "@/types";

addRxPlugin(RxDBMigrationSchemaPlugin);

let storage: RxStorageDexie | RxStorage<DexieStorageInternals, DexieSettings>;
if (import.meta.env.DEV) {
  const { RxDBDevModePlugin } = await import("rxdb/plugins/dev-mode");
  addRxPlugin(RxDBDevModePlugin);

  const { wrappedValidateAjvStorage } =
    await import("rxdb/plugins/validate-ajv");
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
  //await removeRxDatabase("shannic", storage);
  const db: RxShannicDatabase = await createRxDatabase<RxShannicCollections>({
    name: "shannic",
    storage: storage,
  });

  await db.addCollections({
    audios: {
      schema: audioSchema,
      migrationStrategies: {
        1: function (doc: RxAudio) {
          doc.src = doc.url;
          doc.url = `https://www.youtube.com/watch?v=${doc.id}`;
          return doc;
        },
      },
    },
    playlists: {
      schema: playlistSchema,
      methods: playlistMethods,
    },
    spotify: {
      schema: spotifySchema,
    },
  });

  db.playlists.insertIfNotExists({
    id: FAVORITES_PLAYLIST_ID,
    title: "favorites",
    created_at: Date.now(),
  });

  db.spotify.insertIfNotExists({
    id: SPOTIFY_CONFIG_ID,
  });

  return {
    install(app: App) {
      app.provide(KEY_DATABASE, db);
    },
  };
}
