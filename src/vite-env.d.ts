/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_GITHUB_API_REPO_URL: string;
  readonly VITE_GITHUB_REPO_URL: string;
  readonly VITE_SPOTIFY_CLIENT_ID: string;
  readonly VITE_YT_USER_AGENT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
