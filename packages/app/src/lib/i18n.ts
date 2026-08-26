import { getContext, setContext } from 'svelte';
import {
	createI18n as createI18nInstance,
	I18N_CONTEXT_KEY,
	type I18nInstance
} from '@svelte-i18n/core';
import type en from '$lib/locales/en.json';

export const locales = ['en', 'es'] as const;
export type AppLocale = (typeof locales)[number];
export type AppDictionary = typeof en;
export type AppI18n = I18nInstance<AppDictionary, AppLocale, AppLocale>;
export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export const localeLabels: Record<AppLocale, string> = {
	en: 'English',
	es: 'Español'
};

let instance: AppI18n | null = null;

export async function initI18n(locale: AppLocale = 'en'): Promise<AppI18n> {
	if (instance) {
		return instance;
	}

	instance = (await createI18nInstance({
		locales: [...locales],
		locale,
		fallbackLocale: 'en',
		dictionaries: {
			en: async () => (await import('$lib/locales/en.json')).default,
			es: async () => (await import('$lib/locales/es.json')).default
		}
	})) as AppI18n;

	return instance;
}

export function getI18n(): AppI18n {
	if (!instance) {
		throw new Error('i18n is not initialized');
	}
	return instance;
}

function interpolate(key: string, params?: Record<string, string | number>): string {
	if (!params) return key;
	return key.replace(/\{(\w+)\}/g, (_, name: string) =>
		params[name] != null ? String(params[name]) : `{${name}}`
	);
}

export const t: TranslateFn = (key, params) => {
	if (!instance) {
		return interpolate(key, params);
	}
	instance.getLocale();
	const translate = instance.t as TranslateFn;
	const translated = translate(key, params);
	if (translated === key && params) {
		return interpolate(key, params);
	}
	return translated;
};

export function setLocale(locale: string | string[]): void {
	const next = Array.isArray(locale) ? locale[0] : locale;
	if (!instance || !locales.includes(next as AppLocale)) {
		return;
	}
	instance.setLocale(next as AppLocale);
}

export function provideI18n(i18n: () => AppI18n): AppI18n {
	return setContext(I18N_CONTEXT_KEY, i18n());
}

export function useI18n(): Omit<AppI18n, 't' | '_'> & { t: TranslateFn; _: TranslateFn } {
	const i18n = getContext<AppI18n>(I18N_CONTEXT_KEY) ?? getI18n();
	return new Proxy(i18n, {
		get(target, prop, receiver) {
			if (prop === 't' || prop === '_') return t;
			return Reflect.get(target, prop, receiver);
		}
	}) as Omit<AppI18n, 't' | '_'> & { t: TranslateFn; _: TranslateFn };
}
