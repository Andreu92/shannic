import {
	type ExtractDocumentTypeFromTypedRxJsonSchema,
	type RxJsonSchema,
	toTypedRxJsonSchema,
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
		artist: { type: "string", maxLength: 255 },
		duration: { type: "integer", minimum: 0 },
		durationText: { type: "string", maxLength: 20 },
		thumbnail: {
			type: "object",
			properties: {
				url: { type: "string", format: "uri" },
				base64: { type: "string" },
			},
			required: ["url"],
		},
		url: { type: "string", format: "uri" },
		expirationDate: { type: "integer", minimum: 0 },
		colors: {
			type: "object",
			properties: {
				background: { type: "string", maxLength: 10 },
				text: { type: "string", maxLength: 10 },
			},
			required: ["background", "text"],
		},
		createdAt: { type: "integer", minimum: 0 },
		updatedAt: { type: "integer", minimum: 0 },
	},
	required: [
		"id",
		"title",
		"author",
		"artist",
		"duration",
		"durationText",
		"thumbnail",
		"url",
		"expirationDate",
		"colors",
		"createdAt",
	],
	indexes: ["title", "author", "artist"],
} as const;

const schemaTyped = toTypedRxJsonSchema(audioSchemaLiteral);

export type RxAudio = ExtractDocumentTypeFromTypedRxJsonSchema<
	typeof schemaTyped
>;

export const audioSchema: RxJsonSchema<RxAudio> = audioSchemaLiteral;
