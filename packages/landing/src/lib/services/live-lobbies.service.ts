import { errAsync, ok } from 'neverthrow';
import { appError } from '$lib/errors/app-error';
import { fetchJson } from '$lib/errors/fetch-json';
import { API_URL } from '$lib/site/urls';
import type { LiveLobbyRecord } from '@company-of-heroes/ui/live-lobby';

export type { LiveLobbyRecord };

export class LiveLobbiesService {
	constructor(private fetchFn: typeof fetch) {}

	get(id: string) {
		return fetchJson<LiveLobbyRecord>(
			this.fetchFn,
			`${API_URL}/api/live-lobbies/${encodeURIComponent(id)}`,
			{
				fallback: 'Failed to load live lobby.',
				onStatus: (status) => {
					if (status === 404) {
						return appError(404, 'This match is no longer live.');
					}
				}
			}
		).andThen((lobby) => {
			if (!lobby?.id || !lobby.sessionId) {
				return errAsync(appError(404, 'This match is no longer live.'));
			}

			return ok(lobby);
		});
	}

	list() {
		return fetchJson<{ items?: LiveLobbyRecord[] }>(this.fetchFn, `${API_URL}/api/live-lobbies`, {
			fallback: 'Failed to load live lobbies.'
		}).map((data) => data.items ?? []);
	}
}
