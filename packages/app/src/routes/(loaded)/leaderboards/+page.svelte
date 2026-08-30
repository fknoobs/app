<script lang="ts">
	import type { Snapshot } from '@sveltejs/kit';
	import { relic } from '$lib/relic';
	import { resource, useDebounce, watch } from 'runed';
	import { ToggleGroup } from '$lib/components/ui/toggle-group';
	import {
		getRaceLabelFromLeaderboardId,
		getSteamIdFromProfile
	} from '$lib/components/leaderboard/leaderboard-utils';
	import { LeaderboardPodium, LeaderboardList } from '$lib/components/leaderboard';
	import {
		getPlayerRatings,
		harvestPlayerRatingsForProfiles,
		selectLeaderboardHarvestProfileIds,
		type PlayerRatingRecord
	} from '$core/pocketbase/player-ratings';
	import type { PlayerEloMap } from '$lib/utils/player-elo';
	import { leaderboards } from '$lib/utils/game';
	import Input from '$lib/components/ui/input/input.svelte';
	import { isEmpty } from 'lodash-es';
	import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon';
	import { useI18n } from '$lib/i18n';

	let leaderboardId = $state(leaderboards[0].value);
	let leaderboardFactionId = $state(leaderboards[0].leaderboardFationIds[0].value);
	let searchInput = $state('');
	let debouncedSearch = $state('');
	let eloOverride = $state<Map<string, PlayerEloMap> | null>(null);
	let lastHarvestKey = $state('');
	const { t } = useI18n();

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

	const ratingsResource = resource(
		() => statsResource.current.map((stat) => stat.profile.profile_id).join(','),
		async () => {
			const steamIds = statsResource.current
				.map((stat) => getSteamIdFromProfile(stat.profile))
				.filter(Boolean);
			return getPlayerRatings(steamIds);
		},
		{ initialValue: new Map<string, PlayerRatingRecord>() }
	);

	const eloBySteamId = $derived.by(() => {
		if (eloOverride) {
			return eloOverride;
		}

		const map = new Map<string, PlayerEloMap>();
		for (const [steamId, record] of ratingsResource.current) {
			map.set(steamId, record.elo);
		}
		return map;
	});

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

	watch(
		() => [leaderboardFactionId, statsResource.current, ratingsResource.current] as const,
		([factionId, stats, ratings]) => {
			if (stats.length === 0 || ratingsResource.loading) {
				return;
			}

			const harvestKey = `${factionId}:${stats.map((s) => s.profile.profile_id).join(',')}`;
			if (harvestKey === lastHarvestKey) {
				return;
			}
			lastHarvestKey = harvestKey;
			eloOverride = null;

			const steamByProfile = new Map<number, string>();
			for (const stat of stats) {
				const steamId = getSteamIdFromProfile(stat.profile);
				if (steamId) {
					steamByProfile.set(stat.profile.profile_id, steamId);
				}
			}

			const profileIds = selectLeaderboardHarvestProfileIds({
				stats,
				leaderboardId: parseInt(factionId, 10),
				ratingsBySteamId: ratings,
				steamIdForProfile: (profileId) => steamByProfile.get(profileId) ?? null
			});

			if (profileIds.length === 0) {
				return;
			}

			void harvestPlayerRatingsForProfiles(profileIds).then(async (result) => {
				if (!result || result.processed === 0) {
					return;
				}

				const steamIds = stats
					.map((stat) => getSteamIdFromProfile(stat.profile))
					.filter(Boolean);
				const refreshed = await getPlayerRatings(steamIds);
				const map = new Map<string, PlayerEloMap>();
				for (const [steamId, record] of refreshed) {
					map.set(steamId, record.elo);
				}
				eloOverride = map;
			});
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
		placeholder={t('Search player...')}
		class="w-full sm:w-58"
		bind:value={searchInput}
		oninput={() => searchPlayer()}
	>
		{#snippet leading()}
			<MagnifyingGlassIcon class="size-4" />
		{/snippet}
	</Input>
</div>

{#if !isSearching}
	<LeaderboardPodium
		stats={podiumStats}
		eloBySteamId={eloBySteamId}
		loading={statsResource.loading}
	/>
{/if}

<LeaderboardList
	stats={listStats}
	eloBySteamId={eloBySteamId}
	loading={statsResource.loading}
	empty={filteredStats.length === 0 ? t('No players found.') : t('No more players to show.')}
	class="rounded-none border-0"
	striped={false}
/>
