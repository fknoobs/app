import { API_URL } from '$lib/urls';
import type { PlayerPageData } from '$lib/player';
import type { PageServerLoad } from './$types';

export const prerender = false;

async function loadPlayer(fetchFn: typeof fetch, id: string): Promise<PlayerPageData> {
	const response = await fetchFn(`${API_URL}/api/player/${id}`);
	if (response.status === 404) {
		throw new Error('Player not found. Check the Steam ID or profile id and try again.');
	}
	if (response.status === 400) {
		throw new Error('Enter a valid Steam ID64 or Relic profile id.');
	}
	if (!response.ok) {
		throw new Error('Failed to load player stats. Please try again later.');
	}
	return (await response.json()) as PlayerPageData;
}

export const load: PageServerLoad = ({ fetch, params, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=30, stale-while-revalidate=60'
	});
	return {
		player: loadPlayer(fetch, params.id)
	};
};
