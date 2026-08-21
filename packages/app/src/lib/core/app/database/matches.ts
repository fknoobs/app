import {
	type LobbiesResponse,
	type Create,
	type Update,
	type LobbiesRecord,
	type UsersResponse,
	type LobbyAggregationResponse,
	type LobbyAggregationCommunityResponse,
	Collections
} from '$core/pocketbase/types';
import type { ListResult, RecordFullListOptions, UnsubscribeFunc } from 'pocketbase';
import type { LobbyPlayer, Match as LobbyMatch } from '@fknoobs/app';
import type { Expand } from '@fknoobs/app';
import { exp, pocketbase } from '$core/pocketbase';
import { fetch } from '$core/http/fetch';
import { account } from '$core/account';

export type Match = LobbiesResponse<
	LobbyPlayer[],
	LobbyMatch | null,
	{
		user: UsersResponse<Record<string, any>, string[]>;
	}
> & { players: LobbyPlayer[] };

export type MatchExpanded = Expand<
	Match & { alliesOutcome?: 'win' | 'loss'; axisOutcome?: 'win' | 'loss' }
>;

export type AggregationPlayer = { profile_id: number; alias: string };

export type HistoryListQuery = {
	scope: 'user' | 'community';
	userId?: string;
	/** Relic profile id — used as race-filter subject when steamIds are missing. */
	profileId?: number;
	ranked?: boolean;
	playerIds?: string[];
	maps?: string[];
	races?: string[];
};

const DEFAULT_EXPAND = 'user';

function isPreferredLobby(
	candidate: Pick<LobbiesRecord, 'needsResult' | 'hasReplay'>,
	current: Pick<LobbiesRecord, 'needsResult' | 'hasReplay'>
): boolean {
	const candidateDone = !candidate.needsResult;
	const currentDone = !current.needsResult;
	if (candidateDone !== currentDone) {
		return candidateDone;
	}

	const candidateReplay = !!candidate.hasReplay;
	const currentReplay = !!current.hasReplay;
	if (candidateReplay !== currentReplay) {
		return candidateReplay;
	}

	return false;
}

type LobbySessionRef = Pick<LobbiesRecord, 'id' | 'sessionId' | 'needsResult' | 'hasReplay'>;

/**
 * Match (lobby) repository.
 */
export class Matches {
	/**
	 * Retrieves a paginated list of matches.
	 */
	async getPaginated(
		page = 1,
		perPage = 50,
		{
			filter = '',
			fields = [],
			sort = '-createdAt',
			expand = DEFAULT_EXPAND
		}: {
			filter?: string;
			fields?: (keyof LobbiesRecord)[];
			sort?: string;
			expand?: string | false;
		} = {}
	): Promise<ListResult<MatchExpanded>> {
		const requestOptions: Parameters<
			ReturnType<typeof pocketbase.collection<'lobbies'>>['getList']
		>[2] = {
			filter,
			sort,
			fetch
		};

		if (fields.length > 0) {
			requestOptions.fields = fields.join(',');
		}

		if (expand !== false) {
			requestOptions.expand = expand;
		}

		const response = await pocketbase
			.collection('lobbies')
			.getList<Match>(page, perPage, requestOptions);

		return {
			...response,
			items: response.items.map(exp) as MatchExpanded[]
		};
	}

	/** Lightweight list used by the history page. */
	async getHistoryList(
		page = 1,
		perPage = 50,
		{
			scope,
			userId,
			profileId,
			ranked = false,
			playerIds = [],
			maps = [],
			races = []
		}: HistoryListQuery,
		options?: { signal?: AbortSignal }
	): Promise<ListResult<MatchExpanded>> {
		const query: Record<string, string> = {
			scope,
			page: String(page),
			perPage: String(perPage),
			ranked: ranked ? 'true' : 'false'
		};

		if (scope === 'user' && userId) {
			query.userId = userId;
		}

		if (scope === 'user' && profileId != null && profileId > 0) {
			query.profileId = String(profileId);
		}

		if (playerIds.length > 0) {
			query.playerIds = playerIds.join(',');
		}

		if (maps.length > 0) {
			query.maps = maps.join(',');
		}

		if (races.length > 0) {
			query.races = races.join(',');
		}

		const response = await pocketbase.send<ListResult<MatchExpanded>>('/api/match-history', {
			method: 'GET',
			query,
			fetch,
			signal: options?.signal
		});

		return {
			...response,
			items: response.items.map(exp) as MatchExpanded[]
		};
	}

	/** Retrieves a full list of matches. */
	async getList(options: RecordFullListOptions): Promise<MatchExpanded[]> {
		const response = await pocketbase.collection('lobbies').getFullList<Match>({
			...options,
			expand: DEFAULT_EXPAND,
			fetch
		});

		return response.map(exp) as MatchExpanded[];
	}

	async getAll(): Promise<MatchExpanded[]> {
		const response = await pocketbase.collection('lobbies').getFullList<Match>(1000, {
			expand: DEFAULT_EXPAND,
			fetch
		});

		return response.map(exp) as MatchExpanded[];
	}

