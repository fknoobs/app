import { api, unwrapApi } from '$core/api';
import type { TransformedMatch } from '@fknoobs/app';
import {
	LEADERBOARD_ELO_STALE_MS,
	LEADERBOARD_HARVEST_MAX,
	INGEST_BATCH_SIZE,
	isValidSteamId,
	selectLeaderboardHarvestProfileIds,
	groupEloHistoryByModeAndRace,
	type PlayerEloHistoryPoint,
	type PlayerRatingRecord,
	type PlayerRatingSnapshot
} from '@company-of-heroes/api';

export type { PlayerEloHistoryPoint, PlayerRatingRecord, PlayerRatingSnapshot };

export {
	LEADERBOARD_ELO_STALE_MS,
	LEADERBOARD_HARVEST_MAX,
	INGEST_BATCH_SIZE,
	isValidSteamId,
	selectLeaderboardHarvestProfileIds,
	groupEloHistoryByModeAndRace
};

export async function harvestPlayerRatingsForProfiles(
	profileIds: number[]
): Promise<{ processed: number; skipped: number; updated: number } | null> {
	return unwrapApi(api.ratings.harvest(profileIds));
}

export async function getPlayerRating(
	steamId: string,
	options?: { fill?: boolean }
): Promise<PlayerRatingRecord | null> {
	return unwrapApi(api.ratings.getPlayerRating(steamId, options));
}

export async function getPlayerRatings(
	steamIds: string[]
): Promise<Map<string, PlayerRatingRecord>> {
	return unwrapApi(api.ratings.getPlayerRatings(steamIds));
}

export function ingestRatingsFromMatchHistory(matches: TransformedMatch[] | undefined): void {
	void unwrapApi(api.ratings.ingestFromMatchHistory(matches));
}

export async function ingestPlayerRatings(
	players: PlayerRatingSnapshot[]
): Promise<PlayerRatingRecord[]> {
	return unwrapApi(api.ratings.ingest(players));
}

export async function getPlayerEloHistory(options: {
	profileId?: number | null;
	steamId?: string | null;
}): Promise<PlayerEloHistoryPoint[]> {
	return unwrapApi(api.ratings.getPlayerEloHistory(options));
}
