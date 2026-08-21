import type { LobbyPlayer, TransformedMatch } from '@fknoobs/app';
import { getRaceFromLeaderboardId } from '$lib/utils/game';

export const MIN_STORED_MATCH_TYPE = 0;
export const MAX_STORED_MATCH_TYPE = 7;
export const STEAM_ID_REGEX = /^7656119\d{10}$/;

export type PlayerEloSlot = {
	rating: number;
	matchId: number;
	at: number;
};

export type PlayerEloMap = Record<string, Record<string, PlayerEloSlot>>;

export type PlayerEloSlotInput = {
	matchtypeId: number;
	raceId: number;
	rating: number;
	matchId: number;
	at: number;
};

export type PlayerRatingSnapshot = {
	steamId: string;
	profileId: number;
	alias: string;
	slots: PlayerEloSlotInput[];
};

export function isStoredMatchType(matchtypeId: number): boolean {
	return (
		Number.isInteger(matchtypeId) &&
		matchtypeId >= MIN_STORED_MATCH_TYPE &&
		matchtypeId <= MAX_STORED_MATCH_TYPE
	);
}

export function isValidSteamId(value: string | undefined | null): value is string {
	return typeof value === 'string' && STEAM_ID_REGEX.test(value);
}

export function getStoredEloRating(
	elo: PlayerEloMap | undefined,
	matchType: number,
	race: number
): number | null {
	if (!elo || !isStoredMatchType(matchType)) {
		return null;
	}

	const slot = elo[String(matchType)]?.[String(race)];
	if (!slot || typeof slot.rating !== 'number' || slot.rating < 1) {
		return null;
	}

	return slot.rating;
}

/**
 * Maps Relic leaderboard IDs to matchtype_id used in stored ELO.
 * Returns null for operations (not stored) and skirmish (always 1000).
 */
export function getMatchTypeIdFromLeaderboardId(leaderboardId: number): number | null {
	if (leaderboardId >= 0 && leaderboardId <= 3) return 0;
	if (leaderboardId >= 4 && leaderboardId <= 7) return 1;
	if (leaderboardId >= 8 && leaderboardId <= 11) return 2;
	if (leaderboardId >= 12 && leaderboardId <= 15) return 3;
	if (leaderboardId >= 16 && leaderboardId <= 19) return 4;
	return null;
}

export function getStoredEloForLeaderboard(
	elo: PlayerEloMap | undefined,
	leaderboardId: number
): number | null {
	const matchType = getMatchTypeIdFromLeaderboardId(leaderboardId);
	if (matchType == null) {
		return null;
	}

	return getStoredEloRating(elo, matchType, getRaceFromLeaderboardId(leaderboardId));
}

function steamIdFromPlayer(player: {
	steamId?: string;
	name?: string;
}): string | null {
	if (isValidSteamId(player.steamId)) {
		return player.steamId;
	}

	if (typeof player.name === 'string') {
		const steamId = player.name.replace('/steam/', '');
		return isValidSteamId(steamId) ? steamId : null;
	}

	return null;
}

function slotFromMatchPlayer(
	match: TransformedMatch,
	player: TransformedMatch['players'][number]
): PlayerEloSlotInput | null {
	if (!isStoredMatchType(match.matchtype_id)) {
		return null;
	}

	if (typeof player.newrating !== 'number' || player.newrating < 1) {
		return null;
	}

	if (!Number.isInteger(player.race_id) || player.race_id < 0 || player.race_id > 3) {
		return null;
	}

	const matchId = Number(match.id);
	if (!Number.isFinite(matchId) || matchId <= 0) {
		return null;
	}

	const at = Number(match.completiontime ?? match.startgametime ?? 0);
	if (!Number.isFinite(at) || at < 0) {
		return null;
	}

	return {
		matchtypeId: match.matchtype_id,
		raceId: player.race_id,
		rating: player.newrating,
		matchId,
		at
	};
}

