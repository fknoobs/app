<script lang="ts">
	import type { Component } from 'svelte';
	import MapImage from '$lib/components/MapImage.svelte';
	import { cn } from '$lib/cn';
	import { interactive, tableHeadRow } from '$lib/variants';
	import { getFactionFlagByRace } from '$lib/ranks';
	import { normalizeMapName } from '$lib/player-format';
	import {
		formatDurationSeconds,
		formatMatchDate,
		matchDurationSeconds,
		playerHref,
		teamOutcome,
		teamPlayers,
		type CommunityMatch,
		type CommunityPlayer,
		type HistorySortDir,
		type HistorySortField
	} from '$lib/replays';
	import HeartIcon from 'phosphor-svelte/lib/HeartIcon';
	import DownloadIcon from 'phosphor-svelte/lib/DownloadIcon';
	import RankingIcon from 'phosphor-svelte/lib/RankingIcon';
	import ChatCircleIcon from 'phosphor-svelte/lib/ChatCircleIcon';
	import ArrowDownIcon from 'phosphor-svelte/lib/ArrowDownIcon';
	import ArrowUpIcon from 'phosphor-svelte/lib/ArrowUpIcon';
	import ArrowsDownUpIcon from 'phosphor-svelte/lib/ArrowsDownUpIcon';

	type Props = {
		matches: CommunityMatch[];
		highlightedPlayers?: string[];
		sort: HistorySortField;
		sortDir: HistorySortDir;
		onSort: (field: HistorySortField) => void;
	};

	let { matches, highlightedPlayers = [], sort, sortDir, onSort }: Props = $props();

	function outcomeClass(outcome: 'win' | 'loss' | null) {
		if (outcome === 'win') return 'bg-green-500/5';
		if (outcome === 'loss') return 'bg-red-500/5';
		return '';
	}

	function sortIcon(field: HistorySortField) {
		if (sort !== field) return 'none' as const;
		return sortDir;
	}

	function sortAria(field: HistorySortField) {
		if (sort !== field) return 'none' as const;
		return sortDir === 'asc' ? 'ascending' : 'descending';
	}
</script>

{#snippet sortHeader(field: HistorySortField, label: string)}
	<th class="w-2/24 px-4 py-2" aria-sort={sortAria(field)}>
		<button
			type="button"
			class={cn(
				interactive,
				'flex w-full min-w-0 items-center justify-end gap-1 bg-transparent p-0 text-inherit'
			)}
			aria-label="Sort by {label}"
			onclick={() => onSort(field)}
		>
			{label}
			{#if sortIcon(field) === 'desc'}
				<ArrowDownIcon size={14} class="shrink-0" weight="duotone" />
			{:else if sortIcon(field) === 'asc'}
				<ArrowUpIcon size={14} class="shrink-0" weight="duotone" />
			{:else}
				<ArrowsDownUpIcon size={14} class="shrink-0" weight="duotone" />
			{/if}
		</button>
	</th>
{/snippet}

{#snippet playerFlag(player: CommunityPlayer, className: string)}
	<img
		src={getFactionFlagByRace(player.race ?? 0)}
		alt={player.profile.alias}
		title={player.profile.alias}
		class={className}
	/>
{/snippet}

{#snippet teamCell(match: CommunityMatch, team: 'allies' | 'axis')}
	<td class={cn('px-4 py-0', outcomeClass(teamOutcome(match, team)))}>
		<div class="flex items-center gap-1.5">
			{#each teamPlayers(match, team) as player (player.profile.profile_id)}
				{@const href = playerHref(player)}
				{@const highlighted = highlightedPlayers.includes(String(player.profile.profile_id))}
				{#if href}
					<a
						{href}
						title={player.profile.alias}
						class={cn(
							interactive,
							'ring-secondary-800 shrink-0 rounded-full ring-3',
							highlighted && 'ring-primary-100'
						)}
					>
						{@render playerFlag(player, 'size-5 rounded-full object-cover')}
					</a>
				{:else}
					{@render playerFlag(player, 'size-6 shrink-0 rounded-full object-cover opacity-70')}
				{/if}
			{/each}
		</div>
	</td>
{/snippet}

{#snippet countCell(count: number, Icon: Component)}
	<td class="text-secondary-400 px-4 py-0 text-right tabular-nums">
		<span class="inline-flex items-center justify-end gap-1.5">
			<Icon size={16} weight="duotone" />
			{count}
		</span>
	</td>
{/snippet}

{#if matches.length === 0}
	<p class="text-secondary-400 px-4 py-3 text-sm">No community replays found.</p>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full table-fixed border-collapse text-sm">
			<thead>
				<tr class="{tableHeadRow} text-left">
					<th class="w-8/24 px-4 py-2">Map</th>
					<th class="w-3/24 px-4 py-2">Allies</th>
					<th class="w-3/24 px-4 py-2">Axis</th>
					<th class="w-2/24 px-4 py-2">Duration</th>
					{@render sortHeader('likeCount', 'Likes')}
					{@render sortHeader('downloadCount', 'Downloads')}
					<th class="w-4/24 px-4 py-2 text-end">Date</th>
				</tr>
			</thead>
			<tbody>
				{#each matches as match (match.id)}
					<tr class="border-secondary-800/70 hover:bg-secondary-950/50 h-11 border-t text-white">
						<td class="overflow-clip py-0 pr-0 pl-4">
							<a
								href="/replays/{match.id}"
								class={cn(interactive, 'flex h-11 min-w-0 items-center gap-0')}
							>
								<MapImage map={match.map} alt={normalizeMapName(match.map)} small flush />
								<div class="flex min-w-0 items-center gap-2 px-4">
									{#if (match.commentCount ?? 0) > 0}
										<span
											class="text-secondary-400 inline-flex shrink-0 items-center gap-1 text-sm tabular-nums"
											title="Comments"
										>
											<ChatCircleIcon size={16} weight="duotone" />
											{match.commentCount}
										</span>
									{/if}
									<span class="min-w-0 truncate font-medium">{normalizeMapName(match.map)}</span>
									{#if match.isRanked}
										<RankingIcon class="text-primary-100 shrink-0" weight="duotone" />
									{/if}
								</div>
							</a>
						</td>
						{@render teamCell(match, 'allies')}
						{@render teamCell(match, 'axis')}
						<td class="text-secondary-400 px-4 py-0 tabular-nums">
							<a href="/replays/{match.id}" class={cn(interactive, 'hover:text-white')}>
								{formatDurationSeconds(matchDurationSeconds(match))}
							</a>
						</td>
						{@render countCell(match.likeCount ?? 0, HeartIcon)}
						{@render countCell(match.downloadCount ?? 0, DownloadIcon)}
						<td class="text-secondary-400 px-4 py-0 text-end text-sm tabular-nums">
							{formatMatchDate(match.createdAt)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
