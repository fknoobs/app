<script lang="ts">
	import type { LeaderboardPageData, LeaderboardStatWithProfile } from '$lib/leaderboards';
	import { getSteamIdFromName, getCountryDisplayName } from '$lib/leaderboards';
	import {
		getStoredEloForLeaderboard,
		getEloColor,
		getEloTextShadow,
		isEliteElo
	} from '$lib/player-format';
	import { getRankImageByLeaderboardId } from '$lib/ranks';
	import { flagImageUrl, proxiedImageUrl } from '$lib/proxy-image';
	import { cn } from '$lib/cn';
	import { interactive, formatStreak, statLosses, statStreakClass, statWins } from '$lib/variants';
	import CrownIcon from 'phosphor-svelte/lib/CrownIcon';
	import Skeleton from '$lib/components/Skeleton.svelte';

	type Props = {
		stats: LeaderboardStatWithProfile[];
		eloBySteamId: LeaderboardPageData['eloBySteamId'];
		loading?: boolean;
	};

	let { stats, eloBySteamId, loading = false }: Props = $props();

	const podiumOrder = $derived.by(() => {
		const first = stats[0];
		const second = stats[1];
		const third = stats[2];
		return [second, first, third].filter((stat): stat is LeaderboardStatWithProfile => Boolean(stat));
	});

	function eloForStat(stat: LeaderboardStatWithProfile): number | null {
		return getStoredEloForLeaderboard(
			eloBySteamId[getSteamIdFromName(stat.profile.name)],
			stat.leaderboard_id
		);
	}

	function podiumCellClass(rank: number) {
		return cn(
			interactive,
			'flex min-w-0 flex-col items-center gap-2 px-4 py-5 text-center transition-colors',
			'hover:bg-secondary-950/50',
			rank === 1 && 'bg-primary/5 hover:bg-primary/10 sm:py-6'
		);
	}
</script>

<div
	class="border-secondary-800 grid grid-cols-1 border-b sm:grid-cols-3 sm:divide-x sm:divide-secondary-800"
>
	{#if loading}
		{#each [2, 1, 3] as rank (rank)}
			<div class={podiumCellClass(rank)}>
				<Skeleton class="h-5 w-8" />
				<Skeleton class={cn('rounded-xl', rank === 1 ? 'size-16' : 'size-14')} />
				<Skeleton class="h-5 w-28" />
				<Skeleton class="h-4 w-36" />
			</div>
		{/each}
	{:else}
		{#each podiumOrder as stat (stat.profile.profile_id)}
			{@const elo = eloForStat(stat)}
			{@const countryName = getCountryDisplayName(stat.profile.country)}
			{@const flagUrl = flagImageUrl(stat.profile.country)}
			<a href="/players/{stat.profile.profile_id}" class={podiumCellClass(stat.rank)}>
				<div class="flex w-full items-center justify-between gap-2">
					<span
						class={cn(
							'font-heading font-bold tabular-nums',
							stat.rank === 1 ? 'text-primary text-xl' : 'text-secondary-300'
						)}
					>
						#{stat.rank}
					</span>
					{#if stat.rank === 1}
						<CrownIcon class="text-primary size-5" weight="duotone" />
					{/if}
				</div>
				{#if stat.profile.avatarUrl}
					<img
						src={proxiedImageUrl(stat.profile.avatarUrl)}
						alt=""
						class={cn(
							'border-secondary-700 shrink-0 rounded-xl border-2 object-cover',
							stat.rank === 1 ? 'border-primary/40 size-16' : 'size-14'
						)}
					/>
				{:else}
					<div
						class={cn(
							'bg-secondary-800 shrink-0 rounded-xl',
							stat.rank === 1 ? 'size-16' : 'size-14'
						)}
					></div>
				{/if}
				<div class="flex items-center gap-2">
					<img
						src={getRankImageByLeaderboardId(stat.leaderboard_id, stat.ranklevel)}
						alt=""
						class={cn('w-auto', stat.rank === 1 ? 'h-8' : 'h-7')}
					/>
					<span class="text-secondary-400 text-sm tabular-nums">Lvl {stat.ranklevel}</span>
				</div>
				<div
					class={cn(
						'font-heading flex w-full min-w-0 items-center justify-center gap-2 font-bold',
						stat.rank === 1 ? 'text-primary text-xl' : 'text-white'
					)}
				>
					{#if flagUrl}
						<img
							class={cn('w-auto shrink-0 rounded-xs', stat.rank === 1 ? 'h-5' : 'h-4')}
							src={flagUrl}
							alt={countryName ?? stat.profile.country ?? ''}
							title={countryName ?? undefined}
						/>
					{/if}
					<span class="truncate">{stat.profile.alias}</span>
				</div>
				{#if elo == null}
					<span class="text-secondary-500 text-xs">N/A</span>
				{:else}
					<span
						class={cn(
							'tabular-nums',
							stat.rank === 1 ? 'text-lg' : 'text-base',
							isEliteElo(elo) ? 'font-bold tracking-wide' : 'font-medium'
						)}
						style:color={getEloColor(elo)}
						style:text-shadow={getEloTextShadow(elo)}
					>
						{elo}
					</span>
				{/if}
				<div
					class="text-secondary-400 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm"
				>
					<span class={statWins}>{stat.wins}W</span>
					<span class="text-secondary-600">·</span>
					<span class={statLosses}>{stat.losses}L</span>
					<span class="text-secondary-600">·</span>
					<span class={statStreakClass(stat.streak)}>{formatStreak(stat.streak)} streak</span>
				</div>
			</a>
		{/each}
	{/if}
</div>
