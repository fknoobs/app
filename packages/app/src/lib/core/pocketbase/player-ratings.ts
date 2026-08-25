import { fetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';
import { PUBLIC_PB_URL } from '$env/static/public';
import type { TransformedMatch } from '@fknoobs/app';
import {
	eloMapFromRecord,
	extractPlayerRatingSnapshots,
	isValidSteamId,
	type PlayerEloMap,
	type PlayerRatingSnapshot
} from '$lib/utils/player-elo';

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
		const response = await fetch(`${baseUrl()}/api/player-ratings/${steamId}?fill=1`);
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

export async function getPlayerRatings(
	steamIds: string[]
): Promise<Map<string, PlayerRatingRecord>> {
	const uniqueIds = [...new Set(steamIds.filter(isValidSteamId))];
	const results = new Map<string, PlayerRatingRecord>();

	if (uniqueIds.length === 0) {
		return results;
	}

	// PocketBase rejects oversized filter query strings; keep each OR-clause batch small.
	const BATCH_SIZE = 40;
	const batches: string[][] = [];
	for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
		batches.push(uniqueIds.slice(i, i + BATCH_SIZE));
	}

	const settled = await Promise.all(
		batches.map(async (batch) => {
			try {
				const filter = batch.map((id) => `steamId="${id}"`).join('||');
				return await pocketbase.collection('player_ratings').getFullList({
					filter,
					fetch
				});
			} catch (error) {
				console.warn('[player_ratings] batch fetch failed', error);
				return [];
			}
		})
	);

	for (const records of settled) {
		for (const record of records) {
			const mapped = toRecord(record);
			results.set(mapped.steamId, mapped);
		}
	}

	return results;
}

export const INGEST_BATCH_SIZE = 64;

export function ingestRatingsFromMatchHistory(matches: TransformedMatch[] | undefined): void {
	if (!pocketbase.authStore.isValid) {
		return;
	}

	const snapshots = extractPlayerRatingSnapshots(matches);
	if (snapshots.length === 0) {
		return;
	}

	void ingestPlayerRatings(snapshots);
}

export async function ingestPlayerRatings(
	players: PlayerRatingSnapshot[]
): Promise<PlayerRatingRecord[]> {
	if (players.length === 0 || !pocketbase.authStore.isValid) {
		return [];
	}

	const records: PlayerRatingRecord[] = [];
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (pocketbase.authStore.token) {
		headers.Authorization = pocketbase.authStore.token;
	}

	for (let i = 0; i < players.length; i += INGEST_BATCH_SIZE) {
		const batch = players.slice(i, i + INGEST_BATCH_SIZE);

		try {
			const response = await fetch(`${baseUrl()}/api/player-ratings/ingest`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ players: batch })
			});

			if (!response.ok) {
				console.warn('[player_ratings] ingest failed', response.status);
				continue;
			}

			const payload = (await response.json()) as { players?: PlayerRatingRecord[] };
			if (Array.isArray(payload.players)) {
				records.push(...payload.players.map(toRecord));
			}
		} catch (error) {
			console.warn('[player_ratings] ingest failed', error);
		}
	}

	return records;
}

export type PlayerEloHistoryPoint = {
	at: number;
	rating: number;
	matchtypeId: number;
	raceId: number;
	matchId: number;
};

export type PlayerEloHistoryResponse = {
	points: PlayerEloHistoryPoint[];
};

export async function getPlayerEloHistory(options: {
	profileId?: number | null;
	steamId?: string | null;
}): Promise<PlayerEloHistoryPoint[]> {
	const profileId = Number(options.profileId);
	const steamId = options.steamId?.trim() || '';
	const hasProfile = Number.isInteger(profileId) && profileId > 0;
	const hasSteam = isValidSteamId(steamId);

	if (!hasProfile && !hasSteam) {
		return [];
	}

	const params = new URLSearchParams();
	if (hasProfile) params.set('profileId', String(profileId));
	if (hasSteam) params.set('steamId', steamId);

	try {
		const response = await fetch(`${baseUrl()}/api/player-ratings/history?${params}`);
		if (!response.ok) {
			return [];
		}

		const payload = (await response.json()) as PlayerEloHistoryResponse;
		return Array.isArray(payload.points) ? payload.points : [];
	} catch (error) {
		console.warn('[player_ratings] elo history failed', error);
		return [];
	}
}

export function groupEloHistoryByModeAndRace(
	points: PlayerEloHistoryPoint[]
): Record<number, Record<number, PlayerEloHistoryPoint[]>> {
	const grouped: Record<number, Record<number, PlayerEloHistoryPoint[]>> = {};

	for (const point of points) {
		if (point.matchtypeId === 14) continue;
		const byRace = (grouped[point.matchtypeId] ??= {});
		const series = (byRace[point.raceId] ??= []);
		series.push(point);
	}

	for (const byRace of Object.values(grouped)) {
		for (const series of Object.values(byRace)) {
			series.sort((a, b) => a.at - b.at || a.matchId - b.matchId);
		}
	}

	return grouped;
}
