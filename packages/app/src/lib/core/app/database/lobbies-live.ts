import type { Match } from '$core/game/lobby';
import type { LobbyPlayer } from '@fknoobs/app';
import type { LobbiesLiveResponse, UsersResponse } from '$core/pocketbase/types';
import { exp, pocketbase } from '$core/pocketbase';
import { fetch } from '$core/http/fetch';
import {
	ClientResponseError,
	type ListResult,
	type RecordSubscription,
	type UnsubscribeFunc
} from 'pocketbase';
import type { Expand } from '@fknoobs/app';

export type LiveLobby = Expand<
	LobbiesLiveResponse<
		LobbyPlayer[],
		{
			user: UsersResponse;
		}
	>
> & { players: LobbyPlayer[] };

/** Drop orphaned rows when the game exits without a DESTROYED log (Alt+F4 / Exit to Windows).
 * Keep in sync with packages/pocketbase/pb_hooks/lib/lobbies-live.js */
export const LOBBIES_LIVE_STALE_MS = 30 * 60 * 1000;
/** How often an active match refreshes updatedAt so long games aren't pruned. */
export const LOBBIES_LIVE_HEARTBEAT_MS = 2 * 60 * 1000;

/** PocketBase filter: only rows touched within the stale window. */
export function lobbiesLiveFreshFilter(now = Date.now()): string {
	const since = new Date(now - LOBBIES_LIVE_STALE_MS).toISOString().replace('T', ' ');
	return `updatedAt > "${since}"`;
}

export function isLiveLobbyFresh(
	lobby: Pick<LiveLobby, 'updatedAt'> | { updatedAt?: string },
	now = Date.now()
): boolean {
	if (!lobby.updatedAt) return false;
	const updatedAt = new Date(lobby.updatedAt).getTime();
	return Number.isFinite(updatedAt) && updatedAt > now - LOBBIES_LIVE_STALE_MS;
}

/**
 * Live lobby repository: upserts each user's currently running match so the
 * community/overlays can show "now playing". One row per authenticated user;
 * multiple users may share the same sessionId while in the same lobby.
 */
export class LobbiesLive {
	async getList(page = 1, perPage = 20): Promise<ListResult<LiveLobby>> {
		const response = await pocketbase.collection('lobbies_live').getList(page, perPage, {
			filter: lobbiesLiveFreshFilter(),
			sort: '-updatedAt',
			expand: 'user',
			fetch
		});

		return {
			...response,
			items: response.items.map((item) => exp(item) as unknown as LiveLobby)
		};
	}

	async getOne(id: string): Promise<LiveLobby> {
		const record = await pocketbase.collection('lobbies_live').getOne(id, {
			expand: 'user',
			fetch
		});

		return exp(record) as unknown as LiveLobby;
	}

	async subscribe(
		callback: (event: RecordSubscription<LiveLobby>) => void
	): Promise<UnsubscribeFunc>;
	async subscribe(
		id: string,
		callback: (event: RecordSubscription<LiveLobby>) => void
	): Promise<UnsubscribeFunc>;
	async subscribe(
		idOrCallback: string | ((event: RecordSubscription<LiveLobby>) => void),
		maybeCallback?: (event: RecordSubscription<LiveLobby>) => void
	): Promise<UnsubscribeFunc> {
		const topic = typeof idOrCallback === 'string' ? idOrCallback : '*';
		const callback = typeof idOrCallback === 'string' ? maybeCallback! : idOrCallback;

		return pocketbase.collection('lobbies_live').subscribe<LiveLobby>(
			topic,
			(event) => {
				callback({
					...event,
					record: exp(event.record) as unknown as LiveLobby
				});
			},
			{ fetch, expand: 'user' }
		);
	}

	async setLobby(match: Match) {
		const user = pocketbase.authStore.record?.id;

		if (!pocketbase.authStore.isValid || !user) {
			console.warn('[LOBBIES_LIVE]: skipping upsert, PocketBase auth is missing or expired');
			return;
		}

		if (!match.sessionId || !match.map || match.players.length === 0) {
			console.warn('[LOBBIES_LIVE]: skipping upsert, match is incomplete', {
				sessionId: match.sessionId,
				map: match.map,
				players: match.players.length
			});
			return;
		}

		const data = {
			user,
			isRanked: match.isRanked,
			sessionId: match.sessionId,
			map: match.map,
			// Keep matchHistory: the stream overlay reads ELO from it over realtime.
			players: match.players
		};

		try {
			const existing = await pocketbase
				.collection('lobbies_live')
				.getFirstListItem(`user="${user}"`, { fetch });

			return await pocketbase.collection('lobbies_live').update(existing.id, data, { fetch });
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 404) {
				return await pocketbase.collection('lobbies_live').create(data, { fetch });
			}

			if (error instanceof ClientResponseError) {
				console.warn('[LOBBIES_LIVE]: upsert failed:', error.status, error.response);
			}

			throw error;
		}
	}

	async removeLobby() {
		const user = pocketbase.authStore.record?.id;

		if (!pocketbase.authStore.isValid || !user) {
			console.warn('[LOBBIES_LIVE]: skipping delete, PocketBase auth is missing or expired');
			return;
		}

		try {
			const existing = await pocketbase
				.collection('lobbies_live')
				.getFirstListItem(`user="${user}"`, { fetch });

			return await pocketbase.collection('lobbies_live').delete(existing.id, { fetch });
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 404) {
				return;
			}

			if (error instanceof ClientResponseError) {
				console.warn('[LOBBIES_LIVE]: delete failed:', error.status, error.response);
			}

			throw error;
		}
	}
}
