import {
	type ExtractDocumentTypeFromTypedRxJsonSchema,
	type RxJsonSchema,
	toTypedRxJsonSchema,
} from "rxdb";

export const spotifySchemaLiteral = {
	title: "Spotify schema",
	description: "Shannic spotify model abstraction",
	version: 0,
	primaryKey: "id",
	type: "object",
	properties: {
		id: { type: "string", maxLength: 100 },
		saved_tracks_last_sync: { type: "integer", minimum: 0 },
		token: {
			type: "object",
			properties: {
				access_token: { type: "string", maxLength: 2048 },
				token_type: { type: "string", maxLength: 50 },
				expires_in: { type: "integer", minimum: 0 },
				refresh_token: { type: "string", maxLength: 2048 },
				expires: { type: "integer", minimum: 0 },
			},
			required: ["access_token", "token_type", "refresh_token", "expires_in"],
		},
	},
	required: ["id"],
} as const;

const schemaTyped = toTypedRxJsonSchema(spotifySchemaLiteral);

export type RxSpotify = ExtractDocumentTypeFromTypedRxJsonSchema<
	typeof schemaTyped
>;

export const spotifySchema: RxJsonSchema<RxSpotify> = spotifySchemaLiteral;
