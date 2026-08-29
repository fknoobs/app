<script lang="ts">
	import CardForm from '$lib/components/CardForm.svelte';
	import { SITE_URL } from '$lib/urls';
</script>

<svelte:head>
	<title>Players | Company of Heroes - Companion</title>
	<meta
		name="description"
		content="Look up Company of Heroes player stats by Steam ID or Relic profile id."
	/>
	<meta property="og:url" content="{SITE_URL}/players" />
	<meta property="og:title" content="CoH Player Stats" />
</svelte:head>

<div class="border-secondary-800 border-b">
	<div class="px-4 py-3">
		<h1 class="font-heading mb-1 text-xl font-bold text-white">Look up a player</h1>
		<p class="text-secondary-400 text-sm">
			Enter a Steam ID64 or Relic profile id to see ranks, community performance, and recent
			matches.
		</p>
	</div>
	<div class="border-secondary-800 border-t">
		<CardForm />
	</div>
</div>
