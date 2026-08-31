import { error } from '@sveltejs/kit';
import { API_URL } from '$lib/urls';
import type { CommunityMatchDetail } from '$lib/replays';
import type { PageServerLoad } from './$types';

export const prerender = false;

async function loadMatch(fetchFn: typeof fetch, id: string): Promise<CommunityMatchDetail> {
	const response = await fetchFn(`${API_URL}/api/match/${id}`);
	if (response.status === 404) {
		error(404, 'That replay is not available.');
	}
	if (!response.ok) {
		throw new Error('Failed to load this replay. Please try again later.');
	}
	const match = (await response.json()) as CommunityMatchDetail;
	if (!match.replay) {
		error(404, 'That replay is not available.');
	}
	return match;
}

export const load: PageServerLoad = async ({ fetch, params, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=30, stale-while-revalidate=60'
	});
	return {
		match: await loadMatch(fetch, params.id)
	};
};
