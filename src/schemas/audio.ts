import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema
} from "rxdb";

export const audioSchemaLiteral = {
  title: "Audio schema",
  description: "Shannic audio model abstraction",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    title: { type: "string", maxLength: 255 },
    author: { type: "string", maxLength: 255 },
    artitst: { type: "string", maxLength: 255 },
    duration: { type: "integer", minimum: 0 },
    thumbnails: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string", format: "uri" },
          width: { type: "integer", minimum: 0 },
          height: { type: "integer", minimum: 0 },
        },
        required: ["url", "width", "height"],
      },
    },
    media: {
      type: "object",
      properties: {
        url: { type: "string", format: "uri" },
        expirationDate: { type: "integer", minimum: 0 },
      },
      required: ["url", "expirationDate"],
    },
    createdAt: { type: "integer", minimum: 0 },
    updatedAt: { type: "integer", minimum: 0 },
  },
  required: ["id", "title", "author", "duration", "thumbnails", "media", "createdAt"],
  indexes: ["title", "author"],
} as const;

const schemaTyped = toTypedRxJsonSchema(audioSchemaLiteral);

export type Audio = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>;

export const audioSchema: RxJsonSchema<Audio> = audioSchemaLiteral;