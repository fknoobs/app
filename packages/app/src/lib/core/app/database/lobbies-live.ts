import { isOccupiedLobbySlot, type Match } from '$core/game/lobby';
import type { LobbyPlayer, TransformedMatch } from '@fknoobs/app';
import type { LobbiesLiveResponse, UsersResponse } from '$core/pocketbase/types';
import { exp, pocketbase } from '$core/pocketbase';
import { getPlayerRatings, type PlayerRatingRecord } from '$core/pocketbase/player-ratings';
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

/** Public live-match list: hide replay playback rows. Overlay still polls by user. */
export function lobbiesLivePublicFilter(now = Date.now()): string {
	return `(${lobbiesLiveFreshFilter(now)}) && isReplay != true`;
}

export function isLiveLobbyFresh(
	lobby: Pick<LiveLobby, 'updatedAt'> | { updatedAt?: string },
	now = Date.now()
): boolean {
	if (!lobby.updatedAt) return false;
	const updatedAt = new Date(lobby.updatedAt).getTime();
	return Number.isFinite(updatedAt) && updatedAt > now - LOBBIES_LIVE_STALE_MS;
}

export function isPublicLiveLobby(
	lobby: Pick<LiveLobby, 'updatedAt' | 'isReplay'> | { updatedAt?: string; isReplay?: boolean },
	now = Date.now()
): boolean {
	return isLiveLobbyFresh(lobby, now) && !lobby.isReplay;
}

/**
 * Live lobby repository: upserts each user's currently running match so the
 * community/overlays can show "now playing". One row per authenticated user;
 * multiple users may share the same sessionId while in the same lobby.
 */
export class LobbiesLive {
	async getList(page = 1, perPage = 20): Promise<ListResult<LiveLobby>> {
		const response = await pocketbase.collection('lobbies_live').getList(page, perPage, {
			filter: lobbiesLivePublicFilter(),
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

		const occupied = match.players.filter(isOccupiedLobbySlot);
		const players = match.isReplay ? occupied : await withOverlayEloSources(occupied);
		const data = {
			user,
			isRanked: match.isRanked,
			isReplay: match.isReplay ?? false,
			sessionId: match.sessionId,
			map: match.map,
			players
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

/** Overlay only needs ratings + match type; drop Relic counters / aliases. */
function slimMatchHistoryForOverlay(
	history: TransformedMatch[] | undefined
): TransformedMatch[] | undefined {
	if (!history?.length) return history;
	return history.map((match) => ({
		matchtype_id: match.matchtype_id,
		completiontime: match.completiontime,
		startgametime: match.startgametime,
		players: (match.players ?? []).map((member) => ({
			profile_id: member.profile_id,
			newrating: member.newrating,
			oldrating: member.oldrating,
			race_id: member.race_id
		}))
	})) as TransformedMatch[];
}

async function withOverlayEloSources(players: LobbyPlayer[]): Promise<LobbyPlayer[]> {
	const steamIds = players
		.map((player) => player.steamId)
		.filter((steamId): steamId is string => Boolean(steamId));
	let ratings = new Map<string, PlayerRatingRecord>();
	try {
		ratings = await getPlayerRatings(steamIds);
	} catch (error) {
		console.warn('[LOBBIES_LIVE]: player ratings lookup failed', error);
	}

	return players.map((player) => {
		const storedElo =
			player.storedElo ?? (player.steamId ? ratings.get(player.steamId)?.elo : undefined);
		return {
			...player,
			storedElo,
			matchHistory: slimMatchHistoryForOverlay(player.matchHistory)
		};
	});
}
