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
	import PlayerPerformanceMatches from './player-performance-matches.svelte';
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
	let expandedFaction = $state<number | null>(null);
	let expandedMode = $state<number | null>(null);
	let mapsExpanded = $state(false);
	let factionExpanded = $state(false);
	let modeExpanded = $state(false);

	const mapGames = $derived(
		stats.byMap.reduce((total, row) => total + row.wins + row.losses, 0)
	);
	const factionGames = $derived(
		stats.byFaction.reduce((total, row) => total + row.wins + row.losses, 0)
	);
	const modeGames = $derived(byMode.reduce((total, row) => total + row.wins + row.losses, 0));
	const mapSummary = $derived(`${stats.byMap.length} maps · ${mapGames} games`);
	const factionSummary = $derived(`${stats.byFaction.length} factions · ${factionGames} games`);
	const modeSummary = $derived(`${byMode.length} game modes · ${modeGames} games`);

	const statHeader = 'flex w-full justify-center';
	const statCell = 'flex w-full justify-center tabular-nums';
	const statPad = { headerCellClass: 'px-2', cellClass: () => 'px-2' };
	const sectionHeaderRow = 'text-secondary-400';
	const gamesColumn = {
		id: 'games',
		header: 'Games',
		width: 'w-[3.25rem]',
		headerClass: statHeader,
		class: statCell,
		...statPad
	} as const;
	const expandColumn = {
		id: 'expand',
		header: '',
		width: 'w-8',
		headerCellClass: 'p-0',
		cellClass: () => 'p-0',
		class: 'flex w-full justify-center',
		hideSkeleton: true
	} as const;

	const mapColumns: ColumnDef<PerformanceMapRecord>[] = [
		{ id: 'map', header: 'Map', class: 'flex min-w-0 items-center gap-3' },
		gamesColumn,
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
		expandColumn
	];

	const factionColumns: ColumnDef<PerformanceFactionRecord>[] = [
		{
			id: 'faction',
			header: 'Faction',
			class: 'flex min-w-0 items-center gap-2'
		},
		gamesColumn,
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
		expandColumn
	];

	const modeColumns: ColumnDef<PerformanceModeRecord>[] = [
		{ id: 'mode', header: 'Mode', class: 'flex min-w-0 items-center' },
		gamesColumn,
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
		expandColumn
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

	function toggleFactionRow(factionRecord: PerformanceFactionRecord) {
		expandedFaction = expandedFaction === factionRecord.raceId ? null : factionRecord.raceId;
	}

	function toggleModeRow(modeRecord: PerformanceModeRecord) {
		expandedMode = expandedMode === modeRecord.matchtypeId ? null : modeRecord.matchtypeId;
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
{#snippet cell_games({ row }: { row: { wins: number; losses: number } })}
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
{#snippet cell_expand_map({ row }: { row: PerformanceMapRecord })}
	<CaretDownIcon
		class={cn('size-4 transition-transform', expandedMap === row.map && 'rotate-180')}
	/>
{/snippet}
{#snippet cell_expand_faction({ row }: { row: PerformanceFactionRecord })}
	<CaretDownIcon
		class={cn('size-4 transition-transform', expandedFaction === row.raceId && 'rotate-180')}
	/>
{/snippet}
{#snippet cell_expand_mode({ row }: { row: PerformanceModeRecord })}
	<CaretDownIcon
		class={cn('size-4 transition-transform', expandedMode === row.matchtypeId && 'rotate-180')}
	/>
{/snippet}
{#snippet mapRowWrapper({ row, children }: { row: PerformanceMapRecord; children: Snippet })}
	{@const expanded = expandedMap === row.map}
	{@render children()}
	{#if expanded}
		<tr>
			<td colspan={mapColumns.length} class="border-secondary-800 border-b p-0">
				{#if profileId}
					<PlayerPerformanceMatches
						maps={[row.map]}
						{profileId}
						{scope}
						{userId}
						totalGames={row.wins + row.losses}
						showMap={false}
						label={`on ${normalizeMapName(row.map)}`}
						emptyMessage="No matches found for this map."
					/>
				{/if}
			</td>
		</tr>
	{/if}
{/snippet}
{#snippet factionRowWrapper({ row, children }: { row: PerformanceFactionRecord; children: Snippet })}
	{@const expanded = expandedFaction === row.raceId}
	{@render children()}
	{#if expanded}
		<tr>
			<td colspan={factionColumns.length} class="border-secondary-800 border-b p-0">
				{#if profileId}
					<PlayerPerformanceMatches
						races={[row.raceId]}
						{profileId}
						{scope}
						{userId}
						totalGames={row.wins + row.losses}
						label={`as ${getRaceLabel(row.raceId)}`}
						emptyMessage="No matches found for this faction."
					/>
				{/if}
			</td>
		</tr>
	{/if}
{/snippet}
{#snippet modeRowWrapper({ row, children }: { row: PerformanceModeRecord; children: Snippet })}
	{@const expanded = expandedMode === row.matchtypeId}
	{@render children()}
	{#if expanded}
		<tr>
			<td colspan={modeColumns.length} class="border-secondary-800 border-b p-0">
				{#if profileId}
					<PlayerPerformanceMatches
						matchtypes={[row.matchtypeId]}
						{profileId}
						{scope}
						{userId}
						totalGames={row.wins + row.losses}
						label={`in ${modeLabel(row.matchtypeId)}`}
						emptyMessage="No matches found for this mode."
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
				empty="No map stats yet."
				class="rounded-none border-0"
				headerRowClass={sectionHeaderRow}
				cells={{
					map: cell_map,
					games: cell_games,
					wins: cell_wins,
					losses: cell_losses,
					winrate: cell_winrate,
					expand: cell_expand_map
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
				onRowClick={toggleFactionRow}
				isRowExpanded={(row) => expandedFaction === row.raceId}
				rowWrapper={factionRowWrapper}
				loading={isLoading}
				skeletonRows={3}
				empty="No faction stats yet."
				class="rounded-none border-0"
				headerRowClass={sectionHeaderRow}
				cells={{
					faction: cell_faction,
					games: cell_games,
					wins: cell_wins,
					losses: cell_losses,
					winrate: cell_winrate,
					expand: cell_expand_faction
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
				onRowClick={toggleModeRow}
				isRowExpanded={(row) => expandedMode === row.matchtypeId}
				rowWrapper={modeRowWrapper}
				loading={isLoading}
				skeletonRows={3}
				empty="No mode stats yet."
				class="rounded-none border-0"
				headerRowClass={sectionHeaderRow}
				cells={{
					mode: cell_mode,
					games: cell_games,
					wins: cell_wins,
					losses: cell_losses,
					winrate: cell_winrate,
					expand: cell_expand_mode
				}}
			/>
		</PlayerPerformanceSection>
	</div>
{/if}
