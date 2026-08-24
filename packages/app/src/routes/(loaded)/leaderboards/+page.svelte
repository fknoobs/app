<script lang="ts">
	import type { Snapshot } from '@sveltejs/kit';
	import { relic } from '$lib/relic';
	import { resource, useDebounce, watch } from 'runed';
	import { ToggleGroup } from '$lib/components/ui/toggle-group';
	import { getRaceLabelFromLeaderboardId } from '$lib/components/leaderboard/leaderboard-utils';
	import { LeaderboardPodium, LeaderboardList } from '$lib/components/leaderboard';
	import { leaderboards } from '$lib/utils/game';
	import Input from '$lib/components/ui/input/input.svelte';
	import { isEmpty } from 'lodash-es';
	import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlassIcon';

	let leaderboardId = $state(leaderboards[0].value);
	let leaderboardFactionId = $state(leaderboards[0].leaderboardFationIds[0].value);
	let searchInput = $state('');
	let debouncedSearch = $state('');

	let leaderboardFactionsIds = $derived(
		leaderboards.find((lb) => lb.value === leaderboardId)!.leaderboardFationIds!
	);
	let activeModeLabel = $derived.by(() => {
		const mode = leaderboards.find((lb) => lb.value === leaderboardId)?.label ?? '';
		const faction = getRaceLabelFromLeaderboardId(parseInt(leaderboardFactionId, 10));
		return `${mode} · ${faction}`;
	});

	const statsResource = resource(
		() => [leaderboardFactionId, leaderboardId],
		() => relic.getLeaderboard(parseInt(leaderboardFactionId)),
		{
			initialValue: []
		}
	);

	const filteredStats = $derived.by(() => {
		const query = debouncedSearch.trim().toLowerCase();
		const stats = statsResource.current;

		if (!query || isEmpty(query)) {
			return stats;
		}

		return stats.filter(
			(stat) =>
				stat.profile?.alias.toLowerCase().startsWith(query) ||
				stat.profile?.alias.toLowerCase().includes(query)
		);
	});

	const isSearching = $derived(debouncedSearch.trim().length > 0);
	let podiumStats = $derived(isSearching ? [] : filteredStats.slice(0, 3));
	let listStats = $derived(isSearching ? filteredStats : filteredStats.slice(3));

	const searchPlayer = useDebounce(
		() => {
			debouncedSearch = searchInput;
		},
		() => 250
	);

	watch(
		() => leaderboardId,
		() => {
			const factions = leaderboards.find((lb) => lb.value === leaderboardId)!.leaderboardFationIds;
			if (!factions.some((faction) => faction.value === leaderboardFactionId)) {
				leaderboardFactionId = factions[0].value;
			}
		}
	);

	export const snapshot: Snapshot<[string, string]> = {
		capture: () => [leaderboardFactionId, leaderboardId],
		restore: ([factionId, id]) => {
			leaderboardId = id;
			leaderboardFactionId = factionId;
		}
	};
</script>

<div
	class="border-secondary-800 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b p-4"
>
	<div class="flex flex-wrap items-center gap-4">
		<ToggleGroup bind:value={leaderboardId} items={leaderboards} class="w-fit" />
		<ToggleGroup bind:value={leaderboardFactionId} items={leaderboardFactionsIds} class="w-fit" />
		<p class="text-secondary-400 text-sm">{activeModeLabel}</p>
	</div>
	<Input
		type="text"
		placeholder="Search player..."
		class="w-full sm:w-58"
		bind:value={searchInput}
		oninput={() => searchPlayer()}
	>
		{#snippet leading()}
			<MagnifyingGlass class="size-4" />
		{/snippet}
	</Input>
</div>

{#if !isSearching}
	<LeaderboardPodium stats={podiumStats} loading={statsResource.loading} />
{/if}

<LeaderboardList
	stats={listStats}
	loading={statsResource.loading}
	empty={filteredStats.length === 0 ? 'No players found.' : 'No more players to show.'}
	class="rounded-none border-0"
	striped={false}
/>
