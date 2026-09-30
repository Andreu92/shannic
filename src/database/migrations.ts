import { FAKE_SRC } from "@/constants";

export const audioMigrations = {
  1: (oldDoc: {
    duration_text?: string;
    duration: number;
    url?: string;
    src?: string;
    expires_at?: number;
  }) => {
    delete oldDoc.duration_text;

    oldDoc.duration = Math.floor(oldDoc.duration / 1000);

    if (oldDoc.url && oldDoc.url.startsWith("file")) {
      oldDoc.src = oldDoc.url;
      oldDoc.expires_at = undefined;
    } else {
      oldDoc.src = FAKE_SRC;
      oldDoc.expires_at = 0;
    }

    delete oldDoc.url;
    return oldDoc;
  },
};