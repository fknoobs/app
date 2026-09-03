<script lang="ts">
	import I18nTree from './i18n-tree.svelte';
	import { createI18n, type AppLocale } from '$lib/i18n';
	import type { Snippet } from 'svelte';

	type Props = {
		locale: AppLocale;
		children: Snippet;
	};

	let { locale, children }: Props = $props();
</script>

{#key locale}
	<I18nTree i18n={await createI18n(locale)}>
		{@render children()}
	</I18nTree>
{/key}
