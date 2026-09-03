import { appError } from '$lib/errors/app-error';
import { fetchJson } from '$lib/errors/fetch-json';
import type { LeaderboardPageData } from '$lib/leaderboards';
import { API_URL } from '$lib/site/urls';

export class LeaderboardsService {
	constructor(private fetchFn: typeof fetch) {}

	get(boardId: number) {
		return fetchJson<LeaderboardPageData>(
			this.fetchFn,
			`${API_URL}/api/leaderboard/${boardId}`,
			{
				fallback: 'Failed to load the leaderboard. Please try again later.',
				onStatus: (status) => {
					if (status === 400) {
						return appError(400, 'That leaderboard is not available.');
					}
				}
			}
		);
	}
}
