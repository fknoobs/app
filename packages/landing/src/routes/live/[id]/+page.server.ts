import { redirect } from '@sveltejs/kit';
import { localizeHref } from '@company-of-heroes/i18n';
import { unwrapAsync } from '$lib/errors/unwrap';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	const lobby = await unwrapAsync(locals.services.liveLobbies().get(params.id));

	// Prefer the durable lobbies detail URL when ensureStarted has linked it.
	if (lobby.lobbyId) {
		redirect(302, localizeHref(`/replays/${lobby.lobbyId}`, locals.locale));
	}

	if (!locals.user) {
		setHeaders({
			'cache-control': 'public, s-maxage=15, stale-while-revalidate=60'
		});
	}

	return { lobby };
};
