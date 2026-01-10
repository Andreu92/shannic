import { SearchResult, Audio } from "@/types";
import { AudioClient, Search } from "@shannic/audio-client";

export const useAudioClient = () => {
  let next_token: string | null | undefined = null;

  const get = async (id: string): Promise<Audio> => {
    const audio = await AudioClient.get({ id: id });
    sanitize(audio);
    return audio;
  };

  const search = async (query: string): Promise<SearchResult[]> => {
    const search_data: Search = await AudioClient.search({ query: query, next_token: next_token });
    const search_results: SearchResult[] = search_data.results;
    search_results.forEach(item => sanitize(item));
    next_token = search_data.next_token;
    return search_results;
  };

  const clearToken = (): void => {
    next_token = null;
  };

  const sanitize = (result: SearchResult | Audio) => {
    const regex = /^(.+?)\s*-\s*(.+)$/;
    const match = result.title.match(regex);

    if (match) {
      result.title = match[2].trim();
      result.artist = match[1].trim();
    } else {
      result.artist = result.author;
    }
  };

  return { search, get, clearToken };
};
