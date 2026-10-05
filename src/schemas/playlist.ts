import {
  type ExtractDocumentTypeFromTypedRxJsonSchema,
  type RxJsonSchema,
  toTypedRxJsonSchema,
} from "rxdb";

export const playlist_schema_literal = {
  title: "Playlist schema",
  description: "Shannic playlist model abstraction",
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    name: {
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
  required: ["id", "name", "created_at"],
  indexes: ["name"],
} as const;

const schema_typed = toTypedRxJsonSchema(playlist_schema_literal);

export type RxPlaylist = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schema_typed
>;

export const playlist_schema: RxJsonSchema<RxPlaylist> = playlist_schema_literal;
