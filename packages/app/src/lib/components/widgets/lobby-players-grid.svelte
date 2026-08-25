<script lang="ts">
	import type { LobbyPlayer, MatchHistoryPlayer, TransformedMatch } from '@fknoobs/app';
	import type { MatchTypeId } from '$core/game/lobby';
	import * as Player from '$lib/components/player';
	import { cn } from '$lib/utils';
	import { getLeaderboardStatsForPlayerByMatchType } from '$lib/utils/game';
	import {
		getAlliesPlayers,
		getAxisPlayers,
		getPlayerProfileId,
		getPlayerRowKey,
		isHighlightedPlayer,
		orderLobbyPlayersByTeam
	} from './dashboard-utils';

	type Props = {
		players: LobbyPlayer[];
		matchType: MatchTypeId;
		highlightPlayerId?: number;
		result?: TransformedMatch | null;
	};

	let { players, matchType, highlightPlayerId, result = null }: Props = $props();

	const orderedPlayers = $derived(orderLobbyPlayersByTeam(players, result));
	const allies = $derived(orderLobbyPlayersByTeam(getAlliesPlayers(orderedPlayers), result));
	const axis = $derived(orderLobbyPlayersByTeam(getAxisPlayers(orderedPlayers), result));

	const playerGrid =
		'grid grid-cols-[minmax(0,1fr)_5.5rem_4rem_3rem_3.25rem_3.25rem_3.25rem] items-center gap-2';

	function playerStats(player: LobbyPlayer) {
		if (result) {
			return getLeaderboardStatsForPlayerByMatchType(result.matchtype_id, player);
		}
		return getLeaderboardStatsForPlayerByMatchType(matchType, player);
	}

	function getPlayerResult(player: LobbyPlayer): MatchHistoryPlayer | undefined {
		if (!result) return undefined;

		const profileId = getPlayerProfileId(player);
		if (!profileId) return undefined;

		return result.players.find((entry) => entry.profile_id === profileId);
	}

	function playerOutcome(player: LobbyPlayer): number | undefined {
		return getPlayerResult(player)?.outcome;
	}
</script>

{#snippet playerRow(player: LobbyPlayer, rowIndex: number)}
	{@const stats = playerStats(player)}
	{@const playerResult = getPlayerResult(player)}
	{@const outcome = playerOutcome(player)}
	{@const isMe = isHighlightedPlayer(player, highlightPlayerId)}
	<Player.Root {player} {playerResult} {stats} race={playerResult?.race_id ?? player.race}>
		<div
			class={cn(
				playerGrid,
				'border-secondary-800 h-11 border-b px-4 last:border-b-0',
				outcome === 1 && 'bg-success/5',
				outcome === 0 && 'bg-destructive/5'
			)}
		>
			<div class="flex min-w-0 items-center gap-2.5">
				{#if player.playerId !== -1}
					<span class="border-secondary-800 size-7 shrink-0 overflow-hidden rounded-md border">
						<Player.Avatar />
					</span>
				{/if}
				<Player.Faction class={cn('shrink-0', isMe && 'ring-primary')} />
				<Player.Country class="shrink-0" />
				<Player.Alias class="min-w-0 flex-1 truncate text-sm" />
			</div>
			<div class="flex items-center justify-center gap-2.5 tabular-nums">
				<Player.RatingChange />
				<Player.Rating
					class="text-sm font-medium"
					matchType={result?.matchtype_id ?? matchType}
				/>
			</div>
			<div class="flex items-center justify-center gap-1">
				<Player.Rank class="h-5 w-5" />
				<Player.Level class="text-secondary-300 text-sm tabular-nums" />
			</div>
			<Player.Position class="text-secondary-400 text-center text-sm tabular-nums" />
			<Player.Wins class="text-center text-sm font-medium tabular-nums" />
			<Player.Losses class="text-center text-sm font-medium tabular-nums" />
			<Player.Streak class="text-center text-sm font-medium tabular-nums" />
		</div>
	</Player.Root>
{/snippet}

{#snippet teamColumn(label: string, teamPlayers: LobbyPlayer[])}
	<div class="min-w-0">
		<div
			class={cn(
				playerGrid,
				'bg-secondary-950/90 text-secondary-300 border-secondary-800 border-b px-4 py-2.5 text-xs font-semibold tracking-wide uppercase'
			)}
		>
			<span>{label}</span>
			<span class="text-center">ELO</span>
			<span class="text-center">Level</span>
			<span class="text-center">Pos</span>
			<span class="text-center">W</span>
			<span class="text-center">L</span>
			<span class="text-center">Streak</span>
		</div>
		{#each teamPlayers as player, rowIndex (getPlayerRowKey(player, rowIndex))}
			{@render playerRow(player, rowIndex)}
		{/each}
	</div>
{/snippet}

<div class="divide-secondary-800 grid grid-cols-1 md:grid-cols-2 md:divide-x">
	{@render teamColumn('Allies', allies)}
	{@render teamColumn('Axis', axis)}
</div>