function upsertSnapshotSlot(snapshot: PlayerRatingSnapshot, slot: PlayerEloSlotInput): void {
	const existing = snapshot.slots.find(
		(item) => item.matchtypeId === slot.matchtypeId && item.raceId === slot.raceId
	);

	if (!existing) {
		snapshot.slots.push(slot);
		return;
	}

	if (slot.at > existing.at) {
		existing.rating = slot.rating;
		existing.matchId = slot.matchId;
		existing.at = slot.at;
	}
}

export function extractPlayerRatingSnapshots(
	matches: TransformedMatch[] | undefined
): PlayerRatingSnapshot[] {
	if (!matches?.length) {
		return [];
	}

	const bySteamId = new Map<string, PlayerRatingSnapshot>();

	for (const match of matches) {
		if (!isStoredMatchType(match.matchtype_id) || !match.players?.length) {
			continue;
		}

		for (const player of match.players) {
			const steamId = steamIdFromPlayer(player);
			const slot = slotFromMatchPlayer(match, player);
			const alias = typeof player.alias === 'string' ? player.alias.trim() : '';
			const profileId = Number(player.profile_id);

			if (!steamId || !slot || !alias || !Number.isInteger(profileId) || profileId <= 0) {
				continue;
			}

			const existing = bySteamId.get(steamId);
			if (!existing) {
				bySteamId.set(steamId, {
					steamId,
					profileId,
					alias,
					slots: [slot]
				});
				continue;
			}

			existing.profileId = profileId;
			existing.alias = alias;
			upsertSnapshotSlot(existing, slot);
		}
	}

	return [...bySteamId.values()];
}

export function extractPlayerRatingSnapshotsFromLobby(
	players: LobbyPlayer[] | undefined
): PlayerRatingSnapshot[] {
	if (!players?.length) {
		return [];
	}

	const snapshots: PlayerRatingSnapshot[] = [];

	for (const player of players) {
		if (player.playerId === -1 || !isValidSteamId(player.steamId)) {
			continue;
		}

		const extracted = extractPlayerRatingSnapshots(player.matchHistory);
		const own =
			extracted.find((snapshot) => snapshot.steamId === player.steamId) ??
			extracted.find((snapshot) => snapshot.profileId === player.playerId);

		if (own) {
			snapshots.push(own);
		}
	}

	return snapshots;
}

export function eloMapFromRecord(elo: unknown): PlayerEloMap {
	if (!elo || typeof elo !== 'object' || Array.isArray(elo)) {
		return {};
	}

	return elo as PlayerEloMap;
}

export function eloMapFromSlots(slots: PlayerEloSlotInput[]): PlayerEloMap {
	const elo: PlayerEloMap = {};

	for (const slot of slots) {
		const matchKey = String(slot.matchtypeId);
		const raceKey = String(slot.raceId);
		const group = elo[matchKey] ?? {};
		const current = group[raceKey];

		if (!current || slot.at > current.at) {
			group[raceKey] = {
				rating: slot.rating,
				matchId: slot.matchId,
				at: slot.at
			};
			elo[matchKey] = group;
		}
	}

	return elo;
}

export function mergeEloMaps(...maps: (PlayerEloMap | undefined)[]): PlayerEloMap {
	const merged: PlayerEloMap = {};

	for (const map of maps) {
		if (!map) continue;

		for (const [matchKey, races] of Object.entries(map)) {
			if (!races) continue;

			for (const [raceKey, slot] of Object.entries(races)) {
				if (!slot) continue;

				const group = merged[matchKey] ?? {};
				const current = group[raceKey];
				if (!current || slot.at > current.at) {
					group[raceKey] = slot;
					merged[matchKey] = group;
				}
			}
		}
	}

	return merged;
}

export function eloMapForSteamId(
	matches: TransformedMatch[] | undefined,
	steamId: string,
	profileId?: number
): PlayerEloMap {
	const snapshots = extractPlayerRatingSnapshots(matches);
	const own =
		(isValidSteamId(steamId)
			? snapshots.find((snapshot) => snapshot.steamId === steamId)
			: undefined) ??
		(profileId != null
			? snapshots.find((snapshot) => snapshot.profileId === profileId)
			: undefined);

	return own ? eloMapFromSlots(own.slots) : {};
}
