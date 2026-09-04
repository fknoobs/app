import { unwrapAsync } from '$lib/errors/unwrap';
import { parseReplaysQuery } from '$lib/replays';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = ({ locals, url, setHeaders }) => {
	if (!locals.user) {
		setHeaders({
			'cache-control': 'public, s-maxage=30, stale-while-revalidate=60'
		});
	}
	const query = parseReplaysQuery(url.searchParams);
	const replays = locals.services.replays();
	return {
		query,
		maps: unwrapAsync(replays.getMaps()),
		result: unwrapAsync(replays.getHistory(query))
	};
};
