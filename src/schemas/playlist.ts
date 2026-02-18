import {
  type ExtractDocumentTypeFromTypedRxJsonSchema,
  type RxJsonSchema,
  toTypedRxJsonSchema,
} from "rxdb";
import type { PlaylistDocument } from "@/types";
import { shuffleArray } from "@/utils";

export const playlistSchemaLiteral = {
  title: "Playlist schema",
  description: "Shannic playlist model abstraction",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    title: {
      type: "string",
      maxLength: 255,
    },
    description: {
      type: "string",
      maxLength: 1000,
    },
    created_at: {
      type: "integer",
      minimum: 0,
    },
    updated_at: {
      type: "integer",
      minimum: 0,
    },
    audios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          audio_id: { type: "string" },
          position: { type: "integer", minimum: 0 },
        },
        required: ["audio_id", "position"],
      },
    },
    thumbnail: {
      type: "object",
      properties: {
        url: { type: "string", format: "uri" },
        width: { type: "integer", minimum: 0 },
        height: { type: "integer", minimum: 0 },
      },
      required: ["url", "width", "height"],
    },
  },
  required: ["id", "title", "created_at"],
  indexes: ["title"],
} as const;

export const playlistMethods = {
  toSortedArray(this: PlaylistDocument): string[] {
    return (
      this.audios
        ?.sort((a, b) => a.position - b.position)
        .map((a) => a.audio_id) ?? []
    );
  },
  toShuffledArray(this: PlaylistDocument): string[] {
    return shuffleArray(this.audios?.map((a) => a.audio_id) ?? []);
  },
};

const schemaTyped = toTypedRxJsonSchema(playlistSchemaLiteral);

export type RxPlaylist = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>;

export type RxPlaylistMethods = {
  toSortedArray: (this: PlaylistDocument) => string[];
  toShuffledArray: (this: PlaylistDocument) => string[];
};

export const playlistSchema: RxJsonSchema<RxPlaylist> = playlistSchemaLiteral;
