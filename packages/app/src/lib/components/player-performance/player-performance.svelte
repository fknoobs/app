<script lang="ts">
	import {
		emptyPlayerPerformance,
		getPlayerPerformance,
		type PerformanceFactionRecord,
		type PerformanceMapRecord,
		type PerformanceModeRecord,
		type PerformanceRecentMatch,
		type PerformanceScope
	} from '$core/pocketbase/player-performance';
	import * as List from '$lib/components/ui/list';
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import MapImage from '$lib/components/ui/map-image.svelte';
	import { H } from '$lib/components/ui/h';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { cn, getFactionFlagFromRace, normalizeMapName } from '$lib/utils';
	import { MATCH_TYPES } from '$core/game/lobby';
	import {
		getRaceLabel,
		getRatioColor,
		getRatioValue
	} from '$lib/components/leaderboard/leaderboard-utils';
	import LeaderboardStatPill from '$lib/components/leaderboard/leaderboard-stat-pill.svelte';
	import { interactive, statLosses, statWins } from '$lib/components/ui/variants';
	import { tooltip } from '$lib/attachments';
	import { resource } from 'runed';

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

	const bestMap = $derived.by(() => {
		const eligible = stats.byMap.filter((map) => map.wins + map.losses >= 3);
		const pool = eligible.length > 0 ? eligible : stats.byMap;
		return (
			[...pool].sort(
				(a, b) => getRatioValue(b.wins, b.losses) - getRatioValue(a.wins, a.losses)
			)[0] ?? null
		);
	});
	const byMode = $derived(stats.byMode.filter((mode) => mode.matchtypeId !== 14));
	const recentMatches = $derived(stats.recentMatches ?? []);
	const isLoading = $derived(performance.loading && stats.matchCount === 0);

	const statHeader = 'flex w-full justify-center';
	const statCell = 'flex w-full justify-center tabular-nums';

	const spacer = {
		id: 'spacer',
		header: '',
		headerCellClass: 'p-0',
		cellClass: () => 'p-0',
		hideSkeleton: true
	};

	const mapColumns: ColumnDef<PerformanceMapRecord>[] = [
		{ id: 'map', header: 'Map', class: 'flex min-w-0 items-center gap-3' },
		spacer,
		{ id: 'games', header: 'Games', width: 'w-[5rem]', headerClass: statHeader, class: statCell },
		{ id: 'wins', header: 'Wins', width: 'w-[4.5rem]', headerClass: statHeader, class: statCell },
		{
			id: 'losses',
			header: 'Losses',
			width: 'w-[5.5rem]',
			headerClass: statHeader,
			class: statCell
		},
		{
			id: 'winrate',
			header: 'Winrate',
			width: 'w-[5.5rem]',
			headerClass: statHeader,
			class: statCell
		}
	];

	const factionColumns: ColumnDef<PerformanceFactionRecord>[] = [
		{
			id: 'faction',
			header: 'Faction',
			class: 'flex min-w-0 items-center gap-2'
		},
		spacer,
		{ id: 'wins', header: 'Wins', width: 'w-[4.5rem]', headerClass: statHeader, class: statCell },
		{
			id: 'losses',
			header: 'Losses',
			width: 'w-[5.5rem]',
			headerClass: statHeader,
			class: statCell
		},
		{
			id: 'winrate',
			header: 'Winrate',
			width: 'w-[5.5rem]',
			headerClass: statHeader,
			class: statCell
		}
	];

	const modeColumns: ColumnDef<PerformanceModeRecord>[] = [
		{ id: 'mode', header: 'Mode', class: 'flex min-w-0 items-center' },
		spacer,
		{ id: 'wins', header: 'Wins', width: 'w-[4.5rem]', headerClass: statHeader, class: statCell },
		{
			id: 'losses',
			header: 'Losses',
			width: 'w-[5.5rem]',
			headerClass: statHeader,
			class: statCell
		},
		{
			id: 'winrate',
			header: 'Winrate',
			width: 'w-[5.5rem]',
			headerClass: statHeader,
			class: statCell
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

	function recentMatchLabel(match: PerformanceRecentMatch): string {
		const faction = match.raceId != null ? getRaceLabel(match.raceId) : 'Unknown';
		const mode = match.matchtypeId != null ? modeLabel(match.matchtypeId) : 'Unknown';
		return `${faction} · ${mode}`;
	}

	function recentMatchTooltip(match: PerformanceRecentMatch): string {
		const mode = match.matchtypeId != null ? modeLabel(match.matchtypeId) : 'Unknown';
		if (match.raceId == null) return mode;
		return `<span class="inline-flex items-center gap-1.5 leading-none"><span class="inline-flex p-[3px]"><img src="${getFactionFlagFromRace(match.raceId)}" alt="" class="ring-secondary-800 h-5 w-5 shrink-0 rounded-full object-cover ring-3" /></span>${mode}</span>`;
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

{#if !performance.loading && stats.matchCount === 0}
	<p class={cn('text-secondary-400 px-5 py-3 text-sm', className)}>{emptyMessage}</p>
{:else}
	<div class={cn('space-y-6 px-5 py-3', className)}>
		{#if isLoading}
			<div class="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2">
				{#each Array(4) as _, index (index)}
					<Skeleton class="h-4 w-20" />
					<Skeleton class="h-4 w-36" />
				{/each}
			</div>
		{:else}
			<List.Root>
				<List.Title>Tracked:</List.Title>
				<List.Value>{stats.matchCount} matches</List.Value>
				<List.Title>Record:</List.Title>
				<List.Value class="flex items-center gap-2">
					<span class={statWins}>{stats.wins}W</span>
					<span class="text-secondary-600">·</span>
					<span class={statLosses}>{stats.losses}L</span>
					<LeaderboardStatPill type="ratio" wins={stats.wins} losses={stats.losses} streak={0} />
				</List.Value>
				{#if recentMatches.length > 0}
					<List.Title>Recent matches:</List.Title>
					<List.Value class="flex items-center gap-1">
						{#each recentMatches as match (match.id || match.sessionId)}
							<a
								href="/history/{match.id}"
								class={cn(interactive, 'inline-flex')}
								aria-label="{match.outcome === 1 ? 'Win' : 'Loss'} — {recentMatchLabel(match)}"
								{@attach tooltip(recentMatchTooltip(match))}
							>
								<Badge
									variant={match.outcome === 1 ? 'success' : 'destructive'}
									class={cn(
										'min-w-6 px-1.5 py-0.5 text-center font-semibold',
										match.outcome === 1 && 'border-success/25 bg-success/5 text-green-400'
									)}
								>
									{match.outcome === 1 ? 'W' : 'L'}
								</Badge>
							</a>
						{/each}
					</List.Value>
				{/if}
				{#if bestMap}
					<List.Title>Best map:</List.Title>
					<List.Value class="flex items-center gap-2">
						<span class="text-secondary-300">{normalizeMapName(bestMap.map)}</span>
						<span class={statWins}>{bestMap.wins}W</span>
						<span class="text-secondary-600">·</span>
						<span class={statLosses}>{bestMap.losses}L</span>
						<span class="font-medium" style:color={getRatioColor(bestMap.wins, bestMap.losses)}>
							{winrate(bestMap)}
						</span>
					</List.Value>
				{/if}
			</List.Root>
		{/if}

		<div>
			<H level="5" class="text-secondary-300 mb-2">Maps</H>
			<DataTable
				data={stats.byMap}
				columns={mapColumns}
				rowKey={(row) => row.map}
				loading={isLoading}
				skeletonRows={4}
				density="compact"
				empty="No map stats yet."
				cells={{
					map: cell_map,
					games: cell_games,
					wins: cell_wins,
					losses: cell_losses,
					winrate: cell_winrate
				}}
			/>
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<div>
				<H level="5" class="text-secondary-300 mb-2">Factions</H>
				<DataTable
					data={stats.byFaction}
					columns={factionColumns}
					rowKey={(row) => row.raceId}
					loading={isLoading}
					skeletonRows={3}
					density="compact"
					empty="No faction stats yet."
					cells={{
						faction: cell_faction,
						wins: cell_wins,
						losses: cell_losses,
						winrate: cell_winrate
					}}
				/>
			</div>
			<div>
				<H level="5" class="text-secondary-300 mb-2">Modes</H>
				<DataTable
					data={byMode}
					columns={modeColumns}
					rowKey={(row) => row.matchtypeId}
					loading={isLoading}
					skeletonRows={3}
					density="compact"
					empty="No mode stats yet."
					cells={{
						mode: cell_mode,
						wins: cell_wins,
						losses: cell_losses,
						winrate: cell_winrate
					}}
				/>
			</div>
		</div>
	</div>
{/if}
