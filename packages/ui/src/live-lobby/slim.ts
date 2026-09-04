import type { LiveLobbyPlayer } from './types';

/** Public live-lobby row before host-specific modeLabel i18n. */
export type LiveLobbyRecord = {
	id: string;
	/** Durable `lobbies` id for detail links; null until ensureStarted finishes. */
	lobbyId?: string | null;
	sessionId: string;
	map: string;
	isRanked: boolean;
	createdAt: string;
	updatedAt: string;
	hostName: string;
	players: LiveLobbyPlayer[];
};

function toFiniteNumber(value: unknown): number | null {
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

/**
 * Relic logs closed/empty slots as Id -1 with Type 3 or 6.
 * Real skirmish AI is Id -1 with Type 1. Replay placeholders use Id 0.
 * Nested matchHistory[].players members have profile_id/race_id, not playerId.
 * Keep in sync with packages/pocketbase/pb_hooks/lib/live-lobbies.js
 */
export function isOccupiedLobbySlot(player: unknown): boolean {
	if (!player || typeof player !== 'object' || Array.isArray(player)) {
		return false;
	}

	const row = player as Record<string, unknown>;
	if (row.race_id != null && row.playerId == null && row.type == null) {
		return false;
	}

	const playerId = toFiniteNumber(row.playerId);
	if (playerId == null) {
		return false;
	}

	if (playerId === -1) {
		return toFiniteNumber(row.type) === 1;
	}

	if (playerId === 0) {
		return false;
	}

	return true;
}

export function slimLiveLobbyPlayer(
	player: Record<string, unknown>,
	fallbackIndex: number
): LiveLobbyPlayer | null {
	const playerId = toFiniteNumber(player.playerId);
	const race = toFiniteNumber(player.race);
	const type = toFiniteNumber(player.type);
	const index = toFiniteNumber(player.index) ?? fallbackIndex;
	if (playerId == null || race == null || race < 0 || race > 3) {
		return null;
	}

	const profile = player.profile as
		| { profile_id?: unknown; alias?: unknown; country?: unknown }
		| undefined;
	const profileIdRaw = profile?.profile_id ?? (playerId > 0 ? playerId : null);
	const profileId = toFiniteNumber(profileIdRaw);
	const alias = String(profile?.alias || player.name || '').trim();
	const country = String(profile?.country || '').trim() || null;

	return {
		index,
		playerId,
		type: type ?? 0,
		race,
		alias,
		profileId: profileId != null && profileId > 0 ? profileId : null,
		steamId: player.steamId ? String(player.steamId) : null,
		country
	};
}

export function slimLiveLobbyPlayers(value: unknown): LiveLobbyPlayer[] {
	const raw = Array.isArray(value) ? value : [];
	const seenSlot: Record<number, true> = {};
	const items: LiveLobbyPlayer[] = [];

	for (let i = 0; i < raw.length; i++) {
		const player = raw[i];
		if (!isOccupiedLobbySlot(player)) {
			continue;
		}

		const slim = slimLiveLobbyPlayer(player as Record<string, unknown>, i);
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

export function getLiveLobbyMatchTypeId(
	players: Array<{ playerId: number }>,
	isRanked?: boolean
): number {
	if (players.some((player) => player.playerId === -1)) {
		return 14;
	}

	if (!isRanked) {
		return 0;
	}

	if (players.length === 2) {
		return 1;
	}

	if (players.length === 4) {
		return 2;
	}

	if (players.length === 6) {
		return 3;
	}

	if (players.length === 8) {
		return 4;
	}

	return 0;
}

export function toLiveLobbyRecord(input: {
	id: string;
	lobbyId?: string | null;
	sessionId?: string | number;
	map?: string;
	isRanked?: boolean;
	isReplay?: boolean;
	createdAt?: string;
	updatedAt?: string;
	hostName?: string;
	players?: unknown;
}): LiveLobbyRecord | null {
	if (input.isReplay) {
		return null;
	}

	const sessionId = String(input.sessionId || '');
	if (!sessionId || !input.id) {
		return null;
	}

	return {
		id: input.id,
		lobbyId: input.lobbyId ?? null,
		sessionId,
		map: String(input.map || ''),
		isRanked: Boolean(input.isRanked),
		createdAt: String(input.createdAt || ''),
		updatedAt: String(input.updatedAt || ''),
		hostName: String(input.hostName || '').trim(),
		players: slimLiveLobbyPlayers(input.players)
	};
}
