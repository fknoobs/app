<script lang="ts">
	import type { MatchHistoryPlayer, PlayerPageData } from '$lib/player';
	import {
		formatDuration,
		formatMatchStamp,
		getEloColor,
		getEloTextShadow,
		getModeLabel,
		isEliteElo,
		normalizeMapName
	} from '$lib/player-format';
	import { formatStreak, getFactionFlagByRace } from '$lib/ranks';
	import { cn } from '$lib/cn';
	import { flagImageUrl } from '$lib/proxy-image';
	import { interactive, statLosses, statWins, tableHeadRow } from '$lib/variants';
	import MapImage from '$lib/components/MapImage.svelte';
	import PlayerLabels from '$lib/components/PlayerLabels.svelte';
	import ClockIcon from 'phosphor-svelte/lib/ClockIcon';

	type Props = {
		player: PlayerPageData;
	};

	let { player }: Props = $props();

	const matches = $derived(
		[...player.matchHistory].sort((a, b) => b.completiontime - a.completiontime)
	);

	function ratingChange(matchPlayer: MatchHistoryPlayer): string {
		const delta = (matchPlayer.newrating ?? 0) - (matchPlayer.oldrating ?? 0);
		if (delta > 0) return `+${delta}`;
		return String(delta);
	}

	function changeClass(matchPlayer: MatchHistoryPlayer): string {
		const delta = (matchPlayer.newrating ?? 0) - (matchPlayer.oldrating ?? 0);
		if (delta > 0) return 'text-green-400';
		if (delta < 0) return 'text-red-400';
		return 'text-secondary-500';
	}

	function streakClass(streak: number): string {
		if (streak > 0) return 'text-green-300';
		if (streak < 0) return 'text-red-300';
		return 'text-secondary-400';
	}

	function displayElo(matchPlayer: MatchHistoryPlayer): number | null {
		if (matchPlayer.newrating >= 1) return matchPlayer.newrating;
		if (matchPlayer.oldrating >= 1) return matchPlayer.oldrating;
		return null;
	}
</script>

{#if matches.length === 0}
	<p class="text-secondary-400 px-4 py-3 text-sm">No recent Relic matches found.</p>
{:else}
	<div>
		{#each matches as match (match.id)}
			{@const players = [...match.players].sort((a, b) => a.teamid - b.teamid)}
			<section class="border-secondary-800 border-b">
				<div class="border-secondary-800 flex items-center gap-4 border-b px-4 py-2">
					<MapImage map={match.mapname} alt={normalizeMapName(match.mapname)} />
					<div class="min-w-0 grow">
						<h3 class="font-heading truncate text-lg font-bold text-white">
							{normalizeMapName(match.mapname)}
						</h3>
						<p class="text-secondary-400 text-sm">
							{formatMatchStamp(match.startgametime)}
							<span class="text-secondary-500"> · {getModeLabel(match.matchtype_id)}</span>
						</p>
					</div>
					<span class="text-secondary-300 flex shrink-0 items-center gap-2 text-sm font-medium">
						<ClockIcon class="size-4" />
						{formatDuration(match.startgametime, match.completiontime)}
					</span>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full table-fixed border-collapse text-sm">
						<thead>
							<tr class="{tableHeadRow} text-center">
								<th class="w-[12%] px-4 py-2">Change</th>
								<th class="w-[8%] px-4 py-2">Team</th>
								<th class="w-[10%] px-4 py-2">ELO</th>
								<th class="w-[38%] px-4 py-2 text-left">Player</th>
								<th class="w-[10%] px-4 py-2">Wins</th>
								<th class="w-[12%] px-4 py-2">Losses</th>
								<th class="w-[10%] px-4 py-2">Streak</th>
							</tr>
						</thead>
						<tbody>
							{#each players as matchPlayer (matchPlayer.profile_id)}
								{@const isSelf = matchPlayer.profile_id === player.profileId}
								{@const elo = displayElo(matchPlayer)}
								<tr
									class={cn('h-9', matchPlayer.outcome === 1 ? 'bg-success/5' : 'bg-destructive/5')}
								>
									<td
										class="px-4 py-1.5 text-center font-medium tabular-nums {changeClass(
											matchPlayer
										)}"
									>
										{ratingChange(matchPlayer)}
									</td>
									<td class="px-4 py-1.5">
										<div class="flex justify-center">
											<img
												src={getFactionFlagByRace(matchPlayer.race_id)}
												alt=""
												class="h-auto w-6 shrink-0 object-contain ring-1 ring-black/40"
											/>
										</div>
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
									<td class="px-4 py-1.5">
										<div class="flex min-w-0 items-center gap-2">
											{#if flagImageUrl(matchPlayer.country ?? null)}
												<img
													src={flagImageUrl(matchPlayer.country ?? null)!}
													alt=""
													class="h-3.5 w-auto shrink-0"
												/>
											{/if}
											{#if matchPlayer.steamId}
												<a
													href="/players/{matchPlayer.steamId}"
													class={cn(
														interactive,
														'min-w-0 truncate',
														isSelf ? 'text-primary font-semibold' : 'hover:text-primary text-white'
													)}
												>
													{matchPlayer.alias}
												</a>
											{:else}
												<span
													class={cn(
														'min-w-0 truncate',
														isSelf ? 'text-primary font-semibold' : 'text-white'
													)}
												>
													{matchPlayer.alias}
												</span>
											{/if}
											<PlayerLabels labels={matchPlayer.labels} class="shrink-0" />
										</div>
									</td>
									<td class="{statWins} px-4 py-1.5 text-center font-medium">
										{matchPlayer.wins}
									</td>
									<td class="{statLosses} px-4 py-1.5 text-center font-medium">
										{matchPlayer.losses}
									</td>
									<td
										class="px-4 py-1.5 text-center font-medium tabular-nums {streakClass(
											matchPlayer.streak
										)}"
									>
										{formatStreak(matchPlayer.streak)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
	</div>
{/if}
