<script lang="ts">
	import type { MatchExpanded } from '$core/app/database/matches';
	import MatchRoot from './match.svelte';
	import MatchMapImage from './match-map-image.svelte';
	import MatchTitle from './match-title.svelte';
	import MatchPlayers from './match-players.svelte';
	import MatchRating from './match-rating.svelte';
	import MatchStatus from './match-status.svelte';
	import MatchDuration from './match-duration.svelte';
	import { goto } from '$app/navigation';
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import { cn } from '$lib/utils';
	import { interactive } from '$lib/components/ui/variants';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import MatchLobbyPlayers from '$lib/components/widgets/match-lobby-players.svelte';
	import { getMatchModeLabel } from '$lib/components/widgets/dashboard-utils';
	import type { Snippet } from 'svelte';

	type Props = {
		matches: MatchExpanded[];
		loading?: boolean;
		showMap?: boolean;
		showRating?: boolean;
		expandable?: boolean;
		highlightedPlayers?: string[];
		emptyMessage?: string;
		class?: string;
		footer?: Snippet;
	};

	let {
		matches,
		loading = false,
		showMap = true,
		showRating = true,
		expandable = true,
		highlightedPlayers = [],
		emptyMessage,
		class: className,
		footer
	}: Props = $props();

	let expandedId = $state<string | null>(null);

	const columns = $derived.by(() => {
		const cols: ColumnDef<MatchExpanded>[] = [];
		if (showMap) {
			cols.push({
				id: 'map',
				header: 'Map',
				width: 'w-2/24',
				class: 'flex items-center'
			});
		}
		cols.push(
			{ id: 'name', header: 'Name', width: 'w-5/24', class: 'min-w-0 truncate font-medium' },
			{ id: 'type', header: 'Type', width: 'w-2/24', class: 'text-secondary-400 truncate text-sm' },
			{
				id: 'allies',
				header: 'Allies',
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
				header: 'Axis',
				width: 'w-3/24',
				class: 'flex h-full items-center overflow-visible',
				cellClass: (row) =>
					cn(
						row.axisOutcome === 'win' && 'bg-green-500/5',
						row.axisOutcome === 'loss' && 'bg-red-500/5'
					)
			},
			{
				id: 'duration',
				header: 'Duration',
				width: 'w-3/24',
				class: 'text-secondary-400 truncate text-sm'
			}
		);
		if (showRating) {
			cols.push({ id: 'rating', header: 'Rating', width: 'w-3/24' });
		}
		cols.push(
			{
				id: 'status',
				header: 'Status',
				width: 'w-2/24',
				headerClass: 'text-center',
				class: 'flex w-full justify-center'
			},
			{ id: 'actions', header: '', width: 'w-3/24', hideSkeleton: true }
		);
		if (expandable) {
			cols.push({
				id: 'expand',
				header: '',
				width: 'w-1/24',
				headerCellClass: 'p-0',
				cellClass: () => 'p-0',
				class: 'flex w-full justify-center',
				hideSkeleton: true
			});
		}
		return cols;
	});

	function toggleExpanded(id: string) {
		if (!expandable) return;
		expandedId = expandedId === id ? null : id;
	}

	function openDetails(event: MouseEvent, href: string) {
		event.preventDefault();
		event.stopPropagation();
		void goto(href);
	}
</script>

{#snippet cell_map({ row }: { row: MatchExpanded })}
	<MatchMapImage small class="w-10" />
{/snippet}
{#snippet cell_name({ row }: { row: MatchExpanded })}
	<MatchTitle class="text-secondary-300" />
{/snippet}
{#snippet cell_type({ row }: { row: MatchExpanded })}
	{getMatchModeLabel(row)}
{/snippet}
{#snippet cell_allies({ row }: { row: MatchExpanded })}
	<div onpointerdown={(event) => event.stopPropagation()}>
		<MatchPlayers
			team="allies"
			bind:outcome={row.alliesOutcome}
			{highlightedPlayers}
			class="flex items-center gap-1.5 overflow-visible"
		/>
	</div>
{/snippet}
{#snippet cell_axis({ row }: { row: MatchExpanded })}
	<div onpointerdown={(event) => event.stopPropagation()}>
		<MatchPlayers
			team="axis"
			bind:outcome={row.axisOutcome}
			{highlightedPlayers}
			class="flex items-center gap-1.5 overflow-visible"
		/>
	</div>
{/snippet}
{#snippet cell_duration({ row }: { row: MatchExpanded })}
	<MatchDuration />
{/snippet}
{#snippet cell_rating({ row }: { row: MatchExpanded })}
	<MatchRating class="text-sm" />
{/snippet}
{#snippet cell_status({ row }: { row: MatchExpanded })}
	<MatchStatus />
{/snippet}
{#snippet cell_actions({ row }: { row: MatchExpanded })}
	<a
		href="/history/{row.id}"
		class={cn(interactive, 'text-primary text-sm whitespace-nowrap hover:underline')}
		onclick={(event) => openDetails(event, `/history/${row.id}`)}
	>
		View details
	</a>
{/snippet}
{#snippet cell_expand({ row }: { row: MatchExpanded })}
	<CaretDownIcon class={cn('size-4 transition-transform', expandedId === row.id && 'rotate-180')} />
{/snippet}
{#snippet matchRowWrapper({ row, children }: { row: MatchExpanded; children: Snippet })}
	{@const expanded = expandable && expandedId === row.id}
	<MatchRoot match={row}>
		{@render children()}
		{#if expanded}
			<tr>
				<td colspan={columns.length} class="p-0">
					<MatchLobbyPlayers match={row} />
				</td>
			</tr>
		{/if}
	</MatchRoot>
{/snippet}

<div class={className}>
	{#if !loading && matches.length === 0 && emptyMessage}
		<p class="text-secondary-400 px-4 py-2 text-sm">{emptyMessage}</p>
	{:else}
		<DataTable
			data={matches}
			{columns}
			rowKey={(match) => match.id}
			onRowClick={expandable ? (match) => toggleExpanded(match.id) : undefined}
			isRowExpanded={(match) => expandable && expandedId === match.id}
			rowWrapper={matchRowWrapper}
			{loading}
			skeletonRows={3}
			striped={false}
			empty={emptyMessage ?? 'No matches.'}
			cells={{
				map: cell_map,
				name: cell_name,
				type: cell_type,
				allies: cell_allies,
				axis: cell_axis,
				duration: cell_duration,
				rating: cell_rating,
				status: cell_status,
				actions: cell_actions,
				expand: cell_expand
			}}
		/>
	{/if}
	{#if footer}
		{@render footer()}
	{/if}
</div>
