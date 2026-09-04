import {
	isAlliesRace,
	isAxisRace,
	isOccupiedLiveLobbyPlayer,
	type LiveLobbyPlayer,
	type LiveLobbyPlayerStats
} from './types';

/** Minimal shape of a Relic leaderboard stat needed for live-lobby display. */
export type LeaderboardStatLike = {
	leaderboard_id: number;
	wins?: number;
	losses?: number;
	streak?: number;
	rank?: number;
	ranklevel?: number;
};

function toFiniteNumber(value: unknown): number | null {
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

/**
 * Maps a basic (0) or ranked 1v1–4v4 (1–4) match type + race to its Relic
 * leaderboard id (0–19). Races: US=0, Wehrmacht=1, Commonwealth=2, PanzerElite=3.
 * Returns null for skirmish/operations or out-of-range races.
 */
export function leaderboardIdForMatchRace(
	matchTypeId: number,
	race: number
): number | null {
	if (!Number.isInteger(matchTypeId) || matchTypeId < 0 || matchTypeId > 4) {
		return null;
	}

	if (!Number.isInteger(race) || race < 0 || race > 3) {
		return null;
	}

	return matchTypeId * 4 + race;
}

/**
 * Picks a player's live-lobby stats for the given match type + race from their
 * Relic leaderboard stats, combined with a resolved ELO. Returns null when there
 * is neither a matching leaderboard row nor a known ELO.
 */
export function pickPlayerStats(
	leaderboardStats: LeaderboardStatLike[] | null | undefined,
	matchTypeId: number,
	race: number,
	elo: number | null
): LiveLobbyPlayerStats | null {
	const leaderboardId = leaderboardIdForMatchRace(matchTypeId, race);
	const stat =
		leaderboardId != null && Array.isArray(leaderboardStats)
			? leaderboardStats.find((entry) => toFiniteNumber(entry.leaderboard_id) === leaderboardId)
			: undefined;

	if (!stat && elo == null) {
		return null;
	}

	return {
		elo,
		wins: toFiniteNumber(stat?.wins) ?? 0,
		losses: toFiniteNumber(stat?.losses) ?? 0,
		streak: toFiniteNumber(stat?.streak) ?? 0,
		rank: toFiniteNumber(stat?.rank) ?? 0,
		rankLevel: toFiniteNumber(stat?.ranklevel) ?? 0
	};
}

/** True when at least one occupied player carries resolved stats. */
export function hasLiveLobbyStats(players: LiveLobbyPlayer[]): boolean {
	return players.some((player) => isOccupiedLiveLobbyPlayer(player) && player.stats != null);
}

type TeamEloSummary = {
	avg: number | null;
	max: number | null;
	maxAlias: string | null;
};

function teamEloSummary(players: LiveLobbyPlayer[]): TeamEloSummary {
	let total = 0;
	let count = 0;
	let max: number | null = null;
	let maxAlias: string | null = null;

	for (const player of players) {
		const elo = player.stats?.elo;
		if (elo == null) {
			continue;
		}

		total += elo;
		count += 1;
		if (max == null || elo > max) {
			max = elo;
			maxAlias = player.alias.trim() || null;
		}
	}

	return {
		avg: count > 0 ? Math.round(total / count) : null,
		max,
		maxAlias
	};
}

export type LiveLobbyMatchup = {
	alliesAvg: number | null;
	axisAvg: number | null;
	gap: number | null;
	highest: number | null;
	highestAlias: string | null;
};

/**
 * Computes average team ELO, the ELO gap (axis − allies), and the highest-rated
 * player across both teams from resolved player stats.
 */
export function getLiveLobbyMatchup(players: LiveLobbyPlayer[]): LiveLobbyMatchup {
	const occupied = players.filter(isOccupiedLiveLobbyPlayer);
	const allies = teamEloSummary(occupied.filter((player) => isAlliesRace(player.race)));
	const axis = teamEloSummary(occupied.filter((player) => isAxisRace(player.race)));
	const gap = allies.avg != null && axis.avg != null ? axis.avg - allies.avg : null;

	let highest = allies.max;
	let highestAlias = allies.maxAlias;
	if (axis.max != null && (highest == null || axis.max > highest)) {
		highest = axis.max;
		highestAlias = axis.maxAlias;
	}

	return {
		alliesAvg: allies.avg,
		axisAvg: axis.avg,
		gap,
		highest,
		highestAlias
	};
}

export type MatchupGapLabels = {
	none: string;
	even: string;
	axisAhead: (gap: number) => string;
	alliesAhead: (gap: number) => string;
};

/**
 * Formats the ELO gap for display. Pass host `labels` (i18n) to override the
 * English defaults.
 */
export function formatMatchupGap(
	gap: number | null,
	labels?: Partial<MatchupGapLabels>
): string {
	if (gap == null) {
		return labels?.none ?? '—';
	}

	if (gap === 0) {
		return labels?.even ?? 'Even';
	}

	if (gap > 0) {
		return labels?.axisAhead ? labels.axisAhead(gap) : `Axis +${gap}`;
	}

	const abs = Math.abs(gap);
	return labels?.alliesAhead ? labels.alliesAhead(abs) : `Allies +${abs}`;
}
