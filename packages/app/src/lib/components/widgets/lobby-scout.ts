import type { LobbyPlayer, TransformedMatch } from '@fknoobs/app';
import type { PlayerPerformance } from '$core/pocketbase/player-performance';
import type { SmurfAlertState } from '$lib/player/smurf';
import type { MatchTypeId } from '$core/game/lobby';
import { getPlayerEloFromMatchHistory } from '$lib/utils/game';
import { getStoredEloRating } from '$lib/utils/player-elo';
import { getPlayerAlias, getPlayerProfileId } from './dashboard-utils';

const FORM_LIMIT = 5;
const COMMUNITY_MIN_GAMES = 3;

export type WinLoss = {
	wins: number;
	losses: number;
};

export type ScoutFormMatch = {
	id: number;
	outcome: 0 | 1;
};

export type PlayerScoutStats = {
	form: ScoutFormMatch[];
	map: WinLoss | null;
	faction: WinLoss | null;
	vsYou: WinLoss | null;
	smurf: SmurfAlertState | null;
};

export type TeamEloSummary = {
	avg: number | null;
	max: number | null;
	maxAlias: string | null;
};

export type MatchupStats = {
	allies: TeamEloSummary;
	axis: TeamEloSummary;
	gap: number | null;
};

export function emptyPlayerScout(): PlayerScoutStats {
	return {
		form: [],
		map: null,
		faction: null,
		vsYou: null,
		smurf: null
	};
}

