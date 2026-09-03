<script lang="ts">
	import '@tt-mussels/style.css';
	import '../app.css';
	import Header from '$lib/components/layout/header.svelte';
	import Footer from '$lib/components/layout/footer.svelte';
	import I18nBoot from '$lib/components/i18n/i18n-boot.svelte';
	import { loadLatestDownload } from '$lib/site/download.svelte';
	import { pageShell } from '$lib/utils/variants';
	import { building } from '$app/environment';
	import { page } from '$app/state';
	import { SITE_URL } from '$lib/site/urls';
	import {
		locales,
		localizeHref,
		parseLocaleFromPath,
		unlocalizedPath,
		type AppLocale
	} from '$lib/i18n';
	import { onMount } from 'svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(() => {
		void loadLatestDownload();
	});

	const locale = $derived(parseLocaleFromPath(page.url.pathname).locale);
	const canonical = $derived(localizedUrl(locale));

	function localizedUrl(next: AppLocale) {
		const path = unlocalizedPath(page.url.pathname);
		const search = building ? '' : page.url.search;
		return `${SITE_URL}${localizeHref(path, next)}${search}`;
	}

	$effect(() => {
		document.documentElement.lang = locale;
	});
</script>

<svelte:head>
	<link rel="canonical" href={canonical} />
	{#each locales as locale (locale)}
		<link rel="alternate" hreflang={locale} href={localizedUrl(locale)} />
	{/each}
	<link rel="alternate" hreflang="x-default" href={localizedUrl('en')} />
</svelte:head>

<I18nBoot locale={locale}>
	<div class="bg-gray-950 min-h-screen font-sans">
		<div class={pageShell}>
			<Header />
			<div class="flex-1">
				{@render children()}
			</div>
			<Footer />
		</div>
	</div>
</I18nBoot>
