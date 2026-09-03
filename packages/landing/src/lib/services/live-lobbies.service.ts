import { appError } from '$lib/errors/app-error';
import { fetchJson } from '$lib/errors/fetch-json';
import { API_URL } from '$lib/site/urls';
import type { LiveLobbyPlayer } from '@company-of-heroes/ui/live-lobby';

export type LiveLobbyRecord = {
	id: string;
	sessionId: string;
	map: string;
	isRanked: boolean;
	createdAt: string;
	updatedAt: string;
	hostName: string;
	players: LiveLobbyPlayer[];
};

export class LiveLobbiesService {
	constructor(private fetchFn: typeof fetch) {}

	get(id: string) {
		return fetchJson<LiveLobbyRecord>(this.fetchFn, `${API_URL}/api/live-lobbies/${id}`, {
			fallback: 'Failed to load live lobby.',
			onStatus: (status) => {
				if (status === 404) {
					return appError(404, 'This match is no longer live.');
				}
			}
		});
	}

	list() {
		return fetchJson<{ items: LiveLobbyRecord[] }>(this.fetchFn, `${API_URL}/api/live-lobbies`, {
			fallback: 'Failed to load live lobbies.'
		}).map((data) => data.items ?? []);
	}
}
