import { API_URL } from '$lib/urls';
import {
	parseReplaysQuery,
	buildMatchHistoryUrl,
	type CommunityMatchList,
	type HistoryMapOption
} from '$lib/replays';
import type { PageServerLoad } from './$types';

export const prerender = false;

async function loadHistory(
	fetchFn: typeof fetch,
	url: string
): Promise<CommunityMatchList> {
	const response = await fetchFn(url);
	if (!response.ok) {
		throw new Error('Failed to load community replays. Please try again later.');
	}
	return (await response.json()) as CommunityMatchList;
}

async function loadMaps(fetchFn: typeof fetch): Promise<HistoryMapOption[]> {
	const response = await fetchFn(`${API_URL}/api/history-maps?scope=community&limit=100`);
	if (!response.ok) return [];
	const data = (await response.json()) as { items?: HistoryMapOption[] };
	return data.items ?? [];
}

export const load: PageServerLoad = ({ fetch, url, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=30, stale-while-revalidate=60'
	});
	const query = parseReplaysQuery(url.searchParams);
	return {
		query,
		maps: loadMaps(fetch),
		result: loadHistory(fetch, buildMatchHistoryUrl(query))
	};
};
