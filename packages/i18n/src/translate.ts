import en from '../locales/en.json';
import es from '../locales/es.json';
import ko from '../locales/ko.json';
import { DEFAULT_LOCALE, type AppLocale } from './locales';

export type AppDictionary = typeof en;
export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const dictionaries: Record<AppLocale, AppDictionary> = {
	en,
	es,
	ko
};

export { en, es, ko };

export function interpolate(key: string, params?: Record<string, string | number>): string {
	if (!params) {
		return key;
	}

	return key.replace(/\{(\w+)\}/g, (_, name: string) =>
		params[name] != null ? String(params[name]) : `{${name}}`
	);
}

export function translate(
	locale: AppLocale,
	key: string,
	params?: Record<string, string | number>
): string {
	const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
	const fallback = dictionaries[DEFAULT_LOCALE] as Record<string, string>;
	const template = (dict as Record<string, string>)[key] ?? fallback[key] ?? key;
	return interpolate(template, params);
}

export function createTranslate(locale: () => AppLocale): TranslateFn {
	return (key, params) => translate(locale(), key, params);
}

export function wrapTranslate(getT: () => TranslateFn, getLocale: () => string): TranslateFn {
	return (key, params) => {
		getLocale();
		const translated = getT()(key, params);
		if (translated === key && params) {
			return interpolate(key, params);
		}

		return translated;
	};
}
