<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import FairPlaySection from '$lib/components/FairPlaySection.svelte';
	import FeatureSection from '$lib/components/FeatureSection.svelte';
	import DownloadSection from '$lib/components/DownloadSection.svelte';
	import { features } from '$lib/features';
	import { SITE_URL } from '$lib/urls';
</script>

<svelte:head>
	<title>Company of Heroes - Companion | coh1stats.com</title>
	<meta
		name="description"
		content="Free desktop companion for Company of Heroes 1 — replay analysis, live lobby scouting, match history, Relic leaderboards, Twitch overlays, and fair play checks that help keep the community clean of cheaters."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{SITE_URL}/" />
	<meta property="og:title" content="Company of Heroes - Companion" />
	<meta
		property="og:description"
		content="Desktop companion for Company of Heroes 1. Replay analysis, live lobby scouting, match history, Relic leaderboards, Twitch overlays, and fair play checks that help keep the community clean of cheaters."
	/>
	<meta property="og:image" content="{SITE_URL}/og-image.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Company of Heroes - Companion" />
	<meta
		name="twitter:description"
		content="Desktop companion for Company of Heroes 1. Replay analysis, live lobby scouting, match history, Relic leaderboards, Twitch overlays, and fair play checks that help keep the community clean of cheaters."
	/>
	<meta name="twitter:image" content="{SITE_URL}/og-image.png" />
</svelte:head>

<main>
	<Hero />
	<FairPlaySection />
	<section id="features">
		<div class="border-secondary-800 border-b px-4 py-3">
			<p class="text-primary mb-1 text-xs font-medium">Features</p>
			<h2 class="font-heading text-xl font-bold text-white">What the companion does</h2>
			<p class="text-secondary-400 mt-1 text-sm">
				Parse replays, scout the current lobby, browse community match history, and look up Relic
				ranks — plus hotkeys and stream overlays.
			</p>
		</div>
		{#each features as feature, index (feature.id)}
			<FeatureSection {feature} reversed={index % 2 === 1} />
		{/each}
	</section>
	<DownloadSection />
</main>
