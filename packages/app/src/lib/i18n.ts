import { getContext } from 'svelte';
import { I18N_CONTEXT_KEY } from '@svelte-i18n/core';
import {
	createI18n as createSharedI18n,
	detectLocale,
	instanceTranslate,
	interpolate,
	isLocale,
	type AppI18n,
	type AppLocale,
	type TranslateFn
} from '@company-of-heroes/i18n';

export {
	locales,
	localeLabels,
	provideI18n,
	type AppDictionary,
	type AppI18n,
	type AppLocale,
	type TranslateFn
} from '@company-of-heroes/i18n';

export const isAppLocale = isLocale;
export const detectOsLocale = detectLocale;

/** Saved settings win; otherwise the OS language, then English. */
export function resolveAppLocale(saved?: string | null): AppLocale {
	return isLocale(saved) ? saved : detectLocale();
}

let instance: AppI18n | null = null;

export async function initI18n(locale: AppLocale = detectLocale()): Promise<AppI18n> {
	if (instance) {
		return instance;
	}

	instance = await createSharedI18n(locale);
	return instance;
}

export function getI18n(): AppI18n {
	if (!instance) {
		throw new Error('i18n is not initialized');
	}

	return instance;
}

export const t: TranslateFn = (key, params) => {
	if (!instance) {
		return interpolate(key, params);
	}

	return instanceTranslate(instance)(key, params);
};

export function setLocale(locale: string | string[]): void {
	const next = Array.isArray(locale) ? locale[0] : locale;
	if (!instance || !isLocale(next)) {
		return;
	}

	instance.setLocale(next);
}

export function useI18n(): Omit<AppI18n, 't' | '_'> & { t: TranslateFn; _: TranslateFn } {
	const i18n = getContext<AppI18n>(I18N_CONTEXT_KEY) ?? getI18n();
	return new Proxy(i18n, {
		get(target, prop, receiver) {
			if (prop === 't' || prop === '_') {
				return t;
			}

			return Reflect.get(target, prop, receiver);
		}
	}) as Omit<AppI18n, 't' | '_'> & { t: TranslateFn; _: TranslateFn };
}
