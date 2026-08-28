<script lang="ts">
	import type { LobbyPlayer } from '@fknoobs/app';
	import type { Match } from '$core/game/lobby';
	import * as List from '$lib/components/ui/list';
	import MapImage from '$lib/components/ui/map-image.svelte';
	import { SetCrumbs } from '$lib/components/ui/breadcrumb';
	import { normalizeMapName } from '$lib/utils';
	import { detailMetaGrid } from '$lib/components/ui/variants';
	import { getPlayerRatings } from '$core/pocketbase/player-ratings';
	import { isValidSteamId } from '$lib/utils/player-elo';
	import { loadSmurfAlert, type SmurfAlertState } from '$lib/player/smurf';
	import { loadCheaterSteamIds } from '$core/pocketbase/anti-cheat';
	import { getEloColor, getEloTextShadow } from '$lib/components/leaderboard/leaderboard-utils';
	import { resource } from 'runed';
	import LobbyPlayersGrid from './lobby-players-grid.svelte';
	import { getAlliesPlayers, getAxisPlayers, getPlayerProfileId } from './dashboard-utils';
	import { formatMatchupGap, getMatchupStats } from './lobby-scout';
	import { useI18n } from '$lib/i18n';

	type Props = {
		lobby: Match;
	};

	type SmurfMap = Record<number, SmurfAlertState>;

	let { lobby }: Props = $props();
	const { t } = useI18n();

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
	const smurfKey = $derived(
		humans
			.map((player) => {
				const profileId = getPlayerProfileId(player) ?? 0;
				return `${profileId}:${player.steamId ?? ''}`;
			})
			.join('|')
	);

	async function loadSmurfs(source: LobbyPlayer[]): Promise<SmurfMap> {
		const next: SmurfMap = {};
		if (source.length === 0) return next;

		await Promise.all(
			source.map(async (player) => {
				const profileId = getPlayerProfileId(player);
				const steamId = player.steamId;
				if (!steamId || !isValidSteamId(steamId)) return;
				const smurf = await loadSmurfAlert(steamId, profileId, 'lobby_match');
				if (profileId != null && smurf) {
					next[profileId] = smurf;
				}
			})
		);

		return next;
	}

	const smurfAlerts = resource(
		() => smurfKey,
		() => loadSmurfs(humans)
	);
	const smurfs = $derived(smurfAlerts.current);
	const cheaters = resource(
		() => ratingsKey,
		(key) => loadCheaterSteamIds(key ? key.split(',') : [])
	);

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
		class="border-secondary-800 grid grid-cols-1 border-b sm:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]"
	>
		<div class="border-secondary-800 aspect-square sm:aspect-auto sm:h-full sm:border-r">
			<MapImage map={lobby.map} alt={mapLabel} flush />
		</div>

		<div class="min-w-0 px-6 py-4">
			<span class="font-heading mb-3 block truncate text-3xl font-bold">{mapLabel}</span>

			<div class={detailMetaGrid}>
				<List.Title>{t('Session')}</List.Title>
				<List.Value class="tabular-nums">{lobby.sessionId}</List.Value>
				<List.Title>{t('Match type')}</List.Title>
				<List.Value>{lobby.isRanked ? t('Ranked') : t('Custom')}</List.Value>

				<List.Title>{t('Game mode')}</List.Title>
				<List.Value>{lobby.type}</List.Value>
				<List.Title>{t('Players')}</List.Title>
				<List.Value>{humanPlayers} / {lobby.players.length}</List.Value>

				<List.Title>{t('Started')}</List.Title>
				<List.Value class="tabular-nums">{startedAt}</List.Value>
				<List.Title>{t('Teams')}</List.Title>
				<List.Value
					>{t('{allies} vs {axis}', { allies: allies.length, axis: axis.length })}</List.Value
				>

				{#if humanPlayers > 0}
					<List.Title>{t('Allies ELO')}</List.Title>
					<List.Value>
						{@render eloValue(matchup.allies.avg)}
					</List.Value>
					<List.Title>{t('Axis ELO')}</List.Title>
					<List.Value>
						{@render eloValue(matchup.axis.avg)}
					</List.Value>
					<List.Title>{t('Gap')}</List.Title>
					<List.Value class="tabular-nums">{formatMatchupGap(matchup.gap)}</List.Value>
					<List.Title>{t('Highest')}</List.Title>
					<List.Value class="min-w-0 truncate">
						{@render eloValue(highest.value, highest.alias)}
					</List.Value>
				{/if}
			</div>
		</div>
	</div>

	<div class="border-secondary-800 border-b">
		<LobbyPlayersGrid
			{players}
			matchType={lobby.matchType}
			highlightPlayerId={lobby.me?.playerId}
			smurfs={humanPlayers > 0 ? smurfs : undefined}
			cheaters={cheaters.current ?? undefined}
		/>
	</div>
</div>
