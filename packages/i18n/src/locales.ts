export const locales = ['en', 'es', 'ko'] as const;

export type AppLocale = (typeof locales)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

export const localeLabels: Record<AppLocale, string> = {
	en: 'English',
	es: 'Español',
	ko: '한국어'
};

const localeSet = new Set<string>(locales);

export function isLocale(value: unknown): value is AppLocale {
	return typeof value === 'string' && localeSet.has(value);
}

/** Maps OS / browser language tags (`es-MX`) onto a supported locale. */
export function detectLocale(): AppLocale {
	if (typeof navigator === 'undefined') {
		return DEFAULT_LOCALE;
	}

	const tags = [...(navigator.languages ?? []), navigator.language];

	for (const tag of tags) {
		if (!tag) {
			continue;
		}

		const language = tag.toLowerCase().split('-')[0];
		if (isLocale(language)) {
			return language;
		}
	}

	return DEFAULT_LOCALE;
}
