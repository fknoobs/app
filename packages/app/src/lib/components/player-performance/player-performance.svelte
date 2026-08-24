<script lang="ts">
	import {
		emptyPlayerPerformance,
		getPlayerPerformance,
		type PerformanceFactionRecord,
		type PerformanceMapRecord,
		type PerformanceModeRecord,
		type PerformanceScope
	} from '$core/pocketbase/player-performance';
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import MapImage from '$lib/components/ui/map-image.svelte';
	import { cn, getFactionFlagFromRace, normalizeMapName } from '$lib/utils';
	import { MATCH_TYPES } from '$core/game/lobby';
	import { getRaceLabel, getRatioColor } from '$lib/components/leaderboard/leaderboard-utils';
	import LeaderboardStatPill from '$lib/components/leaderboard/leaderboard-stat-pill.svelte';
	import { resource } from 'runed';
	import type { Snippet } from 'svelte';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import MapTrifoldIcon from 'phosphor-svelte/lib/MapTrifoldIcon';
	import FlagIcon from 'phosphor-svelte/lib/FlagIcon';
	import UsersThreeIcon from 'phosphor-svelte/lib/UsersThreeIcon';
	import PlayerPerformanceMapMatches from './player-performance-map-matches.svelte';
	import PlayerPerformanceSection from './player-performance-section.svelte';

	type Props = {
		profileId: number | null | undefined;
		scope: PerformanceScope;
		userId?: string | null;
		empty?: 'self' | 'other';
		class?: string;
	};

	let { profileId, scope, userId = null, empty = 'other', class: className }: Props = $props();

	const performance = resource(
		[() => profileId ?? null, () => scope, () => userId ?? null],
		async ([id, nextScope, nextUserId]) => {
			if (!id) return emptyPlayerPerformance();
			if (nextScope === 'user' && !nextUserId) return emptyPlayerPerformance();
			return getPlayerPerformance({
				profileId: id,
				scope: nextScope,
				userId: nextUserId
			});
		},
		{ initialValue: emptyPlayerPerformance() }
	);

	const stats = $derived(performance.current ?? emptyPlayerPerformance());
	const emptyMessage = $derived(
		empty === 'self'
			? 'Play with the companion running to build stats.'
			: 'No tracked community matches for this player.'
	);

	const byMode = $derived(stats.byMode.filter((mode) => mode.matchtypeId !== 14));
	const isLoading = $derived(performance.loading && stats.matchCount === 0);
	let expandedMap = $state<string | null>(null);
	let mapsExpanded = $state(false);
	let factionExpanded = $state(false);
	let modeExpanded = $state(false);

	const mapGames = $derived(
		stats.byMap.reduce((total, row) => total + row.wins + row.losses, 0)
	);
	const mapSummary = $derived(`${stats.byMap.length} maps · ${mapGames} games`);
	const factionSummary = $derived(`${stats.byFaction.length} factions tracked`);
	const modeSummary = $derived(`${byMode.length} game modes`);

	const statHeader = 'flex w-full justify-center';
	const statCell = 'flex w-full justify-center tabular-nums';
	const statPad = { headerCellClass: 'px-2', cellClass: () => 'px-2' };
	const sectionHeaderRow = 'bg-secondary-950/60 text-secondary-400';

	const mapColumns: ColumnDef<PerformanceMapRecord>[] = [
		{ id: 'map', header: 'Map', class: 'flex min-w-0 items-center gap-3' },
		{
			id: 'games',
			header: 'Games',
			width: 'w-[3.25rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'wins',
			header: 'Wins',
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'losses',
			header: 'Losses',
			width: 'w-[4.75rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'winrate',
			header: 'Winrate',
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'expand',
			header: '',
			width: 'w-8',
			headerCellClass: 'p-0',
			cellClass: () => 'p-0',
			class: 'flex w-full justify-center',
			hideSkeleton: true
		}
	];

	const factionColumns: ColumnDef<PerformanceFactionRecord>[] = [
		{
			id: 'faction',
			header: 'Faction',
			class: 'flex min-w-0 items-center gap-2'
		},
		{
			id: 'wins',
			header: 'Wins',
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'losses',
			header: 'Losses',
			width: 'w-[4.75rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'winrate',
			header: 'Winrate',
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		}
	];

	const modeColumns: ColumnDef<PerformanceModeRecord>[] = [
		{ id: 'mode', header: 'Mode', class: 'flex min-w-0 items-center' },
		{
			id: 'wins',
			header: 'Wins',
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'losses',
			header: 'Losses',
			width: 'w-[4.75rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'winrate',
			header: 'Winrate',
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		}
	];

	function winrate(row: { wins: number; losses: number }): string {
		const total = row.wins + row.losses;
		if (total === 0) return '-';
		return `${Math.round((row.wins / total) * 100)}%`;
	}

	function modeLabel(matchtypeId: number): string {
		return MATCH_TYPES[matchtypeId as keyof typeof MATCH_TYPES] ?? `Mode ${matchtypeId}`;
	}

	function toggleMapRow(mapRecord: PerformanceMapRecord) {
		expandedMap = expandedMap === mapRecord.map ? null : mapRecord.map;
	}
