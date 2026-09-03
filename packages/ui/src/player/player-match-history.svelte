<script lang="ts">
	import { cn } from '@company-of-heroes/ui/cn';
	import { interactive, statLosses, statWins, tableHeadRow } from '@company-of-heroes/ui/variants';
	import ClockIcon from 'phosphor-svelte/lib/ClockIcon';
	import MapImage from '../ui/map-image.svelte';
	import {
		formatDuration,
		formatMatchStamp,
		getEloColor,
		getEloTextShadow,
		getModeLabel,
		isEliteElo,
		normalizeMapName
	} from '../format/player-format';
	import { formatStreak, streakClass } from '../format/ranks';
	import type { MatchHistoryPlayer, PlayerPageData } from './types';
	import PlayerLabels from './player-labels.svelte';

	type Props = {
		player: PlayerPageData;
		flagImageUrl: (country: string | null | undefined) => string | null;
		playerHref: (steamId: string) => string;
		resolveFactionFlag: (raceId: number) => string;
		resolveMapSrc: (map: string | undefined) => string | undefined;
		formatMapName?: (map: string, includePlayerCount?: boolean) => string;
		locale?: string;
		emptyMessage?: string;
		changeLabel?: string;
		teamLabel?: string;
		eloLabel?: string;
		playerLabel?: string;
		winsLabel?: string;
		lossesLabel?: string;
		streakLabel?: string;
	};

	let {
		player,
		flagImageUrl,
		playerHref,
		resolveFactionFlag,
		resolveMapSrc,
		formatMapName = normalizeMapName,
		locale,
		emptyMessage = 'No recent Relic matches found.',
		changeLabel = 'Change',
		teamLabel = 'Team',
		eloLabel = 'ELO',
		playerLabel = 'Player',
		winsLabel = 'Wins',
		lossesLabel = 'Losses',
		streakLabel = 'Streak'
	}: Props = $props();

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

	function displayElo(matchPlayer: MatchHistoryPlayer): number | null {
		if (matchPlayer.newrating >= 1) return matchPlayer.newrating;
		if (matchPlayer.oldrating >= 1) return matchPlayer.oldrating;
		return null;
	}
</script>

{#if matches.length === 0}
	<p class="text-secondary-400 px-4 py-3 text-sm">{emptyMessage}</p>
{:else}
	<div>
		{#each matches as match (match.id)}
			{@const players = [...match.players].sort((a, b) => a.teamid - b.teamid)}
			<section class="border-secondary-800 border-b">
				<div class="border-secondary-800 flex items-center gap-4 border-b px-4 py-2">
					<MapImage map={match.mapname} alt={formatMapName(match.mapname)} {resolveMapSrc} />
					<div class="min-w-0 grow">
						<h3 class="font-heading truncate text-lg font-bold text-white">
							{formatMapName(match.mapname)}
						</h3>
						<p class="text-secondary-400 text-sm">
							{formatMatchStamp(match.startgametime, locale)}
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
								<th class="w-[12%] px-4 py-2">{changeLabel}</th>
								<th class="w-[8%] px-4 py-2">{teamLabel}</th>
								<th class="w-[10%] px-4 py-2">{eloLabel}</th>
								<th class="w-[38%] px-4 py-2 text-left">{playerLabel}</th>
								<th class="w-[10%] px-4 py-2">{winsLabel}</th>
								<th class="w-[12%] px-4 py-2">{lossesLabel}</th>
								<th class="w-[10%] px-4 py-2">{streakLabel}</th>
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
												src={resolveFactionFlag(matchPlayer.race_id)}
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
													href={playerHref(matchPlayer.steamId)}
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
