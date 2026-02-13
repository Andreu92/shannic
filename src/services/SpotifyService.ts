import type { SavedTrack } from "@spotify/web-api-ts-sdk";
import useSpotifyClient from "@/clients/SpotifyClient";
import useYoutubeClient from "@/clients/YoutubeClient";
import useAudioService from "@/services/AudioService";
import useFavoritesStore from "@/stores/FavoritesStore";
import useSpotifySyncStore from "@/stores/SpotifySyncStore";

const useSpotifyService = () => {
	const spotify_client = useSpotifyClient();
	const youtube_client = useYoutubeClient();
	const favorites_store = useFavoritesStore();
	const spotify_sync_store = useSpotifySyncStore();
	const audio_service = useAudioService();

	const importSavedTracks = async () => {
		await spotify_client.linkAccount();

		spotify_client.getSavedTracks(async (track: SavedTrack) => {
			try {
				const audio = await youtube_client.getByQuery(
					track.track.artists[0].name,
					track.track.name,
				);

				if (favorites_store.isFavorite(audio.id)) {
					spotify_sync_store.incrementCounter();
					return;
				}

				console.log(await audio_service.createAudio(audio));

				favorites_store.addFavorite(audio.id, () => {
					spotify_sync_store.incrementCounter();
				});
			} catch (error) {
				console.log(error);
				spotify_sync_store.incrementCounter();
			}
		});
	};

	return {
		importSavedTracks,
	};
};

export default useSpotifyService;
