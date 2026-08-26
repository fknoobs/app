<script lang="ts">
	import type { MatchExpanded } from '$core/app/database/matches';
	import MatchRoot from './match.svelte';
	import MatchMapImage from './match-map-image.svelte';
	import MatchMapName from './match-map-name.svelte';
	import MatchPlayers from './match-players.svelte';
	import MatchRating from './match-rating.svelte';
	import MatchDuration from './match-duration.svelte';
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import MatchLobbyPlayers from '$lib/components/widgets/match-lobby-players.svelte';
	import { getMatchModeLabel } from '$lib/components/widgets/dashboard-utils';
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { useI18n } from '$lib/i18n';

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
	const { t } = useI18n();

	let expandedId = $state<string | null>(null);

	const columns = $derived.by(() => {
		const cols: ColumnDef<MatchExpanded>[] = [];
		if (showMap) {
			cols.push({
				id: 'map',
				header: t('Map'),
				width: 'w-2/24',
				class: 'flex h-full items-center',
				cellClass: () => 'overflow-clip py-0 pr-0 pl-4'
			});
		}
		cols.push(
			{ id: 'name', header: t('Name'), width: 'w-5/24', class: 'min-w-0 truncate font-medium' },
			{ id: 'type', header: t('Type'), width: 'w-2/24', class: 'text-secondary-400 truncate text-sm' },
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
			{
				id: 'duration',
				header: t('Duration'),
				width: 'w-3/24',
				class: 'text-secondary-400 truncate text-sm'
			}
		);
		if (showRating) {
			cols.push({ id: 'rating', header: t('Rating'), width: 'w-3/24' });
		}
		cols.push({ id: 'actions', header: '', width: 'w-3/24', hideSkeleton: true });
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
		event.stopPropagation();
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		void goto(href);
	}
</script>

{#snippet cell_map({ row }: { row: MatchExpanded })}
	<MatchMapImage small flush />
{/snippet}
{#snippet cell_name({ row }: { row: MatchExpanded })}
	<MatchMapName class="text-secondary-300 font-medium" />
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
	<MatchRating class="text-sm" profileId={highlightedPlayers[0]} />
{/snippet}
{#snippet cell_actions({ row }: { row: MatchExpanded })}
	<Button
		href="/history/{row.id}"
		size="sm"
		variant="secondary"
		class="h-7 px-2.5 text-xs"
		onclick={(event) => openDetails(event, `/history/${row.id}`)}
	>
		{t('Details')}
	</Button>
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
		<p class="text-secondary-400 px-4 py-2 text-sm">{t(emptyMessage)}</p>
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
			empty={emptyMessage ?? t('No matches.')}
			cells={{
				map: cell_map,
				name: cell_name,
				type: cell_type,
				allies: cell_allies,
				axis: cell_axis,
				duration: cell_duration,
				rating: cell_rating,
				actions: cell_actions,
				expand: cell_expand
			}}
		/>
	{/if}
	{#if footer}
		{@render footer()}
	{/if}
</div>
