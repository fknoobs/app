import { fetchJson } from '$lib/errors/fetch-json';
import { API_URL } from '$lib/site/urls';
import type { LiveStream } from '@company-of-heroes/ui/twitch';

export type { LiveStream };

export class TwitchService {
	constructor(private fetchFn: typeof fetch) {}

	listStreams() {
		return fetchJson<{ items: LiveStream[] }>(this.fetchFn, `${API_URL}/api/twitch/streams`, {
			fallback: 'Failed to load live streams.'
		}).map((data) => data.items ?? []);
	}
}
