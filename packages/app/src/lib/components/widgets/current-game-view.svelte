<script lang="ts">
	import type { LobbyPlayer } from '@fknoobs/app';
	import type { Match } from '$core/game/lobby';
	import * as List from '$lib/components/ui/list';
	import * as Player from '$lib/components/player';
	import MapImage from '$lib/components/ui/map-image.svelte';
	import { SetCrumbs } from '$lib/components/ui/breadcrumb';
	import { cn, normalizeMapName } from '$lib/utils';
	import { detailMetaGrid } from '$lib/components/ui/variants';
	import { tooltip } from '$lib/attachments';
	import { getLeaderboardStatsForPlayerByMatchType } from '$lib/utils/game';
	import { getPlayerRatings } from '$core/pocketbase/player-ratings';
	import { isValidSteamId } from '$lib/utils/player-elo';
	import { isMePlayer } from '$lib/utils/player-me';
	import { resource } from 'runed';
	import LobbyPlayersGrid from './lobby-players-grid.svelte';
	import { getAlliesPlayers, getAxisPlayers, getPlayerAlias } from './dashboard-utils';

	type Props = {
		lobby: Match;
	};

	let { lobby }: Props = $props();

	const allies = $derived(getAlliesPlayers(lobby.players));
	const axis = $derived(getAxisPlayers(lobby.players));
	const startedAt = $derived(lobby.startedAt?.split(':').slice(0, 2).join(':') ?? '—');
	const humanPlayers = $derived(lobby.players.filter((player) => player.playerId !== -1).length);
	const mapLabel = $derived(normalizeMapName(lobby.map));
	const ratingsKey = $derived(
		lobby.players
			.map((player) => player.steamId)
			.filter(isValidSteamId)
			.join(',')
	);
	const ratings = resource(
		() => ratingsKey,
		(key) => getPlayerRatings(key ? key.split(',') : [])
	);
	const players = $derived.by((): LobbyPlayer[] => {
		const source = lobby.players;
		const stored = ratings.current;
		if (!stored) return source;

		return source.map((player) => {
			if (!player.steamId) return player;
			const record = stored.get(player.steamId);
			return record ? { ...player, storedElo: record.elo } : player;
		});
	});
</script>

<SetCrumbs items={[{ label: mapLabel }]} />

<div class="border-secondary-900 overflow-clip border-b">
	<div
		class="border-secondary-800 grid grid-cols-1 gap-4 border-b p-4 sm:grid-cols-[minmax(200px,280px)_minmax(0,1fr)] sm:gap-6"
	>
		<MapImage map={lobby.map} alt={mapLabel} />

		<div class="min-w-0 py-1">
			<span class="font-heading mb-3 block truncate text-3xl font-bold">{mapLabel}</span>

			<div class={detailMetaGrid}>
				<List.Title>Session</List.Title>
				<List.Value class="tabular-nums">{lobby.sessionId}</List.Value>
				<List.Title>Match type</List.Title>
				<List.Value>{lobby.isRanked ? 'Ranked' : 'Custom'}</List.Value>

				<List.Title>Game mode</List.Title>
				<List.Value>{lobby.type}</List.Value>
				<List.Title>Players</List.Title>
				<List.Value>{humanPlayers} / {lobby.players.length}</List.Value>

				<List.Title>Started</List.Title>
				<List.Value class="tabular-nums">{startedAt}</List.Value>
				<List.Title>Teams</List.Title>
				<List.Value>{allies.length} vs {axis.length}</List.Value>
			</div>

			<div class="mt-4 flex flex-wrap gap-x-6 gap-y-3">
				<div class="flex min-w-0 items-center gap-2">
					<span class="text-secondary-500 text-xs font-semibold tracking-wide uppercase">Allies</span>
					<div class="flex flex-wrap items-center gap-1.5">
						{#each allies as player (player.index)}
							{@const stats = getLeaderboardStatsForPlayerByMatchType(lobby.matchType, player)}
							<Player.Root {player} {stats} race={player.race}>
								<span {@attach tooltip(getPlayerAlias(player))}>
									<Player.Faction class={cn(isMePlayer(player) && 'ring-primary')} />
								</span>
							</Player.Root>
						{/each}
					</div>
				</div>
				<div class="flex min-w-0 items-center gap-2">
					<span class="text-secondary-500 text-xs font-semibold tracking-wide uppercase">Axis</span>
					<div class="flex flex-wrap items-center gap-1.5">
						{#each axis as player (player.index)}
							{@const stats = getLeaderboardStatsForPlayerByMatchType(lobby.matchType, player)}
							<Player.Root {player} {stats} race={player.race}>
								<span {@attach tooltip(getPlayerAlias(player))}>
									<Player.Faction class={cn(isMePlayer(player) && 'ring-primary')} />
								</span>
							</Player.Root>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="border-secondary-800 border-b">
		<LobbyPlayersGrid
			{players}
			matchType={lobby.matchType}
			highlightPlayerId={lobby.me?.playerId}
		/>
	</div>
</div>
