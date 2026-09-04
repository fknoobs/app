<script lang="ts">
	import {
		Table as LiveLobbiesTable,
		getLiveLobbyMatchTypeId,
		pickPlayerStats,
		toLiveLobbyRecord,
		type LiveLobby,
		type LiveLobbyPlayer,
		type LeaderboardStatLike
	} from '@company-of-heroes/ui/live-lobby';
	import type { LobbyPlayer } from '@fknoobs/app';
	import type { LiveLobby as AppLiveLobby } from '$core/app/database/lobbies-live';
	import WidgetPanel from './widget-panel.svelte';
	import { LiveLobbiesFeed } from './live-lobbies.svelte';
	import { MATCH_TYPES } from '$core/game/lobby';
	import { app } from '$core/app/context';
	import { PUBLIC_PB_URL } from '$env/static/public';
	import { fetch } from '$core/http/fetch';
	import { Button } from '$lib/components/ui/button';
	import { useI18n } from '$lib/i18n';
	import dayjs from '$lib/dayjs';
	import { getFactionFlagFromRace, normalizeMapName } from '$lib/utils';
	import { getDefaultMapImage, getMapImageFromName } from '$lib/utils/game';
	import { getStoredEloRating } from '$lib/utils/player-elo';

	const { t } = useI18n();
	const feed = new LiveLobbiesFeed();
	const isDev = import.meta.env.DEV;
	let seeding = $state(false);

	const rows = $derived(
		feed.items
			.map((lobby) => toUiLiveLobby(lobby))
			.filter((lobby): lobby is LiveLobby => lobby != null)
	);

	$effect(() => {
		void feed.start();
		return () => {
			void feed.stop();
		};
	});

	function attachLiveLobbyStats(
		slimPlayers: LiveLobbyPlayer[],
		rawPlayers: LobbyPlayer[],
		isRanked: boolean
	): LiveLobbyPlayer[] {
		const matchTypeId = getLiveLobbyMatchTypeId(slimPlayers, isRanked);
		return slimPlayers.map((slim) => {
			const raw =
				rawPlayers.find((player) => player.steamId && player.steamId === slim.steamId) ??
				rawPlayers.find((player) => player.profile?.profile_id === slim.profileId) ??
				rawPlayers.find((player) => player.index === slim.index);
			if (!raw) {
				return slim;
			}

			const elo = getStoredEloRating(raw.storedElo, matchTypeId, slim.race);
			const stats = pickPlayerStats(
				raw.profile?.leaderboardStats as LeaderboardStatLike[] | undefined,
				matchTypeId,
				slim.race,
				elo
			);
			return stats ? { ...slim, stats } : slim;
		});
	}

	function toUiLiveLobby(lobby: AppLiveLobby): LiveLobby | null {
		const record = toLiveLobbyRecord({
			id: lobby.id,
			lobbyId: lobby.lobby ?? null,
			sessionId: lobby.sessionId,
			map: lobby.map,
			isRanked: lobby.isRanked,
			isReplay: lobby.isReplay,
			createdAt: lobby.createdAt,
			updatedAt: lobby.updatedAt,
			hostName: lobby.user?.name ?? lobby.user?.email ?? '',
			players: lobby.players
		});
		if (!record) {
			return null;
		}

		return {
			...record,
			players: attachLiveLobbyStats(record.players, lobby.players, record.isRanked),
			modeLabel: t(
				MATCH_TYPES[
					getLiveLobbyMatchTypeId(record.players, record.isRanked) as keyof typeof MATCH_TYPES
				] ?? 'Custom Game'
			)
		};
	}

	function playerHref(player: LiveLobbyPlayer) {
		if (player.profileId) {
			return `/players/${player.profileId}`;
		}

		if (player.steamId) {
			return `/players/${player.steamId}`;
		}

		return null;
	}

	function playerLabel(player: LiveLobbyPlayer) {
		if (player.alias.trim()) {
			return player.alias;
		}

		if (player.playerId === -1) {
			return t('CPU opponent');
		}

		return t('Player {n}', { n: player.index + 1 });
	}

	function detailsHref(lobby: LiveLobby) {
		if (lobby.lobbyId) {
			return `/history/${lobby.lobbyId}`;
		}

		return `/live/${lobby.id}`;
	}

	function seedUrl() {
		return `${(PUBLIC_PB_URL ?? 'https://api.coh1stats.com').replace(/\/$/, '')}/api/dev/live-lobbies/seed`;
	}

	async function seedTestLobbies() {
		seeding = true;
		try {
			const response = await fetch(seedUrl(), { method: 'POST' });
			if (!response.ok) {
				throw new Error(await response.text());
			}

			await feed.refresh();
			app.toast.success(t('Seeded test live lobbies.'));
		} catch (error) {
			console.warn('[LIVE_LOBBIES]: seed failed:', error);
			app.toast.error(t('Could not seed test live lobbies.'));
		} finally {
			seeding = false;
		}
	}

	async function clearTestLobbies() {
		seeding = true;
		try {
			const response = await fetch(seedUrl(), { method: 'DELETE' });
			if (!response.ok) {
				throw new Error(await response.text());
			}

			await feed.refresh();
			app.toast.success(t('Cleared test live lobbies.'));
		} catch (error) {
			console.warn('[LIVE_LOBBIES]: clear seed failed:', error);
			app.toast.error(t('Could not clear test live lobbies.'));
		} finally {
			seeding = false;
		}
	}
</script>

<WidgetPanel
	title={t('Live lobbies')}
	summary={feed.isLoading ? undefined : t('{count} active', { count: rows.length })}
>
	{#if isDev}
		<div class="border-secondary-800 flex items-center gap-2 border-b px-4 py-2">
			<Button size="sm" variant="secondary" disabled={seeding} onclick={seedTestLobbies}>
				{t('Seed test')}
			</Button>
			<Button size="sm" variant="ghost" disabled={seeding} onclick={clearTestLobbies}>
				{t('Clear test')}
			</Button>
		</div>
	{/if}
	<LiveLobbiesTable
		lobbies={rows}
		loading={feed.isLoading}
		resolveMapSrc={getMapImageFromName}
		resolveFallbackSrc={getDefaultMapImage}
		resolveFactionFlag={getFactionFlagFromRace}
		{playerHref}
		{playerLabel}
		{detailsHref}
		formatMapName={normalizeMapName}
		formatStarted={(createdAt) => dayjs(createdAt).fromNow()}
		emptyMessage={t('No community members are in a match right now.')}
		mapLabel={t('Map')}
		nameLabel={t('Name')}
		typeLabel={t('Type')}
		alliesLabel={t('Allies')}
		axisLabel={t('Axis')}
		hostLabel={t('Host')}
		startedLabel={t('Started at')}
		unknownHostLabel={t('Unknown')}
		detailsLabel={t('Details')}
		eloLabel={t('ELO')}
		levelLabel={t('Level')}
		posLabel={t('Pos')}
		winsLabel={t('W')}
		lossesLabel={t('L')}
		streakLabel={t('Streak')}
	/>
</WidgetPanel>
