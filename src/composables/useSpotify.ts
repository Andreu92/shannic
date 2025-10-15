import { SpotifyAuthToken } from "@/types";
import { InAppBrowser, UrlEvent } from "@capgo/inappbrowser";
import { useI18n } from "vue-i18n";

const SPOTIFY_API_URL: string = "https://api.spotify.com/v1/me"
const SPOTIFY_AUTH_URL: string =
  "https://accounts.spotify.com/es/v2/login?continue=https%3A%2F%2Fopen.spotify.com%2Fintl-es%2F";
const SPOTIFY_STATUS_URL: string = "https://accounts.spotify.com/es-ES/status";
const SPOTIFY_BASE_URL: string = "https://open.spotify.com";

let spotify_token: SpotifyAuthToken | null = null;

const useSpotify = () => {
  const { t } = useI18n();
  
  const getToken = () => {
    return spotify_token;
  };

  const isTokenExpired = (): boolean => {
    if (!spotify_token) return true;
    return spotify_token.accessTokenExpirationTimestampMs >= Date.now();
  }

  const getFavoriteTracks = async () => {
    const all = [];
    let url = `${SPOTIFY_API_URL}/tracks?limit=50`;
    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${spotify_token?.accessToken}` },
      });
      const json = await res.json();
      all.push(...json.items);
      url = json.next;
    }
    return all;
  }

  const getPlaylists = async () => {
    const all = [];
    let url = `${SPOTIFY_API_URL}/playlists?limit=50`;
    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${spotify_token?.accessToken}` },
      });
      const json = await res.json();
      all.push(...json.items);
      url = json.next;
    }
    return all;
  }

  const linkAccount = async () => {
    InAppBrowser.openWebView({
      title: t("spotify.link"),
      toolbarColor: "#121212",
      toolbarTextColor: "#FFFFFF",
      url: SPOTIFY_AUTH_URL,
    });

    InAppBrowser.addListener("urlChangeEvent", (e: UrlEvent) => {
      if (e.url.startsWith(SPOTIFY_STATUS_URL)) {
        InAppBrowser.setUrl({url: SPOTIFY_BASE_URL});
      }
      
      if (e.url.startsWith(SPOTIFY_BASE_URL)) {
        InAppBrowser.executeScript({
          code: `(function() {
            const originalFetch = window.fetch;
            window.fetch = async function(input, init) {
              const response = await originalFetch.apply(this, arguments);
              const url = input.toString();
              if (url && url.includes("/api/token")) {
                const clone = response.clone();
                const response_body = await clone.text();
                window.mobileApp.postMessage({ detail: {type: "SPOTIFY_AUTH_SUCCESS", url: url, response: response_body }});
              }
              return response;
            };
          })();`,
        });
      }
    });

    InAppBrowser.addListener("messageFromWebview", (event) => {
      if (event.detail?.type == "SPOTIFY_AUTH_SUCCESS") {
        spotify_token = JSON.parse(event.detail.response);
        InAppBrowser.close();
      }
    });
  };

  return { getToken, isTokenExpired, linkAccount, getFavoriteTracks, getPlaylists };
};

export default useSpotify;
