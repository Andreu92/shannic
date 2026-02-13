import {
	type ExtractDocumentTypeFromTypedRxJsonSchema,
	type RxJsonSchema,
	toTypedRxJsonSchema,
} from "rxdb";

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
	version: 0,
	primaryKey: "id",
	type: "object",
	properties: {
		id: { type: "string", maxLength: 100 },
		title: { type: "string", maxLength: 255 },
		author: { type: "string", maxLength: 255 },
		duration: { type: "integer", minimum: 0 },
		duration_text: { type: "string", maxLength: 20 },
		thumbnail: { type: "string", format: "uri" },
		url: { type: "string", format: "uri" },
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
		"duration_text",
		"thumbnail",
		"url",
		"expires_at",
		"colors",
		"created_at",
	],
	indexes: ["title", "author"],
} as const;

const schemaTyped = toTypedRxJsonSchema(audioSchemaLiteral);

export type RxAudio = ExtractDocumentTypeFromTypedRxJsonSchema<
	typeof schemaTyped
>;

export const audioSchema: RxJsonSchema<RxAudio> = audioSchemaLiteral;
