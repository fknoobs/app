<script lang="ts">
	import I18nTree from './i18n-tree.svelte';
	import { createI18n, type AppLocale } from '$lib/i18n';
	import type { Snippet } from 'svelte';

	type Props = {
		locale: AppLocale;
		children: Snippet;
	};

	let { locale, children }: Props = $props();
	const i18n = $derived(await createI18n(locale));
</script>

<I18nTree {i18n}>
	{@render children()}
</I18nTree>
