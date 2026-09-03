import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { boot, syncLocalsUser } from './boot';
import {
	DEFAULT_LOCALE,
	parseLocaleFromPath,
	translate,
	type AppLocale
} from '@company-of-heroes/i18n';

function appendAuthCookie(response: Response, cookie: string): Response {
	try {
		response.headers.append('set-cookie', cookie);
		return response;
	} catch {
		const copy = new Response(response.body, response);
		copy.headers.append('set-cookie', cookie);
		return copy;
	}
}

function localeFromUrl(pathname: string): { locale: AppLocale; englishPrefix: boolean } {
	const parsed = parseLocaleFromPath(pathname);
	return {
		locale: parsed.locale,
		englishPrefix: parsed.prefixed && parsed.locale === DEFAULT_LOCALE
	};
}

export const handle: Handle = async ({ event, resolve }) => {
	const { locale, englishPrefix } = localeFromUrl(event.url.pathname);
	if (englishPrefix) {
		const parsed = parseLocaleFromPath(event.url.pathname);
		redirect(301, `${parsed.path}${event.url.search}`);
	}

	event.locals.locale = locale;
	event.locals.t = (key, params) => translate(locale, key, params);

	boot(event);
	const pocketbase = event.locals.pocketbase;
	const hadAuthCookie = event.request.headers.get('cookie')?.includes('pb_auth') ?? false;
	if (hadAuthCookie) {
		try {
			if (pocketbase.authStore.isValid) {
				await pocketbase.collection('users').authRefresh();
			}
		} catch {
			pocketbase.authStore.clear();
		}
	}

	syncLocalsUser(event);

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replaceAll('%lang%', locale)
	});
	if (!hadAuthCookie && !pocketbase.authStore.isValid) {
		return response;
	}

	return appendAuthCookie(
		response,
		pocketbase.authStore.exportToCookie({
			httpOnly: false,
			secure: event.url.protocol === 'https:',
			sameSite: 'lax',
			path: '/'
		})
	);
};
