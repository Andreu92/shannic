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
import { FAVORITES_PLAYLIST_ID, SPOTIFY_CONFIG_ID } from "@/constants";
import { audioSchema } from "@/schemas/audio";
import { playlistMethods, playlistSchema } from "@/schemas/playlist";
import { spotifySchema } from "@/schemas/spotify";
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
	//if (import.meta.env.DEV) {
	await removeRxDatabase("shannic", storage);
	//}

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

	db.audios.insertIfNotExists({
		"author": "Fito&Fitipaldis",
		"duration": 271000,
		"duration_text": "4:31",
		"expires_at": 1771011938000,
		"id": "iUXs4Nt3Y7Y",
		"thumbnail": "https://i.ytimg.com/vi/iUXs4Nt3Y7Y/hqdefault.jpg",
		"title": "Fito & Fitipaldis - Por la boca vive el pez (Videoclip oficial)",
		"url": "https://rr2---sn-vg5obxn25po-cjo6.googlevideo.com/videoplayback?expire=0&ei=AiuPaYqDOKyq0u8Pg8OkmQg&ip=37.14.88.18&id=o-AGNyYEUfLYhNJHcXlU-mmQ9zn6kqbRVfq2wW0krje-pc&itag=251&source=youtube&requiressl=yes&xpc=EgVo2aDSNQ%3D%3D&cps=412&met=1770990338%2C&mh=eU&mm=31%2C29&mn=sn-vg5obxn25po-cjo6%2Csn-h5q7dns7&ms=au%2Crdu&mv=m&mvi=2&pl=22&rms=au%2Cau&initcwndbps=1490000&bui=AW-iu_q4YQnHXw_zbX3LP5qdIZ45biKFJIM_0iy2F48_jsAGB44KuP8TO4969uJ3GMb2faXXmsoAij8m&spc=q5xjPE_8CwOg&vprv=1&svpuc=1&mime=audio%2Fwebm&rqh=1&gir=yes&clen=4586743&dur=270.821&lmt=1757022349252295&mt=1770989843&fvip=4&keepalive=yes&fexp=51552689%2C51565116%2C51565682%2C51580968%2C51772949&c=ANDROID_VR&txp=4532534&sparams=expire%2Cei%2Cip%2Cid%2Citag%2Csource%2Crequiressl%2Cxpc%2Cbui%2Cspc%2Cvprv%2Csvpuc%2Cmime%2Crqh%2Cgir%2Cclen%2Cdur%2Clmt&sig=AJEij0EwRQIhAMvb4fRwE3NkF9Ih1qtLEgC3MfGp9LwnmDXCKw1syEpLAiAvgRW3f-wWGM5XoQnHonZgEd6kD7IKQIJoXzGUfnSz8A%3D%3D&lsparams=cps%2Cmet%2Cmh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Crms%2Cinitcwndbps&lsig=APaTxxMwRQIgd7_WEbIHUv7lIsmPFmDXqhB61QquXGtT3tZ_hWia564CIQDgXOsXs2ZQ-65tISPS2eo8pVvSPlNqM8Chs1q6K1Jfpw%3D%3D",
		"colors": {
			"vibrant": {
				"main_color": "#1664a4",
				"title_text_color": "#fff",
				"body_text_color": "#fff"
			},
			"dark_vibrant": {
				"main_color": "#185490",
				"title_text_color": "#fff",
				"body_text_color": "#fff"
			},
			"light_vibrant": {
				"main_color": "#8fb8ce",
				"title_text_color": "#fff",
				"body_text_color": "#000"
			},
			"muted": {
				"main_color": "#6898b6",
				"title_text_color": "#fff",
				"body_text_color": "#fff"
			},
			"dark_muted": {
				"main_color": "#5c3434",
				"title_text_color": "#fff",
				"body_text_color": "#fff"
			},
			"light_muted": {
				"main_color": "#a4bcc4",
				"title_text_color": "#fff",
				"body_text_color": "#000"
			}
		},
		"created_at": 1770990339324
	});

	return {
		install(app: App) {
			app.provide(KEY_DATABASE, db);
		},
	};
}
