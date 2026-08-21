import { fetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';
import { PUBLIC_PB_URL } from '$env/static/public';
import type { PlayerEloMap, PlayerRatingSnapshot } from '$lib/utils/player-elo';
import { eloMapFromRecord, isValidSteamId } from '$lib/utils/player-elo';

export type PlayerRatingRecord = {
	id: string;
	steamId: string;
	profileId: number;
	alias: string;
	elo: PlayerEloMap;
};

const baseUrl = () => (PUBLIC_PB_URL ?? 'https://api.coh1stats.com').replace(/\/$/, '');

function toRecord(raw: {
	id: string;
	steamId: string;
	profileId: number;
	alias: string;
	elo?: unknown;
}): PlayerRatingRecord {
	return {
		id: raw.id,
		steamId: raw.steamId,
		profileId: raw.profileId,
		alias: raw.alias,
		elo: eloMapFromRecord(raw.elo)
	};
}

export async function getPlayerRating(steamId: string): Promise<PlayerRatingRecord | null> {
	if (!isValidSteamId(steamId)) {
		return null;
	}

	try {
		const response = await fetch(`${baseUrl()}/api/player-ratings/${steamId}`);
		if (response.status === 404) {
			return null;
		}

		if (!response.ok) {
			return null;
		}

		return toRecord((await response.json()) as PlayerRatingRecord);
	} catch {
		return null;
	}
}

export async function getPlayerRatings(steamIds: string[]): Promise<Map<string, PlayerRatingRecord>> {
	const uniqueIds = [...new Set(steamIds.filter(isValidSteamId))];
	const results = new Map<string, PlayerRatingRecord>();

	if (uniqueIds.length === 0) {
		return results;
	}

	try {
		const filter = uniqueIds.map((id) => `steamId="${id}"`).join('||');
		const records = await pocketbase.collection('player_ratings').getFullList({
			filter,
			fetch
		});

		for (const record of records) {
			const mapped = toRecord(record);
			results.set(mapped.steamId, mapped);
		}
	} catch (error) {
		console.warn('[player_ratings] batch fetch failed', error);
	}

	return results;
}

export async function ingestPlayerRatings(
	players: PlayerRatingSnapshot[]
): Promise<PlayerRatingRecord[]> {
	if (players.length === 0) {
		return [];
	}

	try {
		const payload = await pocketbase.send<{ players?: PlayerRatingRecord[] }>(
			'/api/player-ratings/ingest',
			{
				method: 'POST',
				body: { players },
				fetch
			}
		);

		return Array.isArray(payload.players) ? payload.players.map(toRecord) : [];
	} catch (error) {
		console.warn('[player_ratings] ingest failed', error);
		return [];
	}
}
