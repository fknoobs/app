<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import FeatureSection from '$lib/components/FeatureSection.svelte';
	import DownloadSection from '$lib/components/DownloadSection.svelte';
	import { features } from '$lib/features';
	import { SITE_URL } from '$lib/urls';
</script>

<svelte:head>
	<title>Company of Heroes - Companion | coh1stats.com</title>
	<meta
		name="description"
		content="Free desktop companion for Company of Heroes — replay analysis, match history, leaderboards, keybindings, and Twitch streaming tools."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="{SITE_URL}/" />
	<meta property="og:title" content="Company of Heroes - Companion" />
	<meta
		property="og:description"
		content="Your command center for Company of Heroes. Replay analysis, match history, leaderboards, and Twitch tools — all in one free desktop app."
	/>
	<meta property="og:image" content="{SITE_URL}/og-image.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Company of Heroes - Companion" />
	<meta
		name="twitter:description"
		content="Your command center for Company of Heroes. Replay analysis, match history, leaderboards, and Twitch tools."
	/>
	<meta name="twitter:image" content="{SITE_URL}/og-image.png" />
</svelte:head>

<main>
	<Hero />
	<section id="features">
		<div class="border-secondary-800 border-b px-4 py-3">
			<p class="text-primary mb-1 text-xs font-medium">Everything in one place</p>
			<h2 class="font-heading text-xl font-bold text-white">
				Built for players who take CoH seriously
			</h2>
			<p class="text-secondary-400 mt-1 text-sm">
				From replay review to live lobbies and Twitch overlays — the companion runs alongside the
				game so you stay in the fight.
			</p>
		</div>
		{#each features as feature, index (feature.id)}
			<FeatureSection {feature} reversed={index % 2 === 1} />
		{/each}
	</section>
	<DownloadSection />
</main>
