import { fetch as plugin_fetch } from "@tauri-apps/plugin-http";
import { isTauri } from "@tauri-apps/api/core";

export const httpFetch = (
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  if (isTauri()) {
    return plugin_fetch(input, init as never);
  }
  return globalThis.fetch(input, init);
};
