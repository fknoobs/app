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

export async function getPlayerRatings(
	steamIds: string[]
): Promise<Map<string, PlayerRatingRecord>> {
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
