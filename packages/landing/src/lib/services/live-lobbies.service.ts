import { errAsync, ok } from 'neverthrow';
import { appError } from '$lib/errors/app-error';
import { fetchJson } from '$lib/errors/fetch-json';
import { API_URL } from '$lib/site/urls';
import type { LiveLobbyPlayer } from '@company-of-heroes/ui/live-lobby';

/** Keep in sync with packages/pocketbase/pb_hooks/lib/lobbies-live.js */
const LOBBIES_LIVE_STALE_MS = 30 * 60 * 1000;

export type LiveLobbyRecord = {
	id: string;
	sessionId: string;
	map: string;
	isRanked: boolean;
	createdAt: string;
	updatedAt: string;
	hostName: string;
	players: LiveLobbyPlayer[];
};

type CollectionLobby = {
	id: string;
	sessionId?: number | string;
	map?: string;
	isRanked?: boolean;
	isReplay?: boolean;
	createdAt?: string;
	updatedAt?: string;
	players?: unknown;
	expand?: { user?: { name?: string } };
};

function toFiniteNumber(value: unknown): number | null {
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function isOccupiedLobbySlot(player: Record<string, unknown>) {
	if (player.race_id != null && player.playerId == null && player.type == null) {
		return false;
	}

	const playerId = toFiniteNumber(player.playerId);
	if (playerId == null) {
		return false;
	}

	if (playerId === -1) {
		return toFiniteNumber(player.type) === 1;
	}

	if (playerId === 0) {
		return false;
	}

	return true;
}

function slimPlayer(player: Record<string, unknown>, fallbackIndex: number): LiveLobbyPlayer | null {
	const playerId = toFiniteNumber(player.playerId);
	const race = toFiniteNumber(player.race);
	const type = toFiniteNumber(player.type);
	const index = toFiniteNumber(player.index) ?? fallbackIndex;
	if (playerId == null || race == null || race < 0 || race > 3) {
		return null;
	}

	const profile = player.profile as { profile_id?: unknown; alias?: unknown } | undefined;
	const profileIdRaw = profile?.profile_id ?? (playerId > 0 ? playerId : null);
	const profileId = toFiniteNumber(profileIdRaw);
	const alias = String(profile?.alias || player.name || '').trim();
	return {
		index,
		playerId,
		type: type ?? 0,
		race,
		alias,
		profileId: profileId != null && profileId > 0 ? profileId : null,
		steamId: player.steamId ? String(player.steamId) : null
	};
}

function slimPlayers(value: unknown): LiveLobbyPlayer[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const seenSlot: Record<number, true> = {};
	const items: LiveLobbyPlayer[] = [];
	for (let i = 0; i < value.length; i++) {
		const player = value[i];
		if (!player || typeof player !== 'object' || Array.isArray(player)) {
			continue;
		}

		const row = player as Record<string, unknown>;
		if (!isOccupiedLobbySlot(row)) {
			continue;
		}

		const slim = slimPlayer(row, i);
		if (!slim) {
			continue;
		}

		const slot = slim.index;
		if (slot >= 0 && slot <= 7) {
			if (seenSlot[slot]) {
				continue;
			}

			seenSlot[slot] = true;
		}

		items.push(slim);
		if (items.length >= 8) {
			break;
		}
	}

	return items;
}

function isFresh(updatedAt: string | undefined) {
	const at = new Date(String(updatedAt || '')).getTime();
	return Number.isFinite(at) && Date.now() - at < LOBBIES_LIVE_STALE_MS;
}

function toPublicRecord(record: CollectionLobby): LiveLobbyRecord | null {
	if (record.isReplay || !isFresh(record.updatedAt)) {
		return null;
	}

	const sessionId = String(record.sessionId || '');
	if (!sessionId) {
		return null;
	}

	return {
		id: record.id,
		sessionId,
		map: String(record.map || ''),
		isRanked: Boolean(record.isRanked),
		createdAt: String(record.createdAt || ''),
		updatedAt: String(record.updatedAt || ''),
		hostName: String(record.expand?.user?.name || '').trim(),
		players: slimPlayers(record.players)
	};
}

function uniqueBySession(items: LiveLobbyRecord[]) {
	const seen: Record<string, true> = {};
	const unique: LiveLobbyRecord[] = [];
	for (const item of items) {
		if (seen[item.sessionId]) {
			continue;
		}

		seen[item.sessionId] = true;
		unique.push(item);
	}

	return unique;
}

function recordsUrl(extra?: { id?: string }) {
	const params = new URLSearchParams({ expand: 'user' });
	if (extra?.id) {
		return `${API_URL}/api/collections/lobbies_live/records/${encodeURIComponent(extra.id)}?${params}`;
	}

	const since = new Date(Date.now() - LOBBIES_LIVE_STALE_MS).toISOString().replace('T', ' ');
	params.set('page', '1');
	params.set('perPage', '48');
	params.set('sort', '-updatedAt');
	params.set('filter', `updatedAt > "${since}" && isReplay != true`);
	return `${API_URL}/api/collections/lobbies_live/records?${params}`;
}

export class LiveLobbiesService {
	constructor(private fetchFn: typeof fetch) {}

	get(id: string) {
		return fetchJson<CollectionLobby>(this.fetchFn, recordsUrl({ id }), {
			fallback: 'Failed to load live lobby.',
			onStatus: (status) => {
				if (status === 404) {
					return appError(404, 'This match is no longer live.');
				}
			}
		}).andThen((record) => {
			const lobby = toPublicRecord(record);
			if (!lobby) {
				return errAsync(appError(404, 'This match is no longer live.'));
			}

			return ok(lobby);
		});
	}

	list() {
		return fetchJson<{ items?: CollectionLobby[] }>(this.fetchFn, recordsUrl(), {
			fallback: 'Failed to load live lobbies.'
		}).map((data) => {
			const items: LiveLobbyRecord[] = [];
			for (const record of data.items ?? []) {
				const lobby = toPublicRecord(record);
				if (lobby) {
					items.push(lobby);
				}
			}

			return uniqueBySession(items);
		});
	}
}
