import { unwrapAsync } from '$lib/errors/unwrap';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = ({ locals, params, setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=30, stale-while-revalidate=60'
	});
	return {
		player: unwrapAsync(locals.services.players().get(params.id))
	};
};
