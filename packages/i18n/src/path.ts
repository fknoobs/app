import { DEFAULT_LOCALE, isLocale, type AppLocale } from './locales';

const UNPREFIXED_PREFIXES = ['/api', '/auth/handoff'];

export type ParsedLocalePath = {
	locale: AppLocale;
	path: string;
	prefixed: boolean;
};

function splitHref(href: string): { pathname: string; search: string; hash: string } {
	const hashIndex = href.indexOf('#');
	const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
	const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
	const searchIndex = withoutHash.indexOf('?');
	const search = searchIndex >= 0 ? withoutHash.slice(searchIndex) : '';
	const pathname = searchIndex >= 0 ? withoutHash.slice(0, searchIndex) : withoutHash;
	return { pathname, search, hash };
}

function firstSegment(pathname: string): string | null {
	const match = pathname.match(/^\/([^/]+)/);
	return match?.[1] ?? null;
}

function stripPrefix(pathname: string, locale: string): string {
	if (pathname === `/${locale}`) {
		return '/';
	}

	if (pathname.startsWith(`/${locale}/`)) {
		const rest = pathname.slice(locale.length + 1);
		return rest.length > 0 ? rest : '/';
	}

	return pathname;
}

export function parseLocaleFromPath(pathname: string): ParsedLocalePath {
	const segment = firstSegment(pathname);
	if (segment && isLocale(segment)) {
		return {
			locale: segment,
			path: stripPrefix(pathname, segment),
			prefixed: true
		};
	}

	return { locale: DEFAULT_LOCALE, path: pathname || '/', prefixed: false };
}

export function shouldLocalizePath(pathname: string): boolean {
	if (!pathname.startsWith('/')) {
		return false;
	}

	if (pathname.startsWith('//')) {
		return false;
	}

	return !UNPREFIXED_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

export function unlocalizedPath(pathname: string): string {
	return parseLocaleFromPath(pathname).path;
}

export function localizeHref(href: string, locale: AppLocale): string {
	if (
		!href ||
		href.startsWith('mailto:') ||
		href.startsWith('http://') ||
		href.startsWith('https://')
	) {
		return href;
	}

	const { pathname, search, hash } = splitHref(href);
	if (!shouldLocalizePath(pathname)) {
		return href;
	}

	const path = unlocalizedPath(pathname);
	const localized =
		locale === DEFAULT_LOCALE ? path : path === '/' ? `/${locale}` : `/${locale}${path}`;
	return `${localized}${search}${hash}`;
}

export function englishHref(href: string): string {
	return localizeHref(href, DEFAULT_LOCALE);
}

export function localeSwitchHref(href: string, locale: AppLocale): string {
	const { pathname, search, hash } = splitHref(href);
	if (!shouldLocalizePath(pathname)) {
		return href;
	}

	const path = unlocalizedPath(pathname);
	return `${localizeHref(path, locale)}${search}${hash}`;
}

export function safeInternalPath(value: unknown, locale: AppLocale): string {
	if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
		return localizeHref('/', locale);
	}

	return localizeHref(value, locale);
}
