<script lang="ts">
	import { cn } from '@company-of-heroes/ui/cn';
	import { statLosses, statWins, tableHeadRow } from '@company-of-heroes/ui/variants';
	import {
		getStoredEloForLeaderboard,
		getEloColor,
		getEloTextShadow,
		isEliteElo,
		isRankedLeaderboard,
		sortLeaderboardStats
	} from '../format/player-format';
	import {
		formatStreak,
		getFactionFlagByLeaderboardId,
		getLeaderboardTypeLabel,
		getRankImageByLeaderboardId,
		streakClass
	} from '../format/ranks';
	import type { PlayerPageData } from './types';

	type Props = {
		player: PlayerPageData;
		emptyMessage?: string;
		eloLabel?: string;
		levelLabelText?: string;
		typeLabel?: string;
		positionLabelText?: string;
		winsLabel?: string;
		lossesLabel?: string;
		streakLabel?: string;
		notAvailableLabel?: string;
	};

	let {
		player,
		emptyMessage = 'No leaderboard stats yet.',
		eloLabel = 'ELO',
		levelLabelText = 'Level',
		typeLabel = 'Type',
		positionLabelText = 'Position',
		winsLabel = 'Wins',
		lossesLabel = 'Losses',
		streakLabel = 'Streak',
		notAvailableLabel = 'N/A'
	}: Props = $props();

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
	<p class="text-secondary-400 px-4 py-3 text-sm">{emptyMessage}</p>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full table-fixed border-collapse text-sm">
			<thead>
				<tr class="{tableHeadRow} text-center">
					<th class="w-[6.5rem] px-4 py-2">{eloLabel}</th>
					<th class="w-[8rem] px-4 py-2">{levelLabelText}</th>
					<th class="w-[14rem] px-4 py-2">{typeLabel}</th>
					<th class="w-[6.5rem] px-4 py-2">{positionLabelText}</th>
					<th class="w-[5.5rem] px-4 py-2">{winsLabel}</th>
					<th class="w-[6rem] px-4 py-2">{lossesLabel}</th>
					<th class="w-[6rem] px-4 py-2">{streakLabel}</th>
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
							{elo ?? notAvailableLabel}
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
