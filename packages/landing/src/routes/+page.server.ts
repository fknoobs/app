import { HOME_RECENT_MATCHES, recentCommunityQuery } from '$lib/replays';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=15, stale-while-revalidate=60'
	});
	const replays = locals.services.replays();
	const [liveLobbies, recentMatches, streams] = await Promise.all([
		locals.services.liveLobbies().list().unwrapOr([]),
		replays
			.getHistory(recentCommunityQuery(), HOME_RECENT_MATCHES)
			.map((list) => list.items)
			.unwrapOr([]),
		locals.services.twitch().listStreams().unwrapOr([])
	]);

	return { liveLobbies, recentMatches, streams };
};
