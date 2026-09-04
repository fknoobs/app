<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '@company-of-heroes/ui/cn';
	import { interactive, statLosses, statWins } from '@company-of-heroes/ui/variants';
	import {
		getModeLabel,
		getRaceLabel,
		getRatioColor,
		getRatioValue,
		normalizeMapName,
		winrate
	} from '../format/player-format';
	import LeaderboardStatPill from '../leaderboard/leaderboard-stat-pill.svelte';
	import { Badge } from '../ui/badge';
	import * as List from '../ui/list';
	import type { PerformanceRecentMatch, PlayerPageData } from './types';
	import PlayerLabels from './player-labels.svelte';
	import PlayerLikeCount from './player-like-count.svelte';
	import SmurfAlert from './smurf-alert.svelte';

	type Props = {
		player: PlayerPageData;
		flagImageUrl: (country: string | null | undefined) => string | null;
		resolveAvatarUrl: (url: string) => string;
		smurfLenderHref: (lenderProfileId: number | null, lenderSteamId: string) => string;
		resolveMapSrc?: (map: string | undefined) => string | undefined;
		matchHref?: (match: PerformanceRecentMatch) => string | null;
		levelLabel?: string;
		steamIdLabel?: string;
		trackedLabel?: string;
		joinedSinceLabel?: string;
		joinedSince?: string | null;
		smurfLabel?: string;
		recordLabel?: string;
		recentLabel?: string;
		bestMapLabel?: string;
		emptyTrackedLabel?: string;
		winLabel?: string;
		lossLabel?: string;
		vote?: Snippet;
		afterName?: Snippet;
		afterDetails?: Snippet;
	};

	let {
		player,
		flagImageUrl,
		resolveAvatarUrl,
		smurfLenderHref,
		matchHref,
		levelLabel,
		steamIdLabel = 'Steam ID:',
		trackedLabel = 'Tracked:',
		joinedSinceLabel = 'Joined since:',
		joinedSince = null,
		smurfLabel = 'Smurf account:',
		recordLabel = 'Record:',
		recentLabel = 'Recent:',
		bestMapLabel = 'Best map:',
		emptyTrackedLabel = 'No community matches recorded yet.',
		winLabel = 'Win',
		lossLabel = 'Loss',
		vote,
		afterName,
		afterDetails
	}: Props = $props();

	const stats = $derived(player.performance);
	const recentMatches = $derived(stats.recentMatches.slice(0, 5));
	const bestMap = $derived.by(() => {
		const eligible = stats.byMap.filter((map) => map.wins + map.losses >= 3);
		const pool = eligible.length > 0 ? eligible : stats.byMap;
		return (
			[...pool].sort(
				(a, b) => getRatioValue(b.wins, b.losses) - getRatioValue(a.wins, a.losses)
			)[0] ?? null
		);
	});

	const avatarBorder = $derived(
		player.gameextrainfo?.trim() === 'Company of Heroes'
			? 'border-green-500'
			: player.personastate > 0
				? 'border-blue-400'
				: 'border-secondary-800'
	);

	const metaList = 'grid-cols-[9.5rem_minmax(0,1fr)] content-start gap-x-4';
	const valueRow = 'inline-flex min-w-0 flex-nowrap items-center gap-2 whitespace-nowrap';
	const recentMatchBase =
		'min-w-6 px-1.5 py-0.5 text-center font-semibold transition-colors duration-150';
	const recentMatchWin =
		'border-success/15 bg-success/5 text-success/45 group-hover:border-success/50 group-hover:bg-success/25 group-hover:text-green-300 group-focus-visible:border-success/50 group-focus-visible:bg-success/25 group-focus-visible:text-green-300';
	const recentMatchLoss =
		'border-destructive/15 bg-destructive/5 text-destructive/45 group-hover:border-destructive/50 group-hover:bg-destructive/25 group-hover:text-red-300 group-focus-visible:border-destructive/50 group-focus-visible:bg-destructive/25 group-focus-visible:text-red-300';
</script>

<div
	class={cn(
		'border-secondary-800 grid grid-cols-1 border-b',
		vote
			? 'gap-4 sm:grid-cols-[minmax(220px,280px)_auto_minmax(0,1fr)]'
			: 'sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]'
	)}
