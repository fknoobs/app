<script lang="ts">
	import ReplayViewer from '$lib/components/ReplayViewer.svelte';
	import { SITE_URL } from '$lib/urls';
	import { normalizeMapName } from '$lib/player-format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const match = $derived(data.match);
</script>

<svelte:head>
	<title>{normalizeMapName(match.map)} | Community replay</title>
	<meta
		name="description"
		content="Watch a community Company of Heroes replay: overview, chat, timeline, and .rec download."
	/>
	<meta property="og:url" content="{SITE_URL}/replays/{match.id}" />
	<meta property="og:title" content="{normalizeMapName(match.map)} — CoH replay" />
</svelte:head>

<ReplayViewer {match} />
