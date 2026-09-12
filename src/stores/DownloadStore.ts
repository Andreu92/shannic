import { FileTransfer } from "@capacitor/file-transfer";
import { defineStore } from "pinia";
import { reactive } from "vue";
import useAudioService from "@/services/AudioService";

export const useDownloadStore = defineStore("downloads", () => {
  const audio_service = useAudioService();

  FileTransfer.addListener("progress", (progress) => {
    status.progress = progress.bytes / progress.contentLength;
  });

  const status = reactive({
    is_downloading: false,
    current: null as string | null,
    queue: [] as string[],
    progress: 0,
  });

  const downloadMultiple = (audio_ids: string[]) => {
    audio_ids.forEach((audio_id: string) => {
      addToQueue(audio_id);
    });
  };

  const addToQueue = (audio_id: string) => {
    if (status.queue.includes(audio_id)) return;
    status.queue.push(audio_id);
    if (!status.is_downloading) {
      download();
    }
  };

  const download = async () => {
    if (status.queue.length === 0) {
      status.is_downloading = false;
      return;
    }

    const audio_id = status.queue[0];
    if (!audio_id) return;

    status.is_downloading = true;
    status.current = audio_id;

    const audio = await audio_service.getCreateOrUpdate(audio_id);

    audio.downloadFile()
      .catch((error) => {
        // TODO: Show error toast
        console.error("Download failed", error);
      })
      .finally(() => {
        status.current = null;
        status.progress = 0;
        status.queue.shift();
        download();
      });
  };

  return { status, addToQueue, downloadMultiple };
});
