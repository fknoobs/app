import { API_URL } from '$lib/urls';
import { parseBoardId, type LeaderboardPageData } from '$lib/leaderboards';
import type { PageServerLoad } from './$types';

export const prerender = false;

async function loadBoard(fetchFn: typeof fetch, boardId: number): Promise<LeaderboardPageData> {
	const response = await fetchFn(`${API_URL}/api/leaderboard/${boardId}`);
	if (response.status === 400) {
		throw new Error('That leaderboard is not available.');
	}
	if (!response.ok) {
		throw new Error('Failed to load the leaderboard. Please try again later.');
	}
	return (await response.json()) as LeaderboardPageData;
}

export const load: PageServerLoad = ({ fetch, url }) => {
	const boardId = parseBoardId(url.searchParams.get('board'));
	return {
		boardId,
		board: loadBoard(fetch, boardId)
	};
};
