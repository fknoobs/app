import { z } from 'zod';
import type { ResultAsync } from 'neverthrow';
import type { LiveStream } from '@company-of-heroes/ui/twitch/types';
import { normalizeBaseUrl, type ApiDeps } from '../deps';
import type { ApiError } from '../errors';
import { fetchJson } from '../fetch-json';

export type { LiveStream };

const liveStreamSchema: z.ZodType<LiveStream> = z
	.object({
		id: z.string(),
		userName: z.string(),
		userDisplayName: z.string(),
		title: z.string(),
		gameName: z.string(),
		viewers: z.number(),
		thumbnailUrl: z.string()
	})
	.passthrough() as z.ZodType<LiveStream>;

const streamsSchema = z.object({
	items: z.array(liveStreamSchema).optional()
});

export class TwitchApi {
	constructor(private deps: ApiDeps) {}

	listStreams(): ResultAsync<LiveStream[], ApiError> {
		return fetchJson(
			this.deps.fetch,
			`${normalizeBaseUrl(this.deps.baseUrl)}/api/twitch/streams`,
			{
				fallback: 'Failed to load live streams.',
				schema: streamsSchema
			}
		).map((data) => data.items ?? []);
	}
}
