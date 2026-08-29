<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import LeaderboardList from '$lib/components/LeaderboardList.svelte';
	import LeaderboardPodium from '$lib/components/LeaderboardPodium.svelte';
	import LeaderboardSkeleton from '$lib/components/LeaderboardSkeleton.svelte';
	import {
		boardIdForMode,
		getModeForBoard,
		LEADERBOARD_MODES,
		type LeaderboardPageData
	} from '$lib/leaderboards';
	import { getRaceLabel } from '$lib/player-format';
	import { getFactionFlagByRace } from '$lib/ranks';
	import { SITE_URL } from '$lib/urls';
	import { cn } from '$lib/cn';
	import { controlBase, tabTrigger } from '$lib/variants';
	import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchInput = $state('');
	let debouncedSearch = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	const boardId = $derived(data.boardId);
	const activeMode = $derived(getModeForBoard(boardId));
	const switching = $derived(Boolean(navigating.to?.url.pathname.startsWith('/leaderboards')));
	const activeModeLabel = $derived.by(() => {
		const faction = activeMode.factions.find((entry) => entry.value === boardId);
		return `${activeMode.label} · ${getRaceLabel(faction?.race ?? 0)}`;
	});

	function onSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			debouncedSearch = searchInput;
		}, 250);
	}

	function selectBoard(id: number) {
		if (id === boardId) return;
		searchInput = '';
		debouncedSearch = '';
		void goto(`/leaderboards?board=${id}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	function selectMode(modeValue: number) {
		const mode = LEADERBOARD_MODES.find((entry) => entry.value === modeValue);
		if (!mode) return;
		selectBoard(boardIdForMode(mode, boardId));
	}

	function filterStats(board: LeaderboardPageData) {
		const query = debouncedSearch.trim().toLowerCase();
		if (!query) return board.stats;
		return board.stats.filter((stat) => {
			const alias = stat.profile.alias.toLowerCase();
			return alias.startsWith(query) || alias.includes(query);
		});
	}
</script>

<svelte:head>
	<title>Leaderboards | Company of Heroes - Companion</title>
	<meta
		name="description"
		content="Relic Company of Heroes leaderboards by mode and faction, with companion ELO."
	/>
	<meta property="og:url" content="{SITE_URL}/leaderboards" />
	<meta property="og:title" content="CoH Leaderboards" />
</svelte:head>

<div class="border-secondary-800 border-b px-4 py-3">
	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
		<div class="flex flex-wrap items-center gap-3">
			<div class="flex flex-wrap items-center gap-1.5">
				{#each LEADERBOARD_MODES as mode (mode.value)}
					<button
						type="button"
						class={tabTrigger}
						data-state={activeMode.value === mode.value ? 'active' : undefined}
						onclick={() => selectMode(mode.value)}
					>
						{mode.label}
					</button>
				{/each}
			</div>
			<div class="flex flex-wrap items-center gap-1.5">
				{#each activeMode.factions as faction (faction.value)}
					<button
						type="button"
						class={cn(tabTrigger, 'px-2')}
						data-state={boardId === faction.value ? 'active' : undefined}
						aria-label={faction.label}
						onclick={() => selectBoard(faction.value)}
					>
						<img
							src={getFactionFlagByRace(faction.race)}
							alt=""
							class="h-5 w-auto border border-black"
						/>
					</button>
				{/each}
			</div>
			<p class="text-secondary-400 text-sm">{activeModeLabel}</p>
		</div>
		<label class={cn(controlBase, 'flex w-full items-center sm:w-58')}>
			<MagnifyingGlassIcon class="text-secondary-500 ml-3 size-4 shrink-0" />
			<input
				type="search"
				placeholder="Search player..."
				bind:value={searchInput}
				oninput={onSearchInput}
				class="placeholder:text-secondary-500 min-w-0 flex-1 bg-transparent px-3 text-sm text-white focus:outline-none"
			/>
		</label>
	</div>
</div>

{#if switching}
	<LeaderboardSkeleton />
{:else}
	{#await data.board}
		<LeaderboardSkeleton />
	{:then board}
		{@const filtered = filterStats(board)}
		{@const searching = debouncedSearch.trim().length > 0}
		{@const podiumStats = searching ? [] : filtered.slice(0, 3)}
		{@const listStats = searching ? filtered : filtered.slice(3)}
		{#if podiumStats.length > 0}
			<LeaderboardPodium stats={podiumStats} eloBySteamId={board.eloBySteamId} />
		{/if}
		<LeaderboardList stats={listStats} eloBySteamId={board.eloBySteamId} />
	{:catch error}
		<div class="px-4 py-3">
			<h1 class="font-heading mb-1 text-xl font-bold text-white">Could not load leaderboard</h1>
			<p class="text-secondary-400 text-sm">{error.message}</p>
		</div>
	{/await}
{/if}