	/** Retrieves a single match by its record ID. */
	async getById(id: string): Promise<MatchExpanded> {
		const record = await pocketbase.collection('lobbies').getOne<Match>(id, {
			fetch,
			expand: DEFAULT_EXPAND
		});

		return exp(record) as MatchExpanded;
	}

	/** Retrieves a single match by its game session ID. */
	async getBySessionId(sessionId: number): Promise<MatchExpanded | null> {
		const records = await pocketbase.collection('lobbies').getList<Match>(1, 1, {
			filter: `sessionId=${sessionId}`,
			expand: DEFAULT_EXPAND,
			fetch
		});

		return records.items.length > 0 ? (exp(records.items[0]) as MatchExpanded) : null;
	}

	/**
	 * Maps Relic/session ids to PocketBase lobby ids.
	 * Prefers a completed result, then a replay, then the newest record.
	 */
	async getIdsBySessionIds(sessionIds: number[]): Promise<Map<number, string>> {
		const unique = [...new Set(sessionIds.filter((id) => Number.isInteger(id) && id > 0))];
		if (unique.length === 0) {
			return new Map();
		}

		const records = await pocketbase
			.collection('lobbies')
			.getList<LobbySessionRef>(1, Math.min(500, Math.max(unique.length * 5, unique.length)), {
				filter: unique.map((id) => `sessionId=${id}`).join(' || '),
				fields: 'id,sessionId,needsResult,hasReplay',
				sort: '-createdAt',
				fetch
			});

		const bySession = new Map<number, LobbySessionRef>();
		for (const record of records.items) {
			const sessionId = Number(record.sessionId);
			if (!Number.isFinite(sessionId) || sessionId <= 0) {
				continue;
			}

			const current = bySession.get(sessionId);
			if (!current || isPreferredLobby(record, current)) {
				bySession.set(sessionId, record);
			}
		}

		return new Map([...bySession].map(([sessionId, record]) => [sessionId, record.id]));
	}

	/** Creates a match owned by the authenticated user. */
	async create(data: Omit<Create<'lobbies'>, 'user'>): Promise<MatchExpanded> {
		return await pocketbase.collection('lobbies').create(
			{
				user: pocketbase.authStore.record?.id ?? account.userId,
				...data
			},
			{
				expand: DEFAULT_EXPAND,
				fetch
			}
		);
	}

	async update(id: string, data: Update<'lobbies'>): Promise<MatchExpanded> {
		return await pocketbase.collection('lobbies').update(id, data, {
			expand: DEFAULT_EXPAND,
			fetch
		});
	}

	async delete(id: string): Promise<boolean> {
		return await pocketbase.collection('lobbies').delete(id, { fetch });
	}

	/** Whether a match with the given session ID already exists. */
	async exists(sessionId: number): Promise<boolean> {
		return pocketbase
			.collection('lobbies')
			.getFirstListItem(`sessionId=${sessionId}`, { fetch })
			.then(() => true)
			.catch(() => false);
	}

	/** Subscribes to realtime updates of a single match record. */
	subscribe(id: string, callback: (match: MatchExpanded) => void): Promise<UnsubscribeFunc> {
		return pocketbase.collection('lobbies').subscribe(
			id,
			(event) => {
				if (event.action === 'update') {
					this.getById(event.record.id)
						.then(callback)
						.catch((error) => {
							console.error('[MATCHES]: failed to fetch updated match:', error);
						});
				}
			},
			{ fetch }
		);
	}

	/** Retrieves match aggregation data (filters for the history page). */
	async getMatchAggregation(
		type: 'user' | 'community',
		userId?: string
	): Promise<
		| LobbyAggregationResponse<string, string[], AggregationPlayer[]>
		| LobbyAggregationCommunityResponse<string[], AggregationPlayer[], string[]>
	> {
		try {
			const query: Record<string, string> = {};
			if (type === 'user' && userId) {
				query.userId = userId;
			}

			const data = await pocketbase.send<{ maps: string[]; players: AggregationPlayer[] }>(
				`/api/match-filters/${type}`,
				{
					method: 'GET',
					query,
					fetch
				}
			);

			if (type === 'user') {
				return {
					id: userId ?? '',
					collectionId: '',
					collectionName: Collections.LobbyAggregation,
					user: userId ?? '',
					maps: data.maps ?? [],
					players: data.players ?? [],
					users: []
				} as LobbyAggregationResponse<string, string[], AggregationPlayer[]>;
			}

			return {
				id: '1',
				collectionId: '',
				collectionName: Collections.LobbyAggregationCommunity,
				maps: data.maps ?? [],
				players: data.players ?? [],
				users: []
			} as LobbyAggregationCommunityResponse<string[], AggregationPlayer[], string[]>;
		} catch {
			// No aggregation yet (new user / empty community): empty fallback.
			if (type === 'user') {
				return {
					id: '',
					collectionId: '',
					collectionName: Collections.LobbyAggregation,
					maps: [],
					players: [],
					users: []
				} as unknown as LobbyAggregationResponse<string, string[], AggregationPlayer[]>;
			}

			return {
				id: '',
				collectionId: '',
				collectionName: Collections.LobbyAggregationCommunity,
				maps: [],
				players: [],
				users: []
			} as unknown as LobbyAggregationCommunityResponse<string[], AggregationPlayer[], string[]>;
		}
	}
}
