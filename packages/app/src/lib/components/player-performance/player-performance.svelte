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
	import PlayerPerformanceEloHistory from './player-performance-elo-history.svelte';
	import ChartLineIcon from 'phosphor-svelte/lib/ChartLineIcon';
	import {
		getPlayerEloHistory,
		groupEloHistoryByModeAndRace
	} from '$core/pocketbase/player-ratings';
	import type { PlayerEloHistoryPoint } from '$core/pocketbase/player-ratings';
	import { useI18n } from '$lib/i18n';
	import { dev } from '$app/environment';

	type Props = {
		profileId: number | null | undefined;
		scope: PerformanceScope;
		userId?: string | null;
		empty?: 'self' | 'other';
		class?: string;
		refreshKey?: number;
	};

	let {
		profileId,
		scope,
		userId = null,
		empty = 'other',
		class: className,
		refreshKey = 0
	}: Props = $props();
	const { t } = useI18n();

	const performance = resource(
		[() => profileId ?? null, () => scope, () => userId ?? null, () => refreshKey],
		async ([id, nextScope, nextUserId, generation]) => {
			if (!id) return emptyPlayerPerformance();
			if (nextScope === 'user' && !nextUserId) return emptyPlayerPerformance();
			return getPlayerPerformance({
				profileId: id,
				scope: nextScope,
				userId: nextUserId,
				fresh: generation > 0
			});
		},
		{ initialValue: emptyPlayerPerformance() }
	);

	const stats = $derived(performance.current ?? emptyPlayerPerformance());
	const emptyMessage = $derived(
		empty === 'self'
			? t('Play with the companion running to build stats.')
			: t('No tracked community matches for this player.')
	);

	const byMode = $derived(stats.byMode.filter((mode) => dev || mode.matchtypeId !== 14));
	const isLoading = $derived(performance.loading && stats.matchCount === 0);
	let expandedMap = $state<string | null>(null);
	let expandedFaction = $state<number | null>(null);
	let expandedMode = $state<number | null>(null);
	let mapsExpanded = $state(false);
	let factionExpanded = $state(false);
	let modeExpanded = $state(false);
	let eloExpanded = $state(false);

	const eloHistory = resource(
		[() => (eloExpanded ? (profileId ?? null) : null)],
		async ([id]) => {
			if (!id) return [] as PlayerEloHistoryPoint[];
			return getPlayerEloHistory({ profileId: id });
		},
		{ initialValue: [] as PlayerEloHistoryPoint[] }
	);

	const eloPoints = $derived(eloHistory.current ?? []);
	const eloModeCount = $derived(Object.keys(groupEloHistoryByModeAndRace(eloPoints)).length);
	const eloSummary = $derived(
		!eloExpanded
			? t('Tracked lobby ratings')
			: eloHistory.loading && eloPoints.length === 0
				? t('Loading…')
				: t('{points} rating points · {modes} modes', {
						points: eloPoints.length,
						modes: eloModeCount
					})
	);

	const mapGames = $derived(
		stats.byMap.reduce((total, row) => total + row.wins + row.losses, 0)
	);
	const factionGames = $derived(
		stats.byFaction.reduce((total, row) => total + row.wins + row.losses, 0)
	);
	const modeGames = $derived(byMode.reduce((total, row) => total + row.wins + row.losses, 0));
	const mapSummary = $derived(t('{maps} maps · {games} games', { maps: stats.byMap.length, games: mapGames }));
	const factionSummary = $derived(
		t('{factions} factions · {games} games', { factions: stats.byFaction.length, games: factionGames })
	);
	const modeSummary = $derived(t('{modes} game modes · {games} games', { modes: byMode.length, games: modeGames }));

	const statHeader = 'flex w-full justify-center';
	const statCell = 'flex w-full justify-center tabular-nums';
	const statPad = { headerCellClass: 'px-2', cellClass: () => 'px-2' };
	const sectionHeaderRow = 'text-secondary-400';
	const gamesColumn = $derived({
		id: 'games',
		header: t('Games'),
		width: 'w-[3.25rem]',
		headerClass: statHeader,
		class: statCell,
		...statPad
	} as const);
	const expandColumn = {
		id: 'expand',
		header: '',
		width: 'w-8',
		headerCellClass: 'p-0',
		cellClass: () => 'p-0',
		class: 'flex w-full justify-center',
		hideSkeleton: true
	} as const;

	const mapColumns: ColumnDef<PerformanceMapRecord>[] = $derived([
		{ id: 'map', header: t('Map'), class: 'flex min-w-0 items-center gap-3' },
		gamesColumn,
		{
			id: 'wins',
			header: t('Wins'),
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'losses',
			header: t('Losses'),
			width: 'w-[4.75rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'winrate',
			header: t('Winrate'),
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		expandColumn
	]);

	const factionColumns: ColumnDef<PerformanceFactionRecord>[] = $derived([
		{
			id: 'faction',
			header: t('Faction'),
			class: 'flex min-w-0 items-center gap-2'
		},
		gamesColumn,
		{
			id: 'wins',
			header: t('Wins'),
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'losses',
			header: t('Losses'),
			width: 'w-[4.75rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'winrate',
			header: t('Winrate'),
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		expandColumn
	]);

	const modeColumns: ColumnDef<PerformanceModeRecord>[] = $derived([
		{ id: 'mode', header: t('Mode'), class: 'flex min-w-0 items-center' },
		gamesColumn,
		{
			id: 'wins',
			header: t('Wins'),
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'losses',
			header: t('Losses'),
			width: 'w-[4.75rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		{
			id: 'winrate',
			header: t('Winrate'),
			width: 'w-[4.5rem]',
			headerClass: statHeader,
			class: statCell,
			...statPad
		},
		expandColumn
	]);

	function winrate(row: { wins: number; losses: number }): string {
		const total = row.wins + row.losses;
		if (total === 0) return '-';
		return `${Math.round((row.wins / total) * 100)}%`;
	}

	function modeLabel(matchtypeId: number): string {
		return MATCH_TYPES[matchtypeId as keyof typeof MATCH_TYPES] ?? t('Mode {id}', { id: matchtypeId });
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
						label={t('on {map}', { map: normalizeMapName(row.map) })}
						emptyMessage={t('No matches found for this map.')}
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
						label={t('as {faction}', { faction: getRaceLabel(row.raceId) })}
						emptyMessage={t('No matches found for this faction.')}
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
						label={t('in {mode}', { mode: modeLabel(row.matchtypeId) })}
						emptyMessage={t('No matches found for this mode.')}
					/>
				{/if}
			</td>
		</tr>
	{/if}
{/snippet}

<div class={cn(className)}>
	<PlayerPerformanceSection
		title={t('ELO history')}
		summary={eloSummary}
		icon={ChartLineIcon}
		bind:expanded={eloExpanded}
	>
		{#if profileId}
			<PlayerPerformanceEloHistory points={eloPoints} loading={eloHistory.loading} />
		{/if}
	</PlayerPerformanceSection>

	{#if !performance.loading && stats.matchCount === 0}
		<p class="text-secondary-400 px-4 py-3 text-sm">{emptyMessage}</p>
	{:else}
		<PlayerPerformanceSection
			title={t('By map')}
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
				empty={t('No map stats yet.')}
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
			title={t('By faction')}
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
				empty={t('No faction stats yet.')}
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
			title={t('By mode')}
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
				empty={t('No mode stats yet.')}
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
	{/if}
</div>
