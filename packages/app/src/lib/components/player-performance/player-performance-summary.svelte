<script lang="ts">
	import {
		emptyPlayerPerformance,
		getPlayerPerformance,
		type PerformanceRecentMatch,
		type PerformanceScope
	} from '$core/pocketbase/player-performance';
	import * as List from '$lib/components/ui/list';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
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
	import type { Snippet } from 'svelte';

	type Props = {
		profileId: number | null | undefined;
		scope: PerformanceScope;
		userId?: string | null;
		empty?: 'self' | 'other';
		class?: string;
		meta?: Snippet;
	};

	let { profileId, scope, userId = null, empty = 'other', class: className, meta }: Props = $props();

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
	const isLoading = $derived(performance.loading && stats.matchCount === 0);
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
				(a, b) => getRatioValue(b.wins, b.losses) - getRatioValue(a.wins, b.losses)
			)[0] ?? null
		);
	});
	const recentMatches = $derived(stats.recentMatches ?? []);

	const valueRow = 'inline-flex min-w-0 flex-nowrap items-center gap-2 whitespace-nowrap';

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

<div class={cn(meta && 'flex flex-wrap items-start gap-x-10 gap-y-3', className)}>
	{#if isLoading}
		<div class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
			{#each Array(4) as _, index (index)}
				<Skeleton class="h-4 w-20" />
				<Skeleton class="h-4 w-36" />
			{/each}
		</div>
	{:else}
		<List.Root class="gap-x-4">
			{#if stats.matchCount > 0}
				<List.Title>Tracked:</List.Title>
				<List.Value>{stats.matchCount} matches</List.Value>
				<List.Title>Record:</List.Title>
				<List.Value class={valueRow}>
					<span class={statWins}>{stats.wins}W</span>
					<span class="text-secondary-600">·</span>
					<span class={statLosses}>{stats.losses}L</span>
					<LeaderboardStatPill type="ratio" wins={stats.wins} losses={stats.losses} streak={0} />
				</List.Value>
				{#if recentMatches.length > 0}
					<List.Title>Recent matches:</List.Title>
					<List.Value class="inline-flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto">
						{#each recentMatches as match (match.id || match.sessionId)}
							<a
								href="/history/{match.id}"
								class={cn(interactive, 'inline-flex shrink-0')}
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
					<List.Value class={valueRow}>
						<span class="text-secondary-300 max-w-56 truncate">{normalizeMapName(bestMap.map)}</span>
						<span class={statWins}>{bestMap.wins}W</span>
						<span class="text-secondary-600">·</span>
						<span class={statLosses}>{bestMap.losses}L</span>
						<span class="font-medium" style:color={getRatioColor(bestMap.wins, bestMap.losses)}>
							{winrate(bestMap)}
						</span>
					</List.Value>
				{/if}
			{:else}
				<List.Title>Tracked:</List.Title>
				<List.Value class="text-secondary-400 text-sm">{emptyMessage}</List.Value>
			{/if}
		</List.Root>
	{/if}
	{#if meta}
		<List.Root class="gap-x-4">
			{@render meta()}
		</List.Root>
	{/if}
</div>
