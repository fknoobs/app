<script lang="ts">
	import type { PlayerPageData } from '$lib/player';
	import {
		getStoredEloForLeaderboard,
		getEloColor,
		getEloTextShadow,
		isEliteElo,
		isRankedLeaderboard,
		sortLeaderboardStats
	} from '$lib/player-format';
	import {
		formatStreak,
		getFactionFlagByLeaderboardId,
		getLeaderboardTypeLabel,
		getRankImageByLeaderboardId,
		streakClass
	} from '$lib/ranks';
	import { cn } from '$lib/cn';
	import { statLosses, statWins, tableHeadRow } from '$lib/variants';

	type Props = {
		player: PlayerPageData;
	};

	let { player }: Props = $props();

	const stats = $derived(sortLeaderboardStats(player.leaderboardStats));

	function positionLabel(leaderboardId: number, rank: number): string {
		if (!isRankedLeaderboard(leaderboardId) || rank <= 0) return '-';
		return String(rank);
	}

	function levelLabel(leaderboardId: number, ranklevel: number): string {
		if (!isRankedLeaderboard(leaderboardId) || ranklevel <= 0) return '-';
		return String(ranklevel);
	}
</script>

{#if stats.length === 0}
	<p class="text-secondary-400 px-4 py-3 text-sm">No leaderboard stats yet.</p>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full table-fixed border-collapse text-sm">
			<thead>
				<tr class="{tableHeadRow} text-center">
					<th class="w-[6.5rem] px-4 py-2">ELO</th>
					<th class="w-[8rem] px-4 py-2">Level</th>
					<th class="w-[14rem] px-4 py-2">Type</th>
					<th class="w-[6.5rem] px-4 py-2">Position</th>
					<th class="w-[5.5rem] px-4 py-2">Wins</th>
					<th class="w-[6rem] px-4 py-2">Losses</th>
					<th class="w-[6rem] px-4 py-2">Streak</th>
				</tr>
			</thead>
			<tbody>
				{#each stats as stat (stat.leaderboard_id)}
					{@const elo = getStoredEloForLeaderboard(player.elo, stat.leaderboard_id)}
					<tr class="border-secondary-800/70 h-11 border-t text-white">
						<td
							class={cn(
								'px-4 py-1.5 text-center tabular-nums',
								elo == null && 'text-secondary-500 text-xs font-normal',
								isEliteElo(elo) && 'font-bold tracking-wide'
							)}
							style:color={elo != null ? getEloColor(elo) : undefined}
							style:text-shadow={getEloTextShadow(elo)}
						>
							{elo ?? 'N/A'}
						</td>
						<td class="px-4 py-1.5">
							<div class="flex items-center justify-center gap-2">
								{#if isRankedLeaderboard(stat.leaderboard_id)}
									<img
										src={getRankImageByLeaderboardId(stat.leaderboard_id, stat.ranklevel)}
										alt=""
										class="size-6 shrink-0 object-contain"
									/>
								{/if}
								<span class="text-secondary-200 font-semibold tabular-nums">
									{levelLabel(stat.leaderboard_id, stat.ranklevel)}
								</span>
							</div>
						</td>
						<td class="px-4 py-1.5">
							<div class="flex items-center justify-center gap-2">
								<img
									src={getFactionFlagByLeaderboardId(stat.leaderboard_id)}
									alt=""
									class="w-6 shrink-0 ring-2 ring-black"
								/>
								<span class="whitespace-nowrap">{getLeaderboardTypeLabel(stat.leaderboard_id)}</span
								>
							</div>
						</td>
						<td class="px-4 py-1.5 text-center tabular-nums">
							{#if stat.rank === 1}
								<span class="text-primary font-bold"
									>👑 {positionLabel(stat.leaderboard_id, stat.rank)}</span
								>
							{:else}
								{positionLabel(stat.leaderboard_id, stat.rank)}
							{/if}
						</td>
						<td class="px-4 py-1.5 text-center font-medium {statWins}">{stat.wins}</td>
						<td class="px-4 py-1.5 text-center font-medium {statLosses}">{stat.losses}</td>
						<td class="px-4 py-1.5 text-center font-medium tabular-nums {streakClass(stat.streak)}">
							{formatStreak(stat.streak)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
