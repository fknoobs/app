import { appError } from '$lib/errors/app-error';
import { fetchJson } from '$lib/errors/fetch-json';
import type { PlayerPageData } from '$lib/player';
import { API_URL } from '$lib/site/urls';
import type { PlayerSearchResult } from '@company-of-heroes/ui/player';

export type { PlayerSearchResult };

export class PlayersService {
	constructor(private fetchFn: typeof fetch) {}

	search(query: string) {
		const params = new URLSearchParams({ q: query.trim() });
		return fetchJson<{ items: PlayerSearchResult[] }>(
			this.fetchFn,
			`${API_URL}/api/player/search?${params.toString()}`,
			{
				fallback: 'Failed to search for player',
				onStatus: (status) => {
					if (status === 400) {
						return appError(400, 'Enter a Steam ID64, Relic profile id, or player name.');
					}
				}
			}
		).map((data) => data.items ?? []);
	}

	get(id: string) {
		return fetchJson<PlayerPageData>(this.fetchFn, `${API_URL}/api/player/${id}`, {
			fallback: 'Failed to load player stats. Please try again later.',
			onStatus: (status) => {
				if (status === 404) {
					return appError(
						404,
						'Player not found. Check the Steam ID or profile id and try again.'
					);
				}

				if (status === 400) {
					return appError(400, 'Enter a valid Steam ID64 or Relic profile id.');
				}
			}
		});
	}
}
