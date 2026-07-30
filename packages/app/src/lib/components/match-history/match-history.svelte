<script lang="ts">
	import type { LobbyPlayer, MatchHistoryPlayer, TransformedMatch } from '@fknoobs/app';
	import type { Snippet } from 'svelte';
	import dayjs from '$lib/dayjs';
	import { surfacePanel } from '$lib/components/ui/variants';
	import { cn, isSteamId, normalizeMapName } from '$lib/utils';
	import * as Player from '$lib/components/player';
	import { DataTable, type ColumnDef } from '$lib/components/ui/table';
	import MapImage from '$lib/components/ui/map-image.svelte';
	import { orderBy, sortBy } from 'lodash-es';
	import ClockIcon from 'phosphor-svelte/lib/Clock';
	import { page } from '$app/state';
	import { steam } from '$core/steam';
	import { watch } from 'runed';

	type Props = {
		matches: TransformedMatch[];
	};

	let { matches }: Props = $props();

	const orderedMatches = $derived(orderBy(matches, ['completiontime'], ['desc']));

	const steamIds = $derived([
		...new Set(
			orderedMatches.flatMap((match) =>
				match.players.map((player) => player.steamId).filter(Boolean)
			)
		)
	]);

	// Prefetch avatars in one request so Player.Avatar hits the warm cache.
	watch(
		() => steamIds,
		(ids) => {
			if (ids.length === 0) return;
			void steam.getUserProfiles(ids.slice(0, 100)).catch((error) => {
				console.warn('[MATCH-HISTORY]: steam profile prefetch failed:', error);
			});
		}
	);

	const columns: ColumnDef<MatchHistoryPlayer>[] = [
		{
			id: 'change',
			header: 'Change',
			width: 'w-3/24',
			headerClass: 'text-center',
			class: 'flex w-full justify-center'
		},
		{
			id: 'team',
			header: 'Team',
			width: 'w-2/24',
			headerClass: 'text-center',
			class: 'flex w-full justify-center'
		},
		{
			id: 'elo',
			header: 'ELO',
			width: 'w-2/24',
			headerClass: 'text-center',
			class: 'flex w-full justify-center'
		},
		{
			id: 'player',
			header: 'Player',
			width: 'w-9/24',
			class: 'flex min-w-0 items-center gap-2'
		},
		{
			id: 'wins',
			header: 'Wins',
			width: 'w-2/24',
			headerClass: 'text-center',
			class: 'flex w-full justify-center'
		},
		{
			id: 'losses',
			header: 'Losses',
			width: 'w-3/24',
			headerClass: 'text-center',
			class: 'flex w-full justify-center'
		},
		{
			id: 'streak',
			header: 'Streak',
			width: 'w-3/24',
			headerClass: 'text-center',
			class: 'flex w-full justify-center'
		}
	];

	function matchDuration(match: TransformedMatch): string {
		const seconds = dayjs
			.unix(match.completiontime)
			.diff(dayjs.unix(match.startgametime), 'seconds');
		return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
	}

	function isCurrentProfile(player: MatchHistoryPlayer): boolean {
		const id = page.params.id;
		if (!id) return false;
		if (isSteamId(id)) return player.steamId === id;
		return player.profile_id === parseInt(id, 10);
	}

	function toLobbyPlayer(player: MatchHistoryPlayer, index: number): LobbyPlayer {
		return {
			index,
			playerId: player.profile_id,
			type: 0,
			team: player.teamid,
			race: player.race_id,
			steamId: player.steamId,
			profile: {
				alias: player.alias,
				profile_id: player.profile_id,
				name: player.name,
				personal_statgroup_id: player.personal_statgroup_id,
				xp: player.xp,
				level: player.level,
				leaderboardregion_id: player.leaderboardregion_id,
				country: player.country
			}
		};
	}

	function getPlayerRowClass(player: MatchHistoryPlayer) {
		return cn(
			'border-secondary-800 not-last:border-b',
			player.outcome === 1 ? 'bg-success/5' : 'bg-destructive/5',
			isCurrentProfile(player) && 'bg-primary/5'
		);
	}
</script>

{#snippet cell_team({ row }: { row: MatchHistoryPlayer })}
	<Player.Faction
		class="h-auto! w-6! shrink-0 rounded-none! object-contain! ring-1! ring-black/40"
	/>
{/snippet}
{#snippet cell_elo({ row }: { row: MatchHistoryPlayer })}
	<Player.Rating class="text-center font-medium tabular-nums" />
{/snippet}
{#snippet cell_change({ row }: { row: MatchHistoryPlayer })}
	<Player.RatingChange />
{/snippet}
{#snippet cell_player({ row }: { row: MatchHistoryPlayer })}
	{@const isMe = isCurrentProfile(row)}
	<span class="border-secondary-800 size-8 shrink-0 overflow-hidden rounded-lg border">
		<Player.Avatar />
	</span>
	<Player.Country class="shrink-0" />
	<Player.Alias class={cn('min-w-0 flex-1 truncate', isMe && 'text-primary font-semibold')} />
{/snippet}
{#snippet cell_wins({ row }: { row: MatchHistoryPlayer })}
	<Player.Wins class="text-center font-medium tabular-nums" />
{/snippet}
{#snippet cell_losses({ row }: { row: MatchHistoryPlayer })}
	<Player.Losses class="text-center font-medium tabular-nums" />
{/snippet}
{#snippet cell_streak({ row }: { row: MatchHistoryPlayer })}
	<Player.Streak class="text-center font-medium tabular-nums" />
{/snippet}
{#snippet playerRowWrapper({ row, children }: { row: MatchHistoryPlayer; children: Snippet })}
	<Player.Root player={toLobbyPlayer(row, 0)} playerResult={row} race={row.race_id}>
		{@render children()}
	</Player.Root>
{/snippet}

{#if orderedMatches.length === 0}
	<p class="text-secondary-400 text-sm">No recent matches found.</p>
{:else}
	<div class="grid gap-3">
		{#each orderedMatches as match (match.id)}
			{@const players = sortBy(match.players, ['teamid'])}
			<article class={cn(surfacePanel, 'overflow-clip')}>
				<div class="border-secondary-800 flex items-center gap-4 border-b px-4 py-2">
					<MapImage small map={match.mapname} alt={normalizeMapName(match.mapname)} />
					<div class="min-w-0 grow">
						<h3 class="font-heading truncate text-lg font-bold">
							{normalizeMapName(match.mapname)}
						</h3>
						<p class="text-secondary-400 text-sm">
							{dayjs.unix(match.startgametime).format('MMM D, YYYY · HH:mm')}
						</p>
					</div>
					<span class="text-secondary-300 flex shrink-0 items-center gap-2 text-sm font-medium">
						<ClockIcon class="size-4" />
						{matchDuration(match)}
					</span>
				</div>
				<DataTable
					data={players}
					{columns}
					rowKey={(player) => player.profile_id}
					rowClass={getPlayerRowClass}
					rowWrapper={playerRowWrapper}
					density="compact"
					striped={false}
					class="rounded-none border-0"
					cells={{
						change: cell_change,
						team: cell_team,
						elo: cell_elo,
						player: cell_player,
						wins: cell_wins,
						losses: cell_losses,
						streak: cell_streak
					}}
				/>
			</article>
		{/each}
	</div>
{/if}
