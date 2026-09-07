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
import { FAKE_SRC, FAVORITES_PLAYLIST_ID } from "@/constants";
import { audioSchema } from "@/schemas/audio";
import { playlistMethods, playlistSchema } from "@/schemas/playlist";
import { spotifySchema } from "@/schemas/spotify";
import type { RxShannicCollections, RxShannicDatabase } from "@/types";

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
      minimumDeletedTime: 1000 * 60 * 60 * 24 * 31, // one month
      minimumCollectionAge: 1000 * 60, // 60 seconds
      runEach: 1000 * 60 * 5, // 5 minutes
      awaitReplicationsInSync: false,
      waitForLeadership: false,
    },
  });

  await db.addCollections({
    audios: {
      schema: audioSchema,
      migrationStrategies: {
        1: (oldDoc) => {
          delete oldDoc.duration_text;
          
          oldDoc.duration = Math.floor(oldDoc.duration / 1000);
          
          if (oldDoc.url && oldDoc.url.startsWith("file")) {
            oldDoc.src = oldDoc.url;
            oldDoc.expires_at = undefined;
          } else {
            oldDoc.src = FAKE_SRC;
            oldDoc.expires_at = 0;
          }

          delete oldDoc.url;
          return oldDoc;
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

  return {
    install(app: App) {
      app.provide(KEY_DATABASE, db);
    },
  };
}
