import { unwrapAsync } from '$lib/errors/unwrap';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=15, stale-while-revalidate=60'
	});

	return {
		lobby: await unwrapAsync(locals.services.liveLobbies().get(params.id))
	};
};