>
	<div
		class={cn(
			'aspect-square overflow-clip sm:aspect-auto sm:h-full',
			!vote && 'sm:border-r',
			avatarBorder
		)}
	>
		<img
			src={resolveAvatarUrl(player.avatarUrl)}
			alt={player.alias}
			class="h-full w-full object-cover"
		/>
	</div>
	{#if vote}
		<div class="flex items-start justify-center px-6 sm:px-0 sm:py-4">
			{@render vote()}
		</div>
	{/if}
	<div class="min-w-0">
		<div class={cn('px-6 py-4', vote && 'sm:pl-0')}>
			<div class="mb-3 flex flex-wrap items-center gap-2.5">
				{#if flagImageUrl(player.country)}
					<img
						class="h-5 w-auto shrink-0 rounded-xs"
						src={flagImageUrl(player.country)!}
						alt={player.country ?? ''}
					/>
				{/if}
				<PlayerLikeCount likeCount={player.likeCount} class="shrink-0" />
				<h1 class="font-heading truncate text-3xl font-bold">{player.alias}</h1>
				<PlayerLabels labels={player.labels} class="shrink-0" />
				{#if levelLabel}
					<span class="text-secondary-500 text-sm">{levelLabel}</span>
				{/if}
				{@render afterName?.()}
			</div>
			<div class="grid grid-cols-1 items-start gap-x-6 gap-y-1 sm:grid-cols-2">
				<List.Root class={metaList}>
					<List.Title>{steamIdLabel}</List.Title>
					<List.Value>
						<a
							href="https://steamcommunity.com/profiles/{player.steamId}"
							target="_blank"
							rel="noopener noreferrer"
							class={cn(interactive, 'hover:text-primary tabular-nums transition-colors')}
						>
							{player.steamId}
						</a>
					</List.Value>
					<List.Title>{joinedSinceLabel}</List.Title>
					<List.Value>{joinedSince ?? '—'}</List.Value>
					{#if player.smurf}
						<List.Title class="flex h-5 items-center leading-none">{smurfLabel}</List.Title>
						<List.Value class="flex h-5 items-center leading-none">
							<SmurfAlert
								smurf={player.smurf}
								lenderHref={smurfLenderHref(
									player.smurf.lenderProfileId,
									player.smurf.lenderSteamId
								)}
								{resolveAvatarUrl}
								showLabel={false}
							/>
						</List.Value>
					{/if}
				</List.Root>
				<List.Root class={metaList}>
					{#if stats.matchCount > 0}
						<List.Title>{recordLabel}</List.Title>
						<List.Value class={valueRow}>
							<span class={statWins}>{stats.wins}W</span>
							<span class="text-secondary-600">·</span>
							<span class={statLosses}>{stats.losses}L</span>
							<LeaderboardStatPill
								type="ratio"
								wins={stats.wins}
								losses={stats.losses}
								streak={0}
							/>
						</List.Value>
						{#if recentMatches.length > 0}
							<List.Title>{recentLabel}</List.Title>
							<List.Value
								class="inline-flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto"
							>
								{#each recentMatches as match (match.id || match.sessionId)}
									{@const href = matchHref?.(match)}
									{@const title = `${match.outcome === 1 ? winLabel : lossLabel}${match.raceId != null ? ` · ${getRaceLabel(match.raceId)}` : ''}${match.matchtypeId != null ? ` · ${getModeLabel(match.matchtypeId)}` : ''}`}
									{#if href}
										<a {href} class={cn(interactive, 'group inline-flex shrink-0')} {title}>
											<Badge
												variant={match.outcome === 1 ? 'success' : 'destructive'}
												class={cn(
													recentMatchBase,
													match.outcome === 1 ? recentMatchWin : recentMatchLoss
												)}
											>
												{match.outcome === 1 ? 'W' : 'L'}
											</Badge>
										</a>
									{:else}
										<span class="inline-flex shrink-0" {title}>
											<Badge
												variant={match.outcome === 1 ? 'success' : 'destructive'}
												class={cn(
													recentMatchBase,
													match.outcome === 1 ? recentMatchWin : recentMatchLoss
												)}
											>
												{match.outcome === 1 ? 'W' : 'L'}
											</Badge>
										</span>
									{/if}
								{/each}
							</List.Value>
						{/if}
						{#if bestMap}
							<List.Title>{bestMapLabel}</List.Title>
							<List.Value class={valueRow}>
								<span class="text-secondary-300 max-w-44 truncate">
									{normalizeMapName(bestMap.map, false)}
								</span>
								<span class={statWins}>{bestMap.wins}W</span>
								<span class="text-secondary-600">·</span>
								<span class={statLosses}>{bestMap.losses}L</span>
								<span
									class="font-medium"
									style:color={getRatioColor(bestMap.wins, bestMap.losses)}
								>
									{winrate(bestMap.wins, bestMap.losses)}
								</span>
							</List.Value>
						{/if}
					{:else}
						<List.Title>{trackedLabel}</List.Title>
						<List.Value class="text-secondary-400 text-sm">{emptyTrackedLabel}</List.Value>
					{/if}
				</List.Root>
			</div>
		</div>
		{@render afterDetails?.()}
	</div>
</div>
