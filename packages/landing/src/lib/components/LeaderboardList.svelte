<script lang="ts">
	import type { LeaderboardPageData, LeaderboardStatWithProfile } from '$lib/leaderboards';
	import { getSteamIdFromName, getCountryDisplayName } from '$lib/leaderboards';
	import {
		formatRatio,
		getEloColor,
		getEloTextShadow,
		getRatioColor,
		getStoredEloForLeaderboard,
		isEliteElo
	} from '$lib/player-format';
	import { getRankImageByLeaderboardId } from '$lib/ranks';
	import { flagImageUrl } from '$lib/proxy-image';
	import { cn } from '$lib/cn';
	import { interactive, formatStreak, statLosses, statStreakClass, statWins, tableHeadRow } from '$lib/variants';
	import PlayerLabels from '$lib/components/PlayerLabels.svelte';

	type Props = {
		stats: LeaderboardStatWithProfile[];
		eloBySteamId: LeaderboardPageData['eloBySteamId'];
	};

	let { stats, eloBySteamId }: Props = $props();

	function eloForRow(stat: LeaderboardStatWithProfile): number | null {
		return getStoredEloForLeaderboard(
			eloBySteamId[getSteamIdFromName(stat.profile.name)],
			stat.leaderboard_id
		);
	}
</script>

{#if stats.length === 0}
	<p class="text-secondary-400 px-4 py-3 text-sm">No players found.</p>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full table-fixed border-collapse text-sm">
			<thead>
				<tr class="{tableHeadRow} text-center">
					<th class="w-14 px-4 py-2">#</th>
					<th class="w-26 px-4 py-2">Rank</th>
					<th class="px-4 py-2 text-left">Alias</th>
					<th class="w-22 px-4 py-2">ELO</th>
					<th class="w-20 px-4 py-2">Wins</th>
					<th class="w-22 px-4 py-2">Losses</th>
					<th class="w-22 px-4 py-2">Streak</th>
					<th class="w-22 px-4 py-2">Ratio</th>
				</tr>
			</thead>
			<tbody>
				{#each stats as stat (stat.profile.profile_id)}
					{@const elo = eloForRow(stat)}
					{@const countryName = getCountryDisplayName(stat.profile.country)}
					{@const flagUrl = flagImageUrl(stat.profile.country)}
					<tr
						class="border-secondary-800/70 hover:bg-secondary-950/50 h-11 border-t text-white"
					>
						<td class="text-secondary-400 px-4 py-1.5 text-center font-semibold tabular-nums">
							{stat.rank}
						</td>
						<td class="px-4 py-1.5">
							<div class="flex items-center justify-center gap-2">
								<img
									src={getRankImageByLeaderboardId(stat.leaderboard_id, stat.ranklevel)}
									alt=""
									class="size-6 shrink-0 object-contain"
								/>
								<span class="text-secondary-400 text-sm tabular-nums">{stat.ranklevel}</span>
							</div>
						</td>
						<td class="px-4 py-1.5">
							<a
								href="/players/{stat.profile.profile_id}"
								class={cn(
									interactive,
									'flex min-w-0 items-center gap-2 font-medium hover:text-primary'
								)}
							>
								{#if flagUrl}
									<img
										class="h-4 w-auto shrink-0 rounded-xs"
										src={flagUrl}
										alt={countryName ?? stat.profile.country ?? ''}
										title={countryName ?? undefined}
									/>
								{/if}
								<span class="truncate">{stat.profile.alias}</span>
								<PlayerLabels labels={stat.profile.labels} class="shrink-0" />
							</a>
						</td>
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
						<td class={cn('px-4 py-1.5 text-center font-medium', statWins)}>{stat.wins}</td>
						<td class={cn('px-4 py-1.5 text-center font-medium', statLosses)}>{stat.losses}</td>
						<td class={cn('px-4 py-1.5 text-center font-medium', statStreakClass(stat.streak))}>
							{formatStreak(stat.streak)}
						</td>
						<td
							class="px-4 py-1.5 text-center font-medium tabular-nums"
							style:color={getRatioColor(stat.wins, stat.losses)}
						>
							{formatRatio(stat.wins, stat.losses)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
