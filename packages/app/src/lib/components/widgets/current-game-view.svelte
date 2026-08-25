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
	import { getPlayerPerformance, type PlayerPerformance } from '$core/pocketbase/player-performance';
	import { getPlayerRatings } from '$core/pocketbase/player-ratings';
	import { isValidSteamId } from '$lib/utils/player-elo';
	import { getMeProfileId, isMePlayer } from '$lib/utils/player-me';
	import { loadSmurfAlert, type SmurfAlertState } from '$lib/player/smurf';
	import { getEloColor, getEloTextShadow } from '$lib/components/leaderboard/leaderboard-utils';
	import { resource } from 'runed';
	import LobbyPlayersGrid from './lobby-players-grid.svelte';
	import { getAlliesPlayers, getAxisPlayers, getPlayerAlias, getPlayerProfileId } from './dashboard-utils';
	import {
		buildPlayerScout,
		formatMatchupGap,
		getMatchupStats,
		type PlayerScoutStats
	} from './lobby-scout';

	type Props = {
		lobby: Match;
	};

	type ScoutExtras = {
		performances: Record<number, PlayerPerformance>;
		smurfs: Record<number, SmurfAlertState>;
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
	const humans = $derived(players.filter((player) => player.playerId !== -1));
	const scoutKey = $derived(
		humans
			.map((player) => {
				const profileId = getPlayerProfileId(player) ?? 0;
				return `${profileId}:${player.steamId ?? ''}:${player.matchHistory?.length ?? 0}`;
			})
			.join('|')
	);

	async function loadScoutExtras(source: LobbyPlayer[]): Promise<ScoutExtras> {
		const performances: Record<number, PlayerPerformance> = {};
		const smurfs: Record<number, SmurfAlertState> = {};
		if (source.length === 0) return { performances, smurfs };

		await Promise.all(
			source.map(async (player) => {
				const profileId = getPlayerProfileId(player);
				const steamId = player.steamId;
				const [performance, smurf] = await Promise.all([
					profileId
						? getPlayerPerformance({ profileId, scope: 'community' })
						: Promise.resolve(null),
					steamId && isValidSteamId(steamId)
						? loadSmurfAlert(steamId, profileId, 'lobby_match')
						: Promise.resolve(null)
				]);

				if (profileId != null && performance) {
					performances[profileId] = performance;
				}
				if (profileId != null && smurf) {
					smurfs[profileId] = smurf;
				}
			})
		);

		return { performances, smurfs };
	}

	const scoutExtras = resource(() => scoutKey, () => loadScoutExtras(humans));
	const scout = $derived.by((): Record<number, PlayerScoutStats> => {
		const extras = scoutExtras.current;
		const next: Record<number, PlayerScoutStats> = {};

		for (const player of humans) {
			const profileId = getPlayerProfileId(player);
			if (profileId == null) continue;
			next[profileId] = buildPlayerScout({
				player,
				map: lobby.map,
				meProfileId: getMeProfileId() ?? lobby.me?.playerId,
				performance: extras?.performances[profileId],
				smurf: extras?.smurfs[profileId] ?? null
			});
		}

		return next;
	});
	const matchup = $derived(
		getMatchupStats(getAlliesPlayers(players), getAxisPlayers(players), lobby.matchType)
	);
	const highest = $derived.by(() => {
		const alliesMax = matchup.allies.max;
		const axisMax = matchup.axis.max;
		if (alliesMax == null && axisMax == null) return { value: null, alias: null };
		if (alliesMax == null) return { value: axisMax, alias: matchup.axis.maxAlias };
		if (axisMax == null) return { value: alliesMax, alias: matchup.allies.maxAlias };
		if (axisMax > alliesMax) return { value: axisMax, alias: matchup.axis.maxAlias };
		return { value: alliesMax, alias: matchup.allies.maxAlias };
	});
</script>

{#snippet eloValue(value: number | null, alias?: string | null)}
	{#if value == null}
		<span class="text-secondary-400">—</span>
	{:else}
		<span
			class="tabular-nums"
			style:color={getEloColor(value)}
			style:text-shadow={getEloTextShadow(value)}
			title={alias ?? undefined}
		>
			{value}{#if alias}
				<span class="text-secondary-400 font-normal"> · {alias}</span>
			{/if}
		</span>
	{/if}
{/snippet}

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

				{#if humanPlayers > 0}
					<List.Title>Allies ELO</List.Title>
					<List.Value>
						{@render eloValue(matchup.allies.avg)}
					</List.Value>
					<List.Title>Axis ELO</List.Title>
					<List.Value>
						{@render eloValue(matchup.axis.avg)}
					</List.Value>
					<List.Title>Gap</List.Title>
					<List.Value class="tabular-nums">{formatMatchupGap(matchup.gap)}</List.Value>
					<List.Title>Highest</List.Title>
					<List.Value class="min-w-0 truncate">
						{@render eloValue(highest.value, highest.alias)}
					</List.Value>
				{/if}
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
			scout={humanPlayers > 0 ? scout : undefined}
		/>
	</div>
</div>
