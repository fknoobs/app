<script lang="ts">
	import logo from '@assets/logo-transparent-bg.png';
	import type { PlayerCardData, PlayerCardStat } from '$lib/player-card.svelte';
	import {
		formatStreak,
		getFactionFlagByLeaderboardId,
		getLeaderboardTypeLabel,
		getRankImageByLeaderboardId,
		streakClass
	} from '$lib/ranks';
	import { flagImageUrl, proxiedImageUrl } from '$lib/proxy-image';
	import { SITE_URL } from '$lib/urls';

	type Props = {
		data: PlayerCardData;
		ref?: HTMLElement | null;
	};

	let { data, ref = $bindable(null) }: Props = $props();

	const cardUrl = $derived(`${SITE_URL}/card/${data.steamId}`);

	function isRanked(stat: PlayerCardStat): boolean {
		return stat.ranked ?? (stat.leaderboardId >= 4 && stat.leaderboardId <= 19);
	}

	function positionLabel(stat: PlayerCardStat): string {
		if (!isRanked(stat) || stat.rank <= 0) return '-';
		return String(stat.rank);
	}

	function levelLabel(stat: PlayerCardStat): string {
		if (!isRanked(stat) || stat.ranklevel <= 0) return '-';
		return String(stat.ranklevel);
	}
</script>

<div
	bind:this={ref}
	class="border-secondary-800 bg-secondary-950 shadow-xl w-full max-w-5xl overflow-hidden rounded-xl border"
>
	<div class="border-secondary-800 flex items-center justify-between border-b px-5 py-3">
		<div class="flex items-center gap-3">
			<img src={logo} alt="" class="size-8" />
			<div>
				<p class="text-sm font-semibold text-white">Company of Heroes</p>
				<p class="text-primary text-xs font-medium">Companion</p>
			</div>
		</div>
		<p class="text-secondary-500 text-xs">Player card</p>
	</div>

	<div class="flex items-center gap-5 px-5 py-5">
		<img
			src={proxiedImageUrl(data.avatarUrl)}
			alt={data.alias}
			class="border-secondary-700 size-20 shrink-0 rounded-lg border object-cover"
		/>
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				{#if flagImageUrl(data.country)}
					<img
						src={flagImageUrl(data.country)!}
						alt={data.country ?? ''}
						class="h-4 w-auto rounded-[1px]"
					/>
				{/if}
				<h2 class="truncate text-2xl font-extrabold text-white">{data.alias}</h2>
			</div>
			<p class="text-secondary-400 mt-1 text-sm">
				Level <span class="text-secondary-100 font-semibold">{data.level}</span>
				· Profile #{data.profileId}
			</p>
		</div>
	</div>

	{#if data.stats.length > 0}
		<div class="overflow-x-auto">
			<table class="w-full table-fixed border-collapse text-sm">
				<thead>
					<tr class="bg-secondary-800/80 text-secondary-400 text-center text-xs font-medium">
						<th class="w-[8rem] px-3 py-2.5 font-medium">Level</th>
						<th class="w-[14rem] px-3 py-2.5 font-medium">Type</th>
						<th class="w-[6.5rem] px-3 py-2.5 font-medium">Position</th>
						<th class="w-[5.5rem] px-3 py-2.5 font-medium">Wins</th>
						<th class="w-[6rem] px-3 py-2.5 font-medium">Losses</th>
						<th class="w-[6rem] px-3 py-2.5 font-medium">Streak</th>
					</tr>
				</thead>
				<tbody>
					{#each data.stats as stat (stat.leaderboardId)}
						<tr class="border-secondary-800/70 text-white border-t">
							<td class="px-3 py-3">
								<div class="flex items-center justify-center gap-2">
									{#if isRanked(stat)}
										<img
											src={getRankImageByLeaderboardId(stat.leaderboardId, stat.ranklevel)}
											alt=""
											class="size-6 shrink-0 object-contain"
										/>
									{/if}
									<span class="text-secondary-200 font-semibold tabular-nums">{levelLabel(stat)}</span>
								</div>
							</td>
							<td class="px-3 py-3">
								<div class="flex items-center justify-center gap-2">
									<img
										src={getFactionFlagByLeaderboardId(stat.leaderboardId)}
										alt={stat.factionLabel}
										class="w-6 shrink-0 ring-2 ring-black"
									/>
									<span class="whitespace-nowrap">
										{getLeaderboardTypeLabel(stat.leaderboardId, stat.modeLabel)}
									</span>
								</div>
							</td>
							<td class="px-3 py-3 text-center tabular-nums">
								{#if stat.rank === 1}
									<span class="text-primary font-bold">👑 {positionLabel(stat)}</span>
								{:else}
									{positionLabel(stat)}
								{/if}
							</td>
							<td class="px-3 py-3 text-center font-medium tabular-nums">{stat.wins}</td>
							<td class="px-3 py-3 text-center font-medium tabular-nums">{stat.losses}</td>
							<td class="px-3 py-3 text-center font-medium tabular-nums {streakClass(stat.streak)}">
								{formatStreak(stat.streak)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="border-secondary-800 text-secondary-400 border-t px-5 py-5 text-sm">
			No leaderboard stats yet.
		</div>
	{/if}

	<div class="border-secondary-800 bg-secondary-950 border-t px-5 py-2.5">
		<p class="text-secondary-500 truncate text-center text-xs">{cardUrl}</p>
	</div>
</div>
