<script lang="ts">
	import ReplayViewer from '$lib/components/replay/replay-viewer.svelte';
	import { SITE_URL } from '$lib/site/urls';
	import { normalizeMapName } from '$lib/utils/player/format';
	import { href, useI18n } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { t } = useI18n();
	const match = $derived(data.match);
</script>

<svelte:head>
	<title>{normalizeMapName(match.map)} | {t('Community replay')}</title>
	<meta
		name="description"
		content={t(
			'Watch a community Company of Heroes replay: overview, chat, timeline, and .rec download.'
		)}
	/>
	<meta property="og:url" content="{SITE_URL}{href(`/replays/${match.id}`)}" />
	<meta property="og:title" content="{normalizeMapName(match.map)} — {t('CoH replay')}" />
</svelte:head>

<ReplayViewer {match} />