export function mapsEqual(a?: string | null, b?: string | null): boolean {
	if (!a || !b) return false;
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function getLobbyPlayerElo(player: LobbyPlayer, matchType: number): number | null {
	if (player.playerId === -1) return null;
	return (
		getPlayerEloFromMatchHistory(matchType, player) ??
		getStoredEloRating(player.storedElo, matchType, player.race)
	);
}

function recordGames(record: WinLoss | null): number {
	if (!record) return 0;
	return record.wins + record.losses;
}

function preferRecord(community: WinLoss | null, history: WinLoss | null): WinLoss | null {
	if (recordGames(community) >= COMMUNITY_MIN_GAMES) return community;
	if (recordGames(history) > 0) return history;
	if (recordGames(community) > 0) return community;
	return null;
}

function sortedHistory(player: LobbyPlayer): TransformedMatch[] {
	const history = player.matchHistory;
	if (!history?.length) return [];
	return [...history].sort(
		(a, b) => (b.completiontime ?? b.startgametime ?? 0) - (a.completiontime ?? a.startgametime ?? 0)
	);
}

function selfEntry(match: TransformedMatch, profileId: number) {
	return match.players.find((entry) => entry.profile_id === profileId);
}

export function getRecentForm(player: LobbyPlayer, limit = FORM_LIMIT): ScoutFormMatch[] {
	const profileId = getPlayerProfileId(player);
	if (profileId == null) return [];

	const form: ScoutFormMatch[] = [];
	for (const match of sortedHistory(player)) {
		const entry = selfEntry(match, profileId);
		if (!entry || (entry.outcome !== 0 && entry.outcome !== 1)) continue;
		form.push({ id: match.id, outcome: entry.outcome });
		if (form.length >= limit) break;
	}
	return form;
}

function historyRecord(
	player: LobbyPlayer,
	matches: (match: TransformedMatch, entry: NonNullable<ReturnType<typeof selfEntry>>) => boolean
): WinLoss | null {
	const profileId = getPlayerProfileId(player);
	if (profileId == null) return null;

	let wins = 0;
	let losses = 0;
	for (const match of player.matchHistory ?? []) {
		const entry = selfEntry(match, profileId);
		if (!entry || (entry.outcome !== 0 && entry.outcome !== 1)) continue;
		if (!matches(match, entry)) continue;
		if (entry.outcome === 1) wins += 1;
		else losses += 1;
	}

	if (wins + losses === 0) return null;
	return { wins, losses };
}

export function getMapRecordFromHistory(player: LobbyPlayer, map?: string | null): WinLoss | null {
	if (!map) return null;
	return historyRecord(player, (match) => mapsEqual(match.mapname, map));
}

export function getFactionRecordFromHistory(player: LobbyPlayer): WinLoss | null {
	return historyRecord(player, (_match, entry) => entry.race_id === player.race);
}

export function getMapRecordFromPerformance(
	performance: PlayerPerformance | null | undefined,
	map?: string | null
): WinLoss | null {
	if (!performance || !map) return null;
	const row = performance.byMap.find((entry) => mapsEqual(entry.map, map));
	if (!row || row.wins + row.losses === 0) return null;
	return { wins: row.wins, losses: row.losses };
}

export function getFactionRecordFromPerformance(
	performance: PlayerPerformance | null | undefined,
	race: number
): WinLoss | null {
	if (!performance) return null;
	const row = performance.byFaction.find((entry) => entry.raceId === race);
	if (!row || row.wins + row.losses === 0) return null;
	return { wins: row.wins, losses: row.losses };
}

export function getHeadToHead(player: LobbyPlayer, meProfileId?: number | null): WinLoss | null {
	const profileId = getPlayerProfileId(player);
	if (profileId == null || meProfileId == null || profileId === meProfileId) return null;

	let wins = 0;
	let losses = 0;
	for (const match of player.matchHistory ?? []) {
		const self = selfEntry(match, profileId);
		const me = match.players.find((entry) => entry.profile_id === meProfileId);
		if (!self || !me || (me.outcome !== 0 && me.outcome !== 1)) continue;
		if (self.teamid === me.teamid) continue;
		if (me.outcome === 1) wins += 1;
		else losses += 1;
	}

	if (wins + losses === 0) return null;
	return { wins, losses };
}

export function buildPlayerScout(options: {
	player: LobbyPlayer;
	map?: string | null;
	meProfileId?: number | null;
	performance?: PlayerPerformance | null;
	smurf?: SmurfAlertState | null;
}): PlayerScoutStats {
	const { player, map, meProfileId, performance, smurf = null } = options;
	if (player.playerId === -1) return emptyPlayerScout();

	return {
		form: getRecentForm(player),
		map: preferRecord(getMapRecordFromPerformance(performance, map), getMapRecordFromHistory(player, map)),
		faction: preferRecord(
			getFactionRecordFromPerformance(performance, player.race),
			getFactionRecordFromHistory(player)
		),
		vsYou: getHeadToHead(player, meProfileId),
		smurf
	};
}

function teamEloSummary(players: LobbyPlayer[], matchType: MatchTypeId): TeamEloSummary {
	let total = 0;
	let count = 0;
	let max: number | null = null;
	let maxAlias: string | null = null;

	for (const player of players) {
		if (player.playerId === -1) continue;
		const elo = getLobbyPlayerElo(player, matchType);
		if (elo == null) continue;
		total += elo;
		count += 1;
		if (max == null || elo > max) {
			max = elo;
			maxAlias = getPlayerAlias(player);
		}
	}

	return {
		avg: count > 0 ? Math.round(total / count) : null,
		max,
		maxAlias
	};
}

export function getMatchupStats(
	allies: LobbyPlayer[],
	axis: LobbyPlayer[],
	matchType: MatchTypeId
): MatchupStats {
	const alliesSummary = teamEloSummary(allies, matchType);
	const axisSummary = teamEloSummary(axis, matchType);
	const gap =
		alliesSummary.avg != null && axisSummary.avg != null
			? axisSummary.avg - alliesSummary.avg
			: null;

	return {
		allies: alliesSummary,
		axis: axisSummary,
		gap
	};
}

export function formatWinLoss(record: WinLoss | null): string {
	if (!record) return '—';
	return `${record.wins}–${record.losses}`;
}

export function formatWinrate(record: WinLoss | null): string | null {
	if (!record) return null;
	const total = record.wins + record.losses;
	if (total === 0) return null;
	return `${Math.round((record.wins / total) * 100)}%`;
}

export function formatRecordWithRate(record: WinLoss | null): string | null {
	if (!record) return null;
	const rate = formatWinrate(record);
	return rate ? `${formatWinLoss(record)} · ${rate}` : formatWinLoss(record);
}

export function formatMatchupGap(gap: number | null): string {
	if (gap == null) return '—';
	if (gap === 0) return 'Even';
	if (gap > 0) return `Axis +${gap}`;
	return `Allies +${Math.abs(gap)}`;
}