</script>

{#snippet cell_map({ row }: { row: PerformanceMapRecord })}
	<MapImage small map={row.map} alt={normalizeMapName(row.map)} />
	<span class="min-w-0 truncate">{normalizeMapName(row.map)}</span>
{/snippet}
{#snippet cell_faction({ row }: { row: PerformanceFactionRecord })}
	<img
		src={getFactionFlagFromRace(row.raceId)}
		alt={getRaceLabel(row.raceId)}
		class="w-6 shrink-0 ring-2 ring-black"
	/>
	<span class="min-w-0 truncate">{getRaceLabel(row.raceId)}</span>
{/snippet}
{#snippet cell_mode({ row }: { row: PerformanceModeRecord })}
	<span class="min-w-0 truncate">{modeLabel(row.matchtypeId)}</span>
{/snippet}
{#snippet cell_games({ row }: { row: PerformanceMapRecord })}
	<span class="text-secondary-300 font-medium">{row.wins + row.losses}</span>
{/snippet}
{#snippet cell_wins({ row }: { row: { wins: number; losses: number } })}
	<LeaderboardStatPill type="wins" wins={row.wins} losses={row.losses} streak={0} />
{/snippet}
{#snippet cell_losses({ row }: { row: { wins: number; losses: number } })}
	<LeaderboardStatPill type="losses" wins={row.wins} losses={row.losses} streak={0} />
{/snippet}
{#snippet cell_winrate({ row }: { row: { wins: number; losses: number } })}
	<span class="font-medium" style:color={getRatioColor(row.wins, row.losses)}>{winrate(row)}</span>
{/snippet}
{#snippet cell_expand({ row }: { row: PerformanceMapRecord })}
	<CaretDownIcon
		class={cn('size-4 transition-transform', expandedMap === row.map && 'rotate-180')}
	/>
{/snippet}
{#snippet mapRowWrapper({ row, children }: { row: PerformanceMapRecord; children: Snippet })}
	{@const expanded = expandedMap === row.map}
	{@render children()}
	{#if expanded}
		<tr>
			<td colspan={mapColumns.length} class="border-secondary-800 border-b p-0">
				{#if profileId}
					<PlayerPerformanceMapMatches
						mapKey={row.map}
						{profileId}
						{scope}
						{userId}
						totalGames={row.wins + row.losses}
					/>
				{/if}
			</td>
		</tr>
	{/if}
{/snippet}

{#if !performance.loading && stats.matchCount === 0}
	<p class={cn('text-secondary-400 px-4 py-3 text-sm', className)}>{emptyMessage}</p>
{:else}
	<div class={cn(className)}>
		<PlayerPerformanceSection
			title="By map"
			summary={mapSummary}
			icon={MapTrifoldIcon}
			bind:expanded={mapsExpanded}
		>
			<DataTable
				data={stats.byMap}
				columns={mapColumns}
				rowKey={(row) => row.map}
				onRowClick={toggleMapRow}
				isRowExpanded={(row) => expandedMap === row.map}
				rowWrapper={mapRowWrapper}
				loading={isLoading}
				skeletonRows={4}
				striped
				empty="No map stats yet."
				class="rounded-none border-0"
				headerRowClass={sectionHeaderRow}
				cells={{
					map: cell_map,
					games: cell_games,
					wins: cell_wins,
					losses: cell_losses,
					winrate: cell_winrate,
					expand: cell_expand
				}}
			/>
		</PlayerPerformanceSection>

		<PlayerPerformanceSection
			title="By faction"
			summary={factionSummary}
			icon={FlagIcon}
			bind:expanded={factionExpanded}
		>
			<DataTable
				data={stats.byFaction}
				columns={factionColumns}
				rowKey={(row) => row.raceId}
				loading={isLoading}
				skeletonRows={3}
				striped
				empty="No faction stats yet."
				class="rounded-none border-0"
				headerRowClass={sectionHeaderRow}
				cells={{
					faction: cell_faction,
					wins: cell_wins,
					losses: cell_losses,
					winrate: cell_winrate
				}}
			/>
		</PlayerPerformanceSection>

		<PlayerPerformanceSection
			title="By mode"
			summary={modeSummary}
			icon={UsersThreeIcon}
			bind:expanded={modeExpanded}
		>
			<DataTable
				data={byMode}
				columns={modeColumns}
				rowKey={(row) => row.matchtypeId}
				loading={isLoading}
				skeletonRows={3}
				striped
				empty="No mode stats yet."
				class="rounded-none border-0"
				headerRowClass={sectionHeaderRow}
				cells={{
					mode: cell_mode,
					wins: cell_wins,
					losses: cell_losses,
					winrate: cell_winrate
				}}
			/>
		</PlayerPerformanceSection>
	</div>
{/if}
