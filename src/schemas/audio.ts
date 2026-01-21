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
		url: { type: "string", format: "uri" },
		expirationDate: { type: "integer", minimum: 0 },
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
		colors: {
			type: "object",
			properties: {
				background: { type: "string", maxLength: 10 },
				text: { type: "string", maxLength: 10 },
				body: { type: "string", maxLength: 10 },
			},
			required: ["background", "text", "body"],
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
		"url",
		"expirationDate",
		"thumbnails",
		"createdAt",
	],
	indexes: ["title", "author"],
} as const;

const schemaTyped = toTypedRxJsonSchema(audioSchemaLiteral);

export type RxAudio = ExtractDocumentTypeFromTypedRxJsonSchema<
	typeof schemaTyped
>;

export const audioSchema: RxJsonSchema<RxAudio> = audioSchemaLiteral;
