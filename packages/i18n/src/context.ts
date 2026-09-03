import { getContext, setContext } from 'svelte';
import { I18N_CONTEXT_KEY } from '@svelte-i18n/core';
import { instanceTranslate, type AppI18n } from './create-i18n';
import type { TranslateFn } from './translate';

export type I18nContext = Omit<AppI18n, 't' | '_'> & { t: TranslateFn; _: TranslateFn };

export function provideI18n(i18n: () => AppI18n): AppI18n {
	return setContext(I18N_CONTEXT_KEY, i18n());
}

export function useI18n(): I18nContext {
	const i18n = getContext<AppI18n>(I18N_CONTEXT_KEY);
	if (!i18n) {
		throw new Error('i18n is not initialized');
	}

	const t = instanceTranslate(i18n);
	return new Proxy(i18n, {
		get(target, prop, receiver) {
			if (prop === 't' || prop === '_') {
				return t;
			}

			return Reflect.get(target, prop, receiver);
		}
	}) as I18nContext;
}
