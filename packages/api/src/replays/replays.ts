import type { ListResult, RecordModel } from 'pocketbase';
import { errAsync, ok, okAsync, ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type {
	HistoryMapOption,
	HistoryMatchup,
	ReplaysQuery
} from '@company-of-heroes/ui/replay/types';
import type { LiveLobbyPlayer } from '@company-of-heroes/ui/live-lobby/types';
import { normalizeBaseUrl, resolveAuthHeaders, type ApiDeps } from '../deps';
import { apiError, type ApiError } from '../errors';
import { fetchJson } from '../fetch-json';
import { currentUserId, fromPbPromise, pbOptions } from '../pb';

export type {
	HistoryMapOption,
	HistoryMatchup,
	ReplaysQuery
} from '@company-of-heroes/ui/replay/types';

export const REPLAYS_PER_PAGE = 30;

export const HISTORY_MATCHUP_TYPES: Record<HistoryMatchup, readonly number[]> = {
	'1v1': [1],
	'2v2': [2, 5],
	'3v3': [3, 6],
	'4v4': [4, 7]
};

export type CommunityPlayer = {
	playerId: number | null;
	steamId: string | null;
	race: number | null;
	likeCount?: number;
	profile: {
		profile_id: number;
		alias: string;
	};
};

export type MatchResultPlayer = {
	profile_id: number;
	alias?: string;
	steamId?: string;
	name?: string;
	teamid?: number;
	race_id?: number;
	wins?: number;
	losses?: number;
	streak?: number;
	outcome?: number;
	oldrating?: number;
	newrating?: number;
	country?: string;
};

export type MatchResult = {
	description?: string;
	matchtype_id?: number;
	startgametime?: number;
	completiontime?: number;
	players?: MatchResultPlayer[];
} | null;

export type CommunityMatch = {
	id: string;
	map: string;
	title: string;
	result: MatchResult;
	createdAt: string;
	isRanked: boolean;
	hasReplay: boolean;
	likeCount: number;
	downloadCount: number;
	commentCount: number;
	players: CommunityPlayer[];
};

export type CommunityMatchList = {
	page: number;
	perPage: number;
	totalItems: number;
	totalPages: number;
	items: CommunityMatch[];
};

export type CommunityMatchSubmittedBy = {
	alias: string;
	profileId: number;
	steamId?: string | null;
};

export type CommunityMatchDetail = {
	id: string;
	map: string;
	title: string;
	isRanked: boolean;
	createdAt: string;
	durationSeconds: number | null;
	likeCount: number;
	downloadCount: number;
	replay: string;
	hasReplay?: boolean;
	needsResult?: boolean;
	sessionId?: number;
	hidden?: boolean;
	hiddenByKeyword?: boolean;
	submittedBy?: CommunityMatchSubmittedBy | null;
	updatedAt?: string;
	owner?: string | null;
	players: CommunityPlayer[];
	livePlayers?: LiveLobbyPlayer[] | null;
	result: MatchResult;
};

export type ReplayCatalogRecord = RecordModel & {
	title?: string;
	filename?: string;
	file?: string;
	mapName?: string;
	mapFilename?: string;
	createdBy?: string;
};

export function matchtypesForMatchups(matchups: string[]): number[] {
	const ids = new Set<number>();
	for (const matchup of matchups) {
		const types = HISTORY_MATCHUP_TYPES[matchup as HistoryMatchup];
		if (!types) {
			continue;
		}

		for (const id of types) {
			ids.add(id);
		}
	}

	return [...ids];
}

/** CoH slots are team-interleaved; UI position N maps to both teams. Stored slots are 1-based. */
export function slotsForPositions(positions: string[]): number[] {
	const slots = new Set<number>();
	for (const value of positions) {
		const position = Number(value);
		if (!Number.isInteger(position) || position < 1 || position > 4) {
			continue;
		}

		slots.add((position - 1) * 2 + 1);
		slots.add((position - 1) * 2 + 2);
	}

	return [...slots];
}

export function buildMatchHistoryUrl(
	baseUrl: string,
	query: ReplaysQuery,
	perPage = REPLAYS_PER_PAGE
): string {
	const params = new URLSearchParams({
		scope: 'community',
		page: String(query.page),
		perPage: String(perPage)
	});
	if (query.ranked) {
		params.set('ranked', 'true');
	}

	if (query.pro) {
		params.set('pro', 'true');
	}

	const matchtypes = matchtypesForMatchups(query.matchups);
	if (matchtypes.length > 0) {
		params.set('matchtypes', matchtypes.join(','));
	}

	if (query.playerIds.length > 0) {
		params.set('playerIds', query.playerIds.join(','));
	}

	if (query.maps.length > 0) {
		params.set('maps', query.maps.join(','));
	}

	if (query.races.length > 0) {
		params.set('races', query.races.join(','));
	}

	const slots = slotsForPositions(query.positions);
	if (slots.length > 0) {
		params.set('slots', slots.join(','));
	}

	if (query.elo) {
		params.set('eloOp', query.elo.op);
		params.set('elo', String(query.elo.value));
	}

	if (query.duration) {
		params.set('durationOp', query.duration.op);
		params.set('duration', String(query.duration.value * 60));
	}

	if (query.sort !== 'createdAt') {
		params.set('sort', query.sort);
		params.set('sortDir', query.sortDir);
	} else if (query.sortDir === 'asc') {
		params.set('sort', 'createdAt');
		params.set('sortDir', 'asc');
	}

	return `${normalizeBaseUrl(baseUrl)}/api/match-history?${params.toString()}`;
}

export function matchFileUrl(
	baseUrl: string,
	match: Pick<CommunityMatchDetail, 'id' | 'replay'>
): string | null {
	if (!match.replay) {
		return null;
	}

	return `${normalizeBaseUrl(baseUrl)}/api/files/lobbies/${match.id}/${encodeURIComponent(match.replay)}`;
}

const communityMatchListSchema: z.ZodType<CommunityMatchList> = z
	.object({
		page: z.number(),
		perPage: z.number(),
		totalItems: z.number(),
		totalPages: z.number(),
		items: z.array(z.any())
	})
	.passthrough() as z.ZodType<CommunityMatchList>;

const communityMatchDetailSchema: z.ZodType<CommunityMatchDetail> = z
	.object({
		id: z.string(),
		map: z.string(),
		title: z.string().optional().default(''),
		isRanked: z.boolean(),
		createdAt: z.string(),
		durationSeconds: z.number().nullable().optional().default(null),
		likeCount: z.number().optional().default(0),
		downloadCount: z.number().optional().default(0),
		replay: z.string().optional().default(''),
		hasReplay: z.boolean().optional(),
		needsResult: z.boolean().optional(),
		sessionId: z.number().optional(),
		hidden: z.boolean().optional(),
		hiddenByKeyword: z.boolean().optional(),
		submittedBy: z.any().optional().nullable(),
		updatedAt: z.string().optional(),
		owner: z.string().nullable().optional(),
		players: z.array(z.any()).optional().default([]),
		livePlayers: z.any().optional().nullable(),
		result: z.any().nullable().optional()
	})
	.passthrough() as z.ZodType<CommunityMatchDetail>;

const historyMapsSchema = z.object({
	items: z
		.array(
			z.object({
				map: z.string(),
				name: z.string()
			})
		)
		.optional()
});

const downloadSchema = z.object({
	counted: z.boolean().optional()
});

export type ReplayAuthOptions = {
	headers?: Record<string, string>;
};

export class ReplaysApi {
	constructor(private deps: ApiDeps) {}

	getHistory(
		query: ReplaysQuery,
		perPage?: number
	): ResultAsync<CommunityMatchList, ApiError> {
		return fetchJson(
			this.deps.fetch,
			buildMatchHistoryUrl(this.deps.baseUrl, query, perPage),
			{
				fallback: 'Failed to load community replays. Please try again later.',
				schema: communityMatchListSchema
			}
		);
	}

	getMaps(): ResultAsync<HistoryMapOption[], ApiError> {
		return fetchJson(
			this.deps.fetch,
			`${normalizeBaseUrl(this.deps.baseUrl)}/api/history-maps?scope=community&limit=100`,
			{
				fallback: 'Failed to load maps.',
				schema: historyMapsSchema
			}
		)
			.map((data) => data.items ?? [])
			.orElse(() => ok([] as HistoryMapOption[]));
	}

	get(id: string, options?: ReplayAuthOptions): ResultAsync<CommunityMatchDetail, ApiError> {
		return fetchJson(
			this.deps.fetch,
			`${normalizeBaseUrl(this.deps.baseUrl)}/api/match/${encodeURIComponent(id)}`,
			{
				fallback: 'Failed to load this replay. Please try again later.',
				schema: communityMatchDetailSchema,
				init: {
					headers: resolveAuthHeaders(this.deps, options?.headers)
				},
				onStatus: (status) => {
					if (status === 404) {
						return apiError(404, 'That replay is not available.');
					}
				}
			}
		).andThen((match) => {
			const hasReplay = match.hasReplay ?? Boolean(match.replay);
			const inProgress = match.needsResult === true;
			if (!hasReplay && !inProgress) {
				return errAsync(apiError(404, 'That replay is not available.'));
			}

			return ok({
				...match,
				hasReplay,
				needsResult: inProgress
			});
		});
	}

	download(
		id: string,
		options?: ReplayAuthOptions & { visitorId?: string; clientIp?: string }
	): ResultAsync<{ counted: boolean }, ApiError> {
		const headers = resolveAuthHeaders(this.deps, {
			'Content-Type': 'application/json',
			...(options?.visitorId ? { 'X-Download-Visitor': options.visitorId } : {}),
			...(options?.clientIp ? { 'X-Client-IP': options.clientIp } : {}),
			...options?.headers
		});

		return fetchJson(
			this.deps.fetch,
			`${normalizeBaseUrl(this.deps.baseUrl)}/api/match/${encodeURIComponent(id)}/download`,
			{
				fallback: 'Failed to record replay download.',
				schema: downloadSchema,
				init: {
					method: 'POST',
					headers
				}
			}
		).map((data) => ({ counted: Boolean(data.counted) }));
	}

	getPaginated(
		page = 1,
		perPage = 50,
		options: { filter?: string; fields?: string[]; sort?: string } = {}
	): ResultAsync<ListResult<ReplayCatalogRecord>, ApiError> {
		const { filter = '', fields = [], sort = '-gameDate' } = options;
		return fromPbPromise(
			this.deps.pocketbase.collection('replays').getList<ReplayCatalogRecord>(page, perPage, pbOptions(this.deps, {
				filter,
				fields: fields.length > 0 ? fields.join(',') : undefined,
				sort,
				expand: 'createdBy'
			})),
			'Failed to load replays.'
		);
	}

	getById(id: string): ResultAsync<ReplayCatalogRecord, ApiError> {
		return fromPbPromise(
			this.deps.pocketbase.collection('replays').getOne<ReplayCatalogRecord>(id, pbOptions(this.deps)),
			'Failed to load replay.'
		);
	}

	getExistingFilenamesByUser(): ResultAsync<string[], ApiError> {
		const userId = currentUserId(this.deps);
		if (!userId) {
			return okAsync([]);
		}

		return fromPbPromise(
			this.deps.pocketbase.collection('replays').getFullList(
				pbOptions(this.deps, {
					filter: `createdBy = "${userId}"`,
					fields: 'filename',
					requestKey: null
				})
			),
			'Failed to load replays.'
		).map((records) => records.map((record) => String(record.filename ?? '')).filter(Boolean));
	}
}
