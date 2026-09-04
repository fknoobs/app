import PocketBase, { ClientResponseError } from 'pocketbase';
import { errAsync, ok, ResultAsync } from 'neverthrow';
import { appError } from '$lib/errors/app-error';
import {
	attachLiveLobbyStats,
	toLiveLobbyRecord,
	type LiveLobbyRawPlayer,
	type LiveLobbyRecord
} from '@company-of-heroes/ui/live-lobby';

export type { LiveLobbyRecord };

/** Keep in sync with packages/app/.../lobbies-live.ts and pocketbase lobbies-live.js */
const LOBBIES_LIVE_STALE_MS = 30 * 60 * 1000;
const LIST_LIMIT = 48;

type CollectionLobby = {
	id: string;
	sessionId?: number | string;
	map?: string;
	isRanked?: boolean;
	isReplay?: boolean;
	createdAt?: string;
	updatedAt?: string;
	lobby?: string;
	players?: unknown;
	expand?: { user?: { name?: string; email?: string } };
};

function publicFilter(now = Date.now()) {
	const since = new Date(now - LOBBIES_LIVE_STALE_MS).toISOString().replace('T', ' ');
	return `updatedAt > "${since}" && isReplay != true`;
}

function isFresh(updatedAt: string | undefined, now = Date.now()) {
	const at = new Date(String(updatedAt || '')).getTime();
	return Number.isFinite(at) && now - at < LOBBIES_LIVE_STALE_MS;
}

function toRecord(row: CollectionLobby): LiveLobbyRecord | null {
	const record = toLiveLobbyRecord({
		id: row.id,
		lobbyId: row.lobby || null,
		sessionId: row.sessionId,
		map: row.map,
		isRanked: row.isRanked,
		isReplay: row.isReplay,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		hostName: row.expand?.user?.name ?? row.expand?.user?.email ?? '',
		players: row.players
	});
	if (!record || !isFresh(record.updatedAt)) {
		return null;
	}

	const rawPlayers = (Array.isArray(row.players) ? row.players : []) as LiveLobbyRawPlayer[];
	return {
		...record,
		players: attachLiveLobbyStats(record.players, rawPlayers, record.isRanked)
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

/**
 * Same data path as the companion `LobbiesLive.getList` / `LiveLobbiesFeed`:
 * read `lobbies_live`, then slim + attach stats via `@company-of-heroes/ui/live-lobby`.
 */
export class LiveLobbiesService {
	constructor(private pocketbase: PocketBase) {}

	get(id: string) {
		return ResultAsync.fromPromise(
			this.pocketbase.collection('lobbies_live').getOne<CollectionLobby>(id, { expand: 'user' }),
			(error) => {
				if (error instanceof ClientResponseError && error.status === 404) {
					return appError(404, 'This match is no longer live.');
				}

				return appError(500, 'Failed to load live lobby.');
			}
		).andThen((row) => {
			const lobby = toRecord(row);
			if (!lobby) {
				return errAsync(appError(404, 'This match is no longer live.'));
			}

			return ok(lobby);
		});
	}

	list() {
		return ResultAsync.fromPromise(
			this.pocketbase.collection('lobbies_live').getList<CollectionLobby>(1, LIST_LIMIT, {
				filter: publicFilter(),
				sort: '-updatedAt',
				expand: 'user'
			}),
			() => appError(500, 'Failed to load live lobbies.')
		).map((response) => {
			const items: LiveLobbyRecord[] = [];
			for (const row of response.items) {
				const lobby = toRecord(row);
				if (lobby) {
					items.push(lobby);
				}
			}

			return uniqueBySession(items);
		});
	}
}
