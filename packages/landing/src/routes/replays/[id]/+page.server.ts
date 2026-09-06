import { unwrapAsync } from '$lib/errors/unwrap';
import type { PageServerLoad } from './$types';

export const prerender = false;

/** Stream the match promise so client navigation is not blocked on the API round-trip. */
export const load: PageServerLoad = ({ locals, params, setHeaders }) => {
	if (locals.user) {
		setHeaders({
			'cache-control': 'private, no-store'
		});
	} else {
		setHeaders({
			'cache-control': 'public, s-maxage=30, stale-while-revalidate=60'
		});
	}

	return {
		match: unwrapAsync(locals.services.replays().getAny(params.id))
	};
};
