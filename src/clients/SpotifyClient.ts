import { InAppBrowser, type UrlEvent } from "@capgo/inappbrowser";
import {
	type AccessToken,
	type Page,
	type SavedTrack,
	SpotifyApi,
} from "@spotify/web-api-ts-sdk";
import { useI18n } from "vue-i18n";
import { SPOTIFY_CONFIG_ID } from "@/constants";
import { useDatabase } from "@/database";
import useSpotifySyncStore from "@/stores/SpotifySyncStore";
import type { SpotifyDocument } from "@/types";

const useSpotifyClient = () => {
	const { t, locale } = useI18n();

	const SPOTIFY_DEVELOPER_URL = "https://developer.spotify.com";
	const SPOTIFY_TOKEN_URL: string = "https://accounts.spotify.com/api/token";
	const SPOTIFY_AUTH_URL: string = `https://accounts.spotify.com/${locale.value}/v2/login`;
	const SPOTIFY_CLIENT_ID: string = import.meta.env.SPOTIFY_CLIENT_ID;

	let spotify_token: AccessToken | null = null;
	let spotify_api: SpotifyApi | null = null;

	const spotify_sync_store = useSpotifySyncStore();
	const db = useDatabase();
	const spotify_db = db.spotify;

	spotify_db
		.findOne(SPOTIFY_CONFIG_ID)
		.exec()
		.then((spotify_doc: SpotifyDocument | null) => {
			if (spotify_doc?.token) {
				spotify_token = spotify_doc.token;
				spotify_api = SpotifyApi.withAccessToken(
					SPOTIFY_CLIENT_ID,
					spotify_doc.token,
				);
			}
		});

	const storeToken = async (token: AccessToken): Promise<void> => {
		const spotify_config: SpotifyDocument | null = await spotify_db
			.findOne(SPOTIFY_CONFIG_ID)
			.exec();

		spotify_config?.incrementalPatch({
			token: token,
		});
	};

	const isTokenExpired = (): boolean => {
		if (!spotify_token || !spotify_token.expires) return true;
		return Date.now() >= spotify_token.expires;
	};

	const accountAlreadyLinked = (): boolean => {
		return !!spotify_token;
	};

	const refreshToken = async (): Promise<void> => {
		if (!spotify_token?.refresh_token) {
			throw new Error("No refresh token available");
		}

		try {
			const body = new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: spotify_token.refresh_token,
				client_id: SPOTIFY_CLIENT_ID,
			});

			const response = await fetch(SPOTIFY_TOKEN_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body,
			});

			if (!response.ok) {
				throw new Error(`Failed to refresh token: ${response.statusText}`);
			}

			const data = (await response.json()) as AccessToken;

			spotify_token = {
				...data,
				expires: Date.now() + data.expires_in * 1000,
			};

			await storeToken(spotify_token);

			spotify_api = SpotifyApi.withAccessToken(
				SPOTIFY_CLIENT_ID,
				spotify_token,
			);
		} catch (error) {
			console.error("Error refreshing Spotify token:", error);
			throw error;
		}
	};

	const getSavedTracks = async (
		callback: (track: SavedTrack) => Promise<void>,
	): Promise<void> => {
		if (isTokenExpired()) {
			await refreshToken();
		}

		spotify_sync_store.is_syncing = true;

		let tracks: Page<SavedTrack> | undefined;

		const limit = 50;
		let offset = 0;

		do {
			tracks = await spotify_api?.currentUser.tracks.savedTracks(limit, offset);

			if (!spotify_sync_store.total_saved_tracks)
				spotify_sync_store.total_saved_tracks = tracks?.total ?? null;

			for (const track of tracks?.items ?? []) await callback(track);

			offset += limit;
		} while (tracks?.next);
	};

	const linkAccount = async (): Promise<void> => {
		if (accountAlreadyLinked()) return;

		InAppBrowser.openWebView({
			title: t("spotify.link"),
			toolbarColor: "#121212",
			toolbarTextColor: "#FFFFFF",
			url: SPOTIFY_AUTH_URL,
		});

		return new Promise((resolve) => {
			InAppBrowser.addListener("urlChangeEvent", (e: UrlEvent) => {
				const is_dev_url = e.url.startsWith(SPOTIFY_DEVELOPER_URL);
				if (e.url.includes("/status") && !is_dev_url) {
					InAppBrowser.setUrl({ url: SPOTIFY_DEVELOPER_URL });
				}

				if (is_dev_url) {
					InAppBrowser.addListener("messageFromWebview", (event) => {
						if (event.detail?.type === "SPOTIFY_AUTH_SUCCESS") {
							const token = JSON.parse(event.detail.response) as AccessToken;

							spotify_token = {
								...token,
								expires: Date.now() + token.expires_in * 1000,
							};

							storeToken(spotify_token);

							spotify_api = SpotifyApi.withAccessToken(
								SPOTIFY_CLIENT_ID,
								spotify_token,
							);

							InAppBrowser.removeAllListeners();
							InAppBrowser.close();
							resolve();
						}
					});

					InAppBrowser.executeScript({
						code: `(function() {
							const originalFetch = window.fetch;
							window.fetch = async function(input, init) {
								const response = await originalFetch.apply(this, arguments);
								const url = input.toString();
								if (url && url.includes("${SPOTIFY_TOKEN_URL}")) {
									const clone = response.clone();
									const response_body = await clone.text();
									window.mobileApp.postMessage({ detail: {type: "SPOTIFY_AUTH_SUCCESS", response: response_body }});
								}
							}
							
							const style = document.createElement('style');
							style.innerHTML = \`
								#shannic-loader {
									position: fixed; top: 0; left: 0; width: 100%; height: 100%;
									background: #000000; z-index: 999999;
									display: flex; flex-direction: column; align-items: center; justify-content: center;
									font-family: sans-serif; color: #1DB954;
								}
								.shannic-spinner {
									width: 50px; height: 50px;
									border: 5px solid rgba(29, 185, 84, 0.2);
									border-top: 5px solid #1DB954;
									border-radius: 50%;
									animation: spin 1s linear infinite;
									margin-bottom: 20px;
								}
								@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
							\`;
							document.head.appendChild(style);

							const loader = document.createElement('div');
							loader.id = 'shannic-loader';
							loader.innerHTML = '<div class="shannic-spinner"></div>';
							document.body.appendChild(loader);
						})();`,
					});
				}
			});
		});
	};

	return {
		isTokenExpired,
		linkAccount,
		getSavedTracks,
		accountAlreadyLinked,
		refreshToken,
	};
};

export default useSpotifyClient;
