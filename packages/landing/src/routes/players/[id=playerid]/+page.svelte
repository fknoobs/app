<script lang="ts">
	import PlayerMatchHistory from '$lib/components/PlayerMatchHistory.svelte';
	import PlayerPerformancePanel from '$lib/components/PlayerPerformancePanel.svelte';
	import PlayerProfileHeader from '$lib/components/PlayerProfileHeader.svelte';
	import PlayerProfileSkeleton from '$lib/components/PlayerProfileSkeleton.svelte';
	import PlayerStatsTable from '$lib/components/PlayerStatsTable.svelte';
	import { formatHours, formatRelative } from '$lib/player-format';
	import { SITE_URL } from '$lib/urls';
	import { tabTrigger } from '$lib/variants';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let currentTab = $state<'stats' | 'performance' | 'match-history'>('stats');
</script>

<svelte:head>
	{#await data.player}
		<title>Loading player | Company of Heroes - Companion</title>
	{:then player}
		<title>{player.alias} | Company of Heroes - Companion</title>
		<meta
			name="description"
			content="Company of Heroes stats for {player.alias}: ranks, community performance, and recent matches."
		/>
		<meta property="og:url" content="{SITE_URL}/players/{player.steamId}" />
		<meta property="og:title" content="{player.alias} — CoH player stats" />
	{:catch}
		<title>Could not load player | Company of Heroes - Companion</title>
	{/await}
</svelte:head>

{#await data.player}
	<PlayerProfileSkeleton />
{:then player}
	<div class="border-secondary-800 overflow-clip border-b">
		<PlayerProfileHeader {player} />
		<div class="border-secondary-800 border-b">
			<div class="flex flex-wrap items-center gap-2 px-4 py-2.5">
				<button
					type="button"
					class={tabTrigger}
					data-state={currentTab === 'stats' ? 'active' : undefined}
					onclick={() => (currentTab = 'stats')}
				>
					Stats
				</button>
				<button
					type="button"
					class={tabTrigger}
					data-state={currentTab === 'performance' ? 'active' : undefined}
					onclick={() => (currentTab = 'performance')}
				>
					Performance
				</button>
				<button
					type="button"
					class={tabTrigger}
					data-state={currentTab === 'match-history' ? 'active' : undefined}
					onclick={() => (currentTab = 'match-history')}
				>
					Match history
				</button>
			</div>
			<div class="border-secondary-800 border-t">
				{#if currentTab === 'stats'}
					<PlayerStatsTable {player} />
				{:else if currentTab === 'performance'}
					<PlayerPerformancePanel {player} />
				{:else}
					<PlayerMatchHistory {player} />
				{/if}
			</div>
		</div>
		<div
			class="text-secondary-400 bg-secondary-800/20 flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-sm"
		>
			{#if player.lastlogoff}
				<span>
					<span class="text-secondary-500">Last seen</span>
					{formatRelative(player.lastlogoff)}
				</span>
			{/if}
			{#if player.playtimeForever}
				<span>
					<span class="text-secondary-500">Playtime</span>
					{formatHours(player.playtimeForever)}
				</span>
			{/if}
			{#if player.playtime2weeks}
				<span>
					<span class="text-secondary-500">Past 2 weeks</span>
					{formatHours(player.playtime2weeks)}
				</span>
			{/if}
		</div>
	</div>
{:catch loadError}
	<div class="border-secondary-800 border-b px-4 py-3">
		<h1 class="font-heading mb-1 text-xl font-bold text-white">Could not load player</h1>
		<p class="text-secondary-400 text-sm">
			{loadError instanceof Error
				? loadError.message
				: 'Please try another Steam ID or Relic profile id.'}
		</p>
	</div>
{/await}
