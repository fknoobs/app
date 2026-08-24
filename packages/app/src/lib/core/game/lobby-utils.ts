import type { LobbyPlayer, Match } from '@fknoobs/app';
import type { LobbiesLiveResponse, UsersResponse } from '$core/pocketbase/types';
import { Lobby } from '$core/game/lobby';

type LiveLobbyRecord = LobbiesLiveResponse<
	LobbyPlayer[],
	{
		user: UsersResponse<string[], string[]>;
	}
>;

export function liveLobbyToMatch(record: LiveLobbyRecord): Match {
	const instance = new Lobby(record.createdAt, record.isRanked ?? false);
	instance.sessionId = record.sessionId;
	instance.startedAt = record.createdAt;
	instance.map = record.map;
	instance.players = record.players ?? [];
	instance.started = true;
	return instance.toJSON();
}

/**
 * Strips the per-player payloads that are only needed while a lobby is live.
 * `matchHistory` embeds every opponent's recent matches, which made a stored
 * lobby row roughly 438 KB and turned any query over `lobbies` into a
 * multi-second table scan. Consumers re-fetch these from Relic / the ratings
 * API when they need them.
 */
export function toPersistablePlayers(players: LobbyPlayer[]): LobbyPlayer[] {
	return players.map(({ matchHistory, storedElo, ...player }) => player);
}

function resolveMe(players: LobbyPlayer[], steamIds?: string[] | null) {
	if (!steamIds?.length) return undefined;
	const me = players.find((player) => player.steamId && steamIds.includes(player.steamId));
	if (!me) return undefined;
	return { playerId: me.playerId, index: me.index };
}

export function liveLobbyToLobbyData(record: LiveLobbyRecord): Match {
	const match = liveLobbyToMatch(record);
	const steamIds = record.expand?.user?.steamIds;
	return {
		...match,
		me: resolveMe(match.players, steamIds) ?? match.me
	};
}
