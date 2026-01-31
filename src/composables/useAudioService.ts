import { useAudioClient } from "@/composables/useAudioClient";
import { useDatabase } from "@/database";
import type { RxAudio } from "@/schemas/audio";
import type { Audio, AudioCollection, AudioDocument } from "@/types";

export const useAudioService = () => {
	const audio_client = useAudioClient();
	const db = useDatabase();
	const audio_collection: AudioCollection = db.audios;

	const getAudio = async (id: string): Promise<AudioDocument> => {
		const audio: AudioDocument | null = await audio_collection
			.findOne(id)
			.exec();
		if (!audio) return await createAudio(id);
		if (Date.now() >= audio.expirationDate) return await updateAudio(id);
		return audio;
	};

	const getAudiosByIds = async (ids: string[]): Promise<AudioDocument[]> => {
		const audios: AudioDocument[] = await audio_collection
			.find({
				selector: {
					id: { $in: ids },
				},
			})
			.exec();

		return audios;
	};

	const createAudio = async (id: string): Promise<AudioDocument> => {
		const audio: Audio = await audio_client.get(id);
		return await audio_collection.insertIfNotExists({
			...audio,
			createdAt: Date.now(),
		});
	};

	const updateAudio = async (id: string): Promise<AudioDocument> => {
		const audio: AudioDocument | null = await audio_collection
			.findOne(id)
			.exec();

		if (!audio) throw new Error("Audio not found");

		const updated_audio: Audio = await audio_client.get(id);

		return await audio.incrementalModify((audioDoc: RxAudio) => {
			audioDoc.title = updated_audio.title;
			audioDoc.author = updated_audio.author;
			audioDoc.artist = updated_audio.artist;
			audioDoc.duration = updated_audio.duration;
			audioDoc.durationText = updated_audio.durationText;
			audioDoc.thumbnail = updated_audio.thumbnail;
			audioDoc.url = updated_audio.url;
			audioDoc.expirationDate = updated_audio.expirationDate;
			audioDoc.updatedAt = Date.now();
			return audioDoc;
		});
	};

	return {
		getAudio,
		getAudiosByIds,
		createAudio,
		updateAudio,
	};
};
