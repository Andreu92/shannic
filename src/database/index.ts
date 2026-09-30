import {
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
  type DexieSettings,
  type DexieStorageInternals,
  type RxStorage,
} from "rxdb";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { RxDBCleanupPlugin } from "rxdb/plugins/cleanup";
import {
  getRxStorageDexie,
  type RxStorageDexie,
} from "rxdb/plugins/storage-dexie";
import { type App, inject, type Plugin } from "vue";
import { FAVORITES_PLAYLIST_ID } from "@/constants";
import { audioMethods, audioSchema } from "@/schemas/audio";
import { playlistSchema } from "@/schemas/playlist";
import type { RxShannicCollections, RxShannicDatabase } from "@/types";
import { audioMigrations } from "./migrations";

addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBCleanupPlugin);

let storage: RxStorageDexie | RxStorage<DexieStorageInternals, DexieSettings>;
if (import.meta.env.DEV) {
  const { RxDBDevModePlugin } = await import("rxdb/plugins/dev-mode");
  addRxPlugin(RxDBDevModePlugin);

  const { wrappedValidateAjvStorage } =
    await import("rxdb/plugins/validate-ajv");
  storage = wrappedValidateAjvStorage({
    storage: getRxStorageDexie(),
  });

  //await removeRxDatabase("shannic", storage);
} else {
  storage = getRxStorageDexie();
}

const KEY_DATABASE = Symbol("shannic_db");

export function useDatabase(): RxShannicDatabase {
  return inject(KEY_DATABASE) as RxShannicDatabase;
}

export async function createDatabase(): Promise<Plugin> {
  const db: RxShannicDatabase = await createRxDatabase<RxShannicCollections>({
    name: "shannic",
    storage: storage,
    multiInstance: false,
    cleanupPolicy: {
      minimumDeletedTime: 60 * 1000,
      awaitReplicationsInSync: false,
      waitForLeadership: false,
    },
  });

  await db.addCollections({
    audios: {
      schema: audioSchema,
      methods: audioMethods,
      migrationStrategies: audioMigrations,
    },
    playlists: {
      schema: playlistSchema,
    },
  });

  db.playlists.insertIfNotExists({
    id: FAVORITES_PLAYLIST_ID,
    title: "favorites",
    created_at: Date.now(),
  });

  return {
    install(app: App) {
      app.provide(KEY_DATABASE, db);
    },
  };
}
