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
		description: {
			type: "string",
			maxLength: 1000,
		},
		createdAt: {
			type: "integer",
			minimum: 0,
		},
		updatedAt: {
			type: "integer",
			minimum: 0,
		},
		audios: {
			type: "array",
			items: {
				type: "object",
				properties: {
					audioId: { type: "string" },
					position: { type: "integer", minimum: 0 },
				},
				required: ["audioId", "position"],
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
	required: ["id", "title", "createdAt"],
	indexes: ["title"],
} as const;

const schemaTyped = toTypedRxJsonSchema(playlistSchemaLiteral);

export type RxPlaylist = ExtractDocumentTypeFromTypedRxJsonSchema<
	typeof schemaTyped
>;

export const playlistSchema: RxJsonSchema<RxPlaylist> = playlistSchemaLiteral;
