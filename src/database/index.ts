import { inject, Plugin } from "vue";
import { createRxDatabase, addRxPlugin, RxStorage } from "rxdb";
import { getRxStorageDexie, RxStorageDexie } from "rxdb/plugins/storage-dexie";

import { audioSchema } from "@/schemas/audio";
import { playlistSchema } from "@/schemas/playlist";
import { RxShannicDatabase, RxShannicCollections } from "@/types";

// Import dev plugin if development mode
let storage: RxStorageDexie | RxStorage<any, any>;
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
    },
  });

  db.playlists.insertIfNotExists(
    {
      id: "1",
      title: "favorites",
      createdAt: Date.now(),
    }
  );

  return {
    install(app: any) {
      app.provide(KEY_DATABASE, db);
    },
  };
}
