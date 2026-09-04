import { unwrapAsync } from '$lib/errors/unwrap';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	const match = await unwrapAsync(locals.services.replays().get(params.id));
	if (locals.user || match.hidden) {
		setHeaders({
			'cache-control': 'private, no-store'
		});
	} else {
		setHeaders({
			'cache-control': 'public, s-maxage=30, stale-while-revalidate=60'
		});
	}

	return { match };
};
