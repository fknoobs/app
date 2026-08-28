<script lang="ts">
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import * as Match from '$lib/components/match';
	import { Selection, Checkbox } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import { ToggleGroup } from '$lib/components/ui/toggle-group';
	import { Pagination } from '$lib/components/ui/pagination';
	import { app } from '$core/app/context';
	import type { MatchExpanded } from '$core/app/database/matches';
	import { Race } from '$lib/utils/game';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
	const matches = $derived(app.features.history?.matches);

	const factionOptions = [
		{ label: 'USA', value: String(Race.US) },
		{ label: 'Wehrmacht', value: String(Race.Wehrmacht) },
		{ label: 'Commonwealth', value: String(Race.Commonwealth) },
		{ label: 'Panzer Elite', value: String(Race.PanzerElite) }
	];

	const columns: ColumnDef<MatchExpanded>[] = [
		{
			id: 'map',
			header: t('Map'),
			width: 'w-5/24',
			class: 'flex h-full min-w-0 items-center gap-0',
			cellClass: () => 'overflow-clip py-0 pr-0 pl-4',
			href: (match) => `/history/${match.id}`
		},
		{ id: 'name', header: t('Name'), width: 'w-4/24' },
		{
			id: 'allies',
			header: t('Allies'),
			width: 'w-3/24',
			class: 'flex h-full items-center overflow-visible',
			cellClass: (row) =>
				cn(
					row.alliesOutcome === 'win' && 'bg-green-500/5',
					row.alliesOutcome === 'loss' && 'bg-red-500/5'
				)
		},
		{
			id: 'axis',
			header: t('Axis'),
			width: 'w-3/24',
			class: 'flex h-full items-center overflow-visible',
			cellClass: (row) =>
				cn(
					row.axisOutcome === 'win' && 'bg-green-500/5',
					row.axisOutcome === 'loss' && 'bg-red-500/5'
				)
		},
		{ id: 'duration', header: t('Duration'), width: 'w-3/24' },
		{
			id: 'stats',
			header: t('Activity'),
			width: 'w-2/24',
			class: 'flex items-center justify-end',
			headerClass: 'text-end'
		},
		{
			id: 'date',
			header: t('Date'),
			width: 'w-4/24',
			class: 'flex items-center',
			headerClass: 'text-end'
		}
	];
</script>

{#if matches}
	<div
		class="border-secondary-800 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b p-4"
	>
		<div class="flex flex-col flex-wrap gap-4">
			<ToggleGroup
				bind:value={matches.scope}
				items={[
					{ label: t('My matches'), value: 'user' },
					{ label: t('Community matches'), value: 'community' }
				]}
				class="w-fit"
			/>
			<div class="flex h-11 items-center">
				<Checkbox bind:checked={matches.filters.ranked} label={t('Ranked only')} />
			</div>
			<div class="flex gap-4">
				<div class="flex w-fit flex-col gap-1.5">
					<span class="text-secondary-400 text-xs font-medium">{t('Players')}</span>
					<Selection
						placeholder={t('Select players')}
						bind:value={matches.filters.playerIds}
						options={matches.players}
						multiple
					/>
				</div>
				<div class="flex w-fit flex-col gap-1.5">
					<span class="text-secondary-400 text-xs font-medium">{t('Maps')}</span>
					<Selection
						placeholder={t('Select maps')}
						bind:value={matches.filters.maps}
						options={matches.maps}
						multiple
					/>
				</div>
				<div class="flex w-fit flex-col gap-1.5">
					<span class="text-secondary-400 text-xs font-medium">{t('Faction')}</span>
					<Selection
						placeholder={t('Select factions')}
						bind:value={matches.filters.races}
						options={factionOptions}
						multiple
					/>
				</div>
			</div>
		</div>
		{#if matches.displayedResult}
			<Pagination
				class="ms-auto shrink-0"
				bind:page={matches.page}
				perPage={matches.perPage}
				count={matches.displayedResult.totalItems}
			/>
		{/if}
	</div>

	{#snippet cell_map({ row }: { row: MatchExpanded })}
		<Match.MapImage small flush />
		<Match.MapName class="min-w-0 truncate px-4" />
	{/snippet}
	{#snippet cell_name({ row }: { row: MatchExpanded })}
		<Match.Title class="text-secondary-400" />
	{/snippet}
	{#snippet cell_allies({ row }: { row: MatchExpanded })}
		<Match.Players
			team="allies"
			bind:outcome={row.alliesOutcome}
			highlightedPlayers={matches.filters.playerIds ?? []}
		/>
	{/snippet}
	{#snippet cell_axis({ row }: { row: MatchExpanded })}
		<Match.Players
			team="axis"
			bind:outcome={row.axisOutcome}
			highlightedPlayers={matches.filters.playerIds ?? []}
		/>
	{/snippet}
	{#snippet cell_duration({ row }: { row: MatchExpanded })}
		<Match.Duration class="text-secondary-400 text-sm" />
	{/snippet}
	{#snippet cell_stats({ row }: { row: MatchExpanded })}
		<Match.SocialCounts />
	{/snippet}
	{#snippet cell_date({ row }: { row: MatchExpanded })}
		{#if matches.scope === 'user'}
			<Match.Rating />
		{/if}
		<Match.Date class="text-secondary-400 ms-auto text-sm" />
	{/snippet}
	{#snippet matchRowWrapper({
		row,
		children
	}: {
		row: MatchExpanded;
		children: import('svelte').Snippet;
	})}
		<Match.Root match={row}>
			{@render children()}
		</Match.Root>
	{/snippet}

	{#if matches.tableLoading}
		<DataTable
			data={[]}
			{columns}
			rowKey={(match) => match.id}
			loading
			skeletonRows={matches.perPage}
		/>
	{:else if matches.displayedResult}
		<div class={cn(matches.result.loading && 'pointer-events-none opacity-60 transition-opacity')}>
			<DataTable
				data={matches.displayedResult.items}
				{columns}
				rowKey={(match) => match.id}
				rowWrapper={matchRowWrapper}
				cells={{
					map: cell_map,
					name: cell_name,
					allies: cell_allies,
					axis: cell_axis,
					duration: cell_duration,
					stats: cell_stats,
					date: cell_date
				}}
			/>
		</div>
		<div class="flex px-5 py-3">
			<Pagination
				class="ms-auto"
				bind:page={matches.page}
				perPage={matches.perPage}
				count={matches.displayedResult.totalItems}
			/>
		</div>
	{/if}
{/if}
