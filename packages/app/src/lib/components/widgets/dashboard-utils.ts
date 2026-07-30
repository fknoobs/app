import type { LobbyPlayer } from '@fknoobs/app';
import type { LiveLobby } from '$core/app/database/lobbies-live';
import type { MatchExpanded } from '$core/app/database/matches';
import type { TransformedMatch } from '@fknoobs/app';
import { Lobby, MATCH_TYPES, type Match, type MatchTypeId } from '$core/game/lobby';
import { Race } from '$lib/utils/game';
import dayjs from '$lib/dayjs';

export function formatMapDisplayName(map?: string): string {
	if (!map) return 'Unknown Map';

	const match = map.match(/^(\d+)p_(.+)$/);
	if (!match) {
		return map.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	const [, playerCount, mapNameWithoutPrefix] = match;
	const formattedName = mapNameWithoutPrefix
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());

	return `${formattedName} (${playerCount})`;
}

export function getLiveLobbyMatchType(players: LobbyPlayer[], isRanked?: boolean): MatchTypeId {
	const isSkirmish = players.some((player) => player.playerId === -1);

	if (isSkirmish) return 14;
	if (!isRanked) return 0;

	if (players.length === 2) return 1;
	if (players.length === 4) return 2;
	if (players.length === 6) return 3;
	if (players.length === 8) return 4;

	return 0;
}

export function getLiveLobbyModeLabel(players: LobbyPlayer[], isRanked?: boolean): string {
	return MATCH_TYPES[getLiveLobbyMatchType(players, isRanked)] ?? 'Custom Game';
}

export function getMatchModeLabel(match: MatchExpanded): string {
	return getLiveLobbyModeLabel(match.players ?? [], match.isRanked);
}

export function getPlayerProfileId(player: LobbyPlayer): number | undefined {
	return player.profile?.profile_id ?? (player.playerId > 0 ? player.playerId : undefined);
}

export function getPlayerAlias(player: LobbyPlayer): string {
	return player.profile?.alias ?? `Player ${player.index + 1}`;
}

export function getAlliesPlayers(players: LobbyPlayer[] = []): LobbyPlayer[] {
	return players.filter((player) => player.race === Race.US || player.race === Race.Commonwealth);
}

export function getAxisPlayers(players: LobbyPlayer[] = []): LobbyPlayer[] {
	return players.filter(
		(player) => player.race === Race.Wehrmacht || player.race === Race.PanzerElite
	);
}

export function liveLobbyToMatch(lobby: LiveLobby): Match {
	const instance = new Lobby(lobby.createdAt, lobby.isRanked ?? false);
	instance.sessionId = lobby.sessionId;
	instance.startedAt = lobby.createdAt;
	instance.map = lobby.map;
	instance.players = lobby.players ?? [];
	instance.started = true;
	return instance.toJSON();
}

export function countTodayRecord(matches: MatchExpanded[], profileId?: number) {
	let wins = 0;
	let losses = 0;
	let pending = 0;

	for (const match of matches) {
		if (match.needsResult) {
			pending++;
			continue;
		}

		const result = match.result as TransformedMatch | null | undefined;
		if (!result || !profileId) continue;

		const player = result.players.find((entry) => entry.profile_id === profileId);
		if (!player) continue;

		if (player.outcome === 1) wins++;
		else losses++;
	}

	return { wins, losses, pending, total: matches.length };
}

/** True when the Relic profile is one of the match participants. */
export function matchIncludesPlayer(match: MatchExpanded, profileId: number): boolean {
	if ((match.players ?? []).some((player) => getPlayerProfileId(player) === profileId)) {
		return true;
	}

	const result = match.result as TransformedMatch | null | undefined;
	return !!result?.players?.some((player) => player.profile_id === profileId);
}

/**
 * Matches played today for this account/profile.
 * - `user`: matches you saved (same source as History → My matches)
 * - CSV / lobbyPlayers: matches a teammate saved where you still participated
 * Never search raw `players` JSON — it embeds opponents' matchHistory and false-positives.
 *
 * Server window starts at local midnight (PB autodate needs `YYYY-MM-DD HH:mm:ss.SSSZ`).
 * Callers should still client-filter with {@link isMatchFromLocalToday} so timezone
 * edges never drop games.
 */
export function todayPlayedMatchesFilter(
	profileId?: number | null,
	userId?: string | null
): string {
	const who: string[] = [];
	if (userId) who.push(`user = "${userId}"`);
	if (profileId) {
		who.push(`playerProfileIdsCsv ~ ",${profileId},"`);
		who.push(`lobbyPlayers ~ '"profile_id":${profileId},'`);
	}
	if (who.length === 0) return 'id=""';
	const clause = who.length === 1 ? who[0]! : `(${who.join(' || ')})`;
	// PocketBase autodate filters use a space, not ISO `T` (see lobbiesLiveFreshFilter).
	const todayStart = dayjs().startOf('day').toISOString().replace('T', ' ');
	return `createdAt >= "${todayStart}" && ${clause}`;
}

/** Local-calendar "today" check for match timestamps. */
export function isMatchFromLocalToday(match: Pick<MatchExpanded, 'createdAt'>): boolean {
	return dayjs(match.createdAt).isSame(dayjs(), 'day');
}
