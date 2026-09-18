import { InAppBrowser, type UrlEvent } from "@capgo/inappbrowser";
import { useI18n } from "vue-i18n";
import { BROWSER_USER_AGENT } from "@/constants";
import useNetworkStore from "@/stores/NetworkStore";
import useSpotifySyncStore from "@/stores/SpotifySyncStore";
import type { AccessToken } from "@/types";
import type {
  SpotifyAccessToken,
  SpotifyClientToken,
  Track,
  UserLibraryTrackPage,
} from "@/spotify-types";
import useFavoritesStore from "@/stores/FavoritesStore";
import useAudioService from "@/services/AudioService";
import { KeepAwake } from "@capgo/capacitor-keep-awake";
import { youtube_plugin, YoutubeAudioItem } from "@/plugins/YoutubePlugin";
import { showToast } from "@/utils";
import { CapacitorHttp } from "@capacitor/core";

let spotify_user_token: AccessToken | null = null;
let spotify_client_token: AccessToken | null = null;

const useSpotifyService = () => {
  const { t, locale } = useI18n();

  const SPOTIFY_APP_URL = "https://open.spotify.com";
  const SPOTIFY_AUTH_URL = `https://accounts.spotify.com/${locale.value.replace("_", "-")}/login`;

  const SPOTIFY_GRAPHQL_URL =
    "https://api-partner.spotify.com/pathfinder/v2/query";

  const DEFAULT_HEADERS = {
    Accept: "application/json",
    "Content-Type": "application/json;charset=UTF-8",
    "Accept-Language": "en",
    Priority: "u=1, i",
    Referrer: SPOTIFY_APP_URL,
    "User-Agent": BROWSER_USER_AGENT,
  };

  const audio_service = useAudioService();

  const network_store = useNetworkStore();
  const favorites_store = useFavoritesStore();
  const spotify_sync_store = useSpotifySyncStore();

  const isTokenExpired = (): boolean => {
    const user_token_expired =
      Date.now() >= (spotify_user_token?.expires_at ?? 0);
    const client_token_expired =
      Date.now() >= (spotify_client_token?.expires_at ?? 0);
    return user_token_expired || client_token_expired;
  };

  const isLinked = async (): Promise<boolean> => {
    const cookies = await InAppBrowser.getCookies({
      url: SPOTIFY_APP_URL,
    });

    if (cookies && Object.hasOwn(cookies, "sp_dc")) return true;
    return false;
  };

  const getSavedTracks = async (
    callback: (track: Track) => Promise<void>,
  ): Promise<void> => {
    let offset: number | null = 0;
    do {
      const { status, data } = await CapacitorHttp.post({
        url: SPOTIFY_GRAPHQL_URL,
        headers: {
          ...DEFAULT_HEADERS,
          Authorization: `Bearer ${spotify_user_token!.access_token}`,
          "Client-Token": spotify_client_token!.access_token,
        },
        data: {
          variables: {
            offset,
          },
          operationName: "getLikedSongs",
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash:
                "c2c53c28f71da143c0753c22dc84d98b315cb4275472ea5a597c29338ae20b23",
            },
          },
        },
      });

      if (status !== 200) {
        showToast(t("spotify.import_error"));
        console.error(data);
        return;
      }

      const tracks: UserLibraryTrackPage = data.data.me.library.tracks;

      if (!spotify_sync_store.total_saved_tracks)
        spotify_sync_store.total_saved_tracks = tracks.totalCount;

      for (const item of tracks.items ?? []) {
        if (spotify_sync_store.cancel_sync) break;
        await callback(item.track.data);
      }

      offset = tracks.pagingInfo.nextOffset;
    } while (offset != null && !spotify_sync_store.cancel_sync);
  };

  const importSavedTracks = async () => {
    if (!network_store.is_online) {
      showToast(t("network.offline"), "warning");
      return;
    }

    if (spotify_sync_store.is_syncing) return;
    spotify_sync_store.is_syncing = true;

    const is_linked = await isLinked();
    if (!is_linked) await fetchTokens(false);
    else if (isTokenExpired()) await fetchTokens(true);

    KeepAwake.keepAwake();

    getSavedTracks(async (track: Track) => {
      try {
        const yt_audio_item: YoutubeAudioItem = await youtube_plugin.getByQuery(
          {
            artist: track.artists.items[0].profile.name,
            title: track.name,
          },
        );

        if (!favorites_store.isFavorite(yt_audio_item.id)) {
          const created_audio = await audio_service.create(yt_audio_item);
          await favorites_store.add(created_audio.id);
        }
      } catch (error) {
        //TO DO: Show songs that failed to import
        showToast(t("spotify.sync.error") + error);
      } finally {
        spotify_sync_store.incrementCounter();
      }
    }).finally(() => {
      spotify_sync_store.finishSync();
      KeepAwake.allowSleep();
    });
  };

  const fetchTokens = async (hidden: boolean): Promise<void> => {
    const USER_TOKEN_TYPE = "USER_TOKEN";
    const CLIENT_TOKEN_TYPE = "CLIENT_TOKEN";

    let resolveUserToken!: (v: SpotifyAccessToken) => void;
    let resolveClientToken!: (v: SpotifyClientToken) => void;
    let rejectAll!: (e: Error) => void;

    const userTokenP = new Promise<SpotifyAccessToken>(
      (r) => (resolveUserToken = r),
    );
    const clientTokenP = new Promise<SpotifyClientToken>(
      (r) => (resolveClientToken = r),
    );
    const guard = new Promise<never>((_, reject) => (rejectAll = reject));

    InAppBrowser.addListener("closeEvent", () => {
      showToast(t("spotify.link_process_failed"), "warning");
      spotify_sync_store.finishSync();
      rejectAll(new Error("Webview closed before tokens arrived"));
    });

    await InAppBrowser.addListener("messageFromWebview", (event) => {
      const { type, response } = event.detail ?? {};
      if (type === USER_TOKEN_TYPE) resolveUserToken(JSON.parse(response));
      if (type === CLIENT_TOKEN_TYPE) resolveClientToken(JSON.parse(response));
    });

    const patch_code = `(function() {
        const post = (type, response) => {
          try { window.mobileApp.postMessage({ detail: { type, response } }); } catch (e) {}
        };

        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
          const response = await originalFetch.apply(this, args);
          try {
            const url = args[0].toString();
            if (url.includes("/api/token")) {
              post("${USER_TOKEN_TYPE}", await response.clone().text());
            }
            if (url.includes("/clienttoken")) {
              post("${CLIENT_TOKEN_TYPE}", await response.clone().text());
            }
          } catch (e) {}
          return response;
        };
      })();`;

    await InAppBrowser.addListener("urlChangeEvent", (e: UrlEvent) => {
      if (e.url.includes("/status")) {
        InAppBrowser.setUrl({ url: SPOTIFY_APP_URL });
        InAppBrowser.hide();
      }

      if (e.url.startsWith(SPOTIFY_APP_URL))
        InAppBrowser.executeScript({
          code: patch_code,
        });
    });

    InAppBrowser.openWebView({
      title: t("spotify.link"),
      toolbarColor: "#121212",
      toolbarTextColor: "#FFFFFF",
      url: SPOTIFY_AUTH_URL,
      enabledSafeBottomMargin: true,
      hidden,
    });

    try {
      const [userToken, clientToken] = await Promise.race([
        Promise.all([userTokenP, clientTokenP]),
        guard,
      ]);

      spotify_user_token = {
        client_id: userToken.clientId,
        access_token: userToken.accessToken,
        expires_at: userToken.accessTokenExpirationTimestampMs,
      };

      spotify_client_token = {
        access_token: clientToken.granted_token.token,
        expires_at:
          Date.now() + clientToken.granted_token.expires_after_seconds * 1000,
      };
    } finally {
      InAppBrowser.removeAllListeners();
      InAppBrowser.close();
    }
  };

  return {
    getSavedTracks,
    importSavedTracks,
  };
};

export default useSpotifyService;
