<script lang="ts">
	import type { LeaderboardStatWithProfile } from '@fknoobs/app';
	import { goto } from '$app/navigation';
	import { cn, getRankImageByLeaderboardId } from '$lib/utils';
	import { steam, type SteamPlayerSummary } from '$core/steam';
	import { resource } from 'runed';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		interactive,
		formatStreak,
		statLosses,
		statStreakClass,
		statWins
	} from '$lib/components/ui/variants';
	import { getStoredEloForLeaderboard, type PlayerEloMap } from '$lib/utils/player-elo';
	import {
		getCountryDisplayName,
		getEloColor,
		getEloTextShadow,
		getSteamIdFromProfile,
		isEliteElo
	} from './leaderboard-utils';
	import CrownIcon from 'phosphor-svelte/lib/CrownIcon';
	import { upperCase } from 'lodash-es';
	import { tooltip } from '$lib/attachments';
	import { useI18n } from '$lib/i18n';

	type Props = {
		stats: LeaderboardStatWithProfile[];
		eloBySteamId?: Map<string, PlayerEloMap>;
		loading?: boolean;
		class?: string;
	};

	let {
		stats,
		eloBySteamId = new Map(),
		loading = false,
		class: className
	}: Props = $props();
	const { t } = useI18n();

	const podiumOrder = $derived.by(() => {
		const first = stats[0];
		const second = stats[1];
		const third = stats[2];
		return [second, first, third].filter((stat): stat is LeaderboardStatWithProfile => !!stat);
	});

	const steamProfiles = resource(
		() => stats.map((stat) => stat.profile.profile_id).join(','),
		async () => {
			const steamIds = stats.map((stat) => getSteamIdFromProfile(stat.profile)).filter(Boolean);
			if (steamIds.length === 0) return {} as Record<string, SteamPlayerSummary>;

			const profiles = await steam.getUserProfiles(steamIds);
			return Object.fromEntries(profiles.map((profile) => [profile.steamid, profile]));
		},
		{ initialValue: {} as Record<string, SteamPlayerSummary> }
	);

	function getSteamAvatar(stat: LeaderboardStatWithProfile): string | undefined {
		return steamProfiles.current[getSteamIdFromProfile(stat.profile)]?.avatarfull;
	}

	function eloForStat(stat: LeaderboardStatWithProfile): number | null {
		return getStoredEloForLeaderboard(
			eloBySteamId.get(getSteamIdFromProfile(stat.profile)),
			stat.leaderboard_id
		);
	}

	function navigate(profileId: number) {
		void goto(`/players/${profileId}`);
	}

	function handleKeydown(event: KeyboardEvent, profileId: number) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		navigate(profileId);
	}

	function podiumCellClass(rank: number) {
		return cn(
			interactive,
			'flex min-w-0 flex-col items-center gap-2 px-4 py-5 text-center transition-colors',
			'hover:bg-secondary-950/60',
			rank === 1 && 'bg-primary/5 hover:bg-primary/10 sm:py-6'
		);
	}
</script>

<div
	class={cn(
		'border-secondary-800 grid grid-cols-1 border-b sm:grid-cols-3 sm:divide-secondary-800 sm:divide-x',
		className
	)}
>
	{#if loading}
		{#each [2, 1, 3] as rank (rank)}
			<div class={podiumCellClass(rank)}>
				<Skeleton class="h-5 w-8" />
				<Skeleton class="size-16 rounded-xl" />
				<Skeleton class="h-5 w-28" />
				<Skeleton class="h-4 w-36" />
			</div>
		{/each}
	{:else}
		{#each podiumOrder as stat (stat.profile.profile_id)}
			{@const steamAvatar = getSteamAvatar(stat)}
			{@const elo = eloForStat(stat)}
			<button
				type="button"
				class={podiumCellClass(stat.rank)}
				onclick={() => navigate(stat.profile.profile_id)}
				onkeydown={(event) => handleKeydown(event, stat.profile.profile_id)}
			>
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

				{#if steamProfiles.loading}
					<Skeleton class={cn('rounded-xl', stat.rank === 1 ? 'size-16' : 'size-14')} />
				{:else if steamAvatar}
					<img
						src={steamAvatar}
						alt={stat.profile.alias}
						class={cn(
							'border-secondary-700 shrink-0 rounded-xl border-2 object-cover',
							stat.rank === 1 ? 'border-primary/40 size-16' : 'size-14'
						)}
					/>
				{/if}

				<div class="flex items-center gap-2">
					<img
						src={getRankImageByLeaderboardId(stat.leaderboard_id, stat.ranklevel)}
						alt={t('Rank {level}', { level: stat.ranklevel })}
						class={cn('w-auto', stat.rank === 1 ? 'h-8' : 'h-7')}
					/>
					<span class="text-secondary-400 text-sm tabular-nums">{t('Lvl {level}', { level: stat.ranklevel })}</span>
				</div>

				<div
					class={cn(
						'font-heading flex w-full min-w-0 items-center justify-center gap-2 font-bold',
						stat.rank === 1 ? 'text-primary text-xl' : 'text-white'
					)}
				>
					{#if stat.profile?.country}
						{@const countryName = getCountryDisplayName(stat.profile.country)}
						<img
							class={cn('w-auto shrink-0 rounded-xs', stat.rank === 1 ? 'h-5' : 'h-4')}
							src="https://flagsapi.com/{upperCase(stat.profile.country)}/shiny/64.png"
							alt={countryName ?? stat.profile.country}
							{@attach tooltip(countryName ?? stat.profile.country)}
						/>
					{/if}
					<span class="truncate">{stat.profile?.alias}</span>
				</div>

				{#if elo == null}
					<span class="text-secondary-500 text-xs">{t('N/A')}</span>
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

				<div class="text-secondary-400 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
					<span class={statWins}>{t('{count}W', { count: stat.wins })}</span>
					<span class="text-secondary-600">·</span>
					<span class={statLosses}>{t('{count}L', { count: stat.losses })}</span>
					<span class="text-secondary-600">·</span>
					<span class={statStreakClass(stat.streak)}>{t('{streak} streak', { streak: formatStreak(stat.streak) })}</span>
				</div>
			</button>
		{/each}
	{/if}
</div>
