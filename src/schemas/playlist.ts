import {
  type ExtractDocumentTypeFromTypedRxJsonSchema,
  type RxJsonSchema,
  toTypedRxJsonSchema,
} from "rxdb";

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
  },
  required: ["id", "title", "created_at"],
  indexes: ["title"],
} as const;

const schemaTyped = toTypedRxJsonSchema(playlistSchemaLiteral);

export type RxPlaylist = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>;

export const playlistSchema: RxJsonSchema<RxPlaylist> = playlistSchemaLiteral;
