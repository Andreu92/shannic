import { BROWSER_USER_AGENT, FAKE_SRC } from "@/constants";
import { AudioDocument } from "@/types";
import {
  type ExtractDocumentTypeFromTypedRxJsonSchema,
  KeyFunctionMap,
  type RxJsonSchema,
  toTypedRxJsonSchema,
} from "rxdb";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileTransfer } from "@capacitor/file-transfer";

const colorThemeSchema = {
  type: "object",
  properties: {
    main_color: { type: "string", maxLength: 10 },
    title_text_color: { type: "string", maxLength: 10 },
    body_text_color: { type: "string", maxLength: 10 },
  },
  required: ["main_color", "title_text_color", "body_text_color"],
} as const;

export const audioSchemaLiteral = {
  title: "Audio schema",
  description: "Shannic audio model abstraction",
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    title: { type: "string", maxLength: 255 },
    author: { type: "string", maxLength: 255 },
    duration: { type: "integer", minimum: 0 },
    thumbnail: { type: "string", format: "uri" },
    src: { type: "string", format: "uri", default: FAKE_SRC },
    expires_at: { type: "integer", minimum: 0 },
    colors: {
      type: "object",
      properties: {
        dark_muted: colorThemeSchema,
        dark_vibrant: colorThemeSchema,
        light_muted: colorThemeSchema,
        light_vibrant: colorThemeSchema,
        muted: colorThemeSchema,
        vibrant: colorThemeSchema,
      },
    },
    created_at: { type: "integer", minimum: 0 },
    updated_at: { type: "integer", minimum: 0 },
  },
  required: [
    "id",
    "title",
    "author",
    "duration",
    "thumbnail",
    "src",
    "colors",
    "created_at",
  ],
  indexes: ["title", "author"],
} as const;

export const audioMethods: KeyFunctionMap = {
  isUnresolved(this: AudioDocument): boolean {
    return this.src.startsWith(FAKE_SRC);
  },

  isDownloaded(this: AudioDocument): boolean {
    return this.src.startsWith("file");
  },

  isExpired(this: AudioDocument): boolean {
    if (this.isUnresolved()) return true;
    if (this.isDownloaded()) return false;
    return (this.expires_at ?? 0 - 10) < Date.now() / 1000;
  },

  async downloadThumbnail(this: AudioDocument) {
    if (this.thumbnail.startsWith("http")) {
      const file_info = await Filesystem.getUri({
        directory: Directory.Data,
        path: `img/${this.id}`,
      });

      const download_result = await FileTransfer.downloadFile({
        url: this.thumbnail,
        path: file_info.uri,
      });

      this.incrementalPatch({ thumbnail: download_result.path });
    }
  },

  deleteThumbnail(this: AudioDocument) {
    Filesystem.deleteFile({
      path: `img/${this.id}`,
      directory: Directory.Data,
    }).catch((reason) => console.error(reason));
  },

  async downloadFile(this: AudioDocument) {
    const file_info = await Filesystem.getUri({
      directory: Directory.Data,
      path: this.id,
    });

    const download_result = await FileTransfer.downloadFile({
      url: this.src,
      path: file_info.uri,
      progress: true,
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "identity",
        Range: "bytes=0-",
      },
    });

    if (download_result.path) this.refreshSrc(download_result.path);
  },

  async deleteFile(this: AudioDocument) {
    if (this.isDownloaded()) {
      await Filesystem.deleteFile({
        path: this.id,
        directory: Directory.Data,
      })
        .catch((reason) => {
          console.error(reason);
        })
        .finally(() => {
          this.refreshSrc(FAKE_SRC + this.id, 0);
        });
    }
  },

  refreshSrc(this: AudioDocument, src: string, expires_at?: number) {
    this.incrementalPatch({
      src: src,
      expires_at: expires_at,
      updated_at: Date.now(),
    });
  },
};

const schemaTyped = toTypedRxJsonSchema(audioSchemaLiteral);

export type RxAudio = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>;

export type RxAudioMethods = {
  isUnresolved: (this: AudioDocument) => boolean;
  isDownloaded: (this: AudioDocument) => boolean;
  isExpired: (this: AudioDocument) => boolean;
  downloadThumbnail: (this: AudioDocument) => Promise<void>;
  deleteThumbnail: (this: AudioDocument) => void;
  downloadFile: (this: AudioDocument) => Promise<void>;
  deleteFile: (this: AudioDocument) => Promise<void>;
  refreshSrc: (this: AudioDocument, src: string, expires_at?: number) => void;
};

export const audioSchema: RxJsonSchema<RxAudio> = audioSchemaLiteral;
