import { fetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';

export type PerformanceScope = 'user' | 'community';

export type PerformanceRecord = {
	wins: number;
	losses: number;
};

export type PerformanceMapRecord = PerformanceRecord & { map: string };
export type PerformanceFactionRecord = PerformanceRecord & { raceId: number };
export type PerformanceModeRecord = PerformanceRecord & { matchtypeId: number };

export type PerformanceRecentMatch = {
	id: string;
	sessionId: number;
	outcome: 0 | 1;
	raceId: number | null;
	matchtypeId: number | null;
};

export type PlayerPerformance = {
	matchCount: number;
	wins: number;
	losses: number;
	recentMatches: PerformanceRecentMatch[];
	byMap: PerformanceMapRecord[];
	byFaction: PerformanceFactionRecord[];
	byMode: PerformanceModeRecord[];
};

export const emptyPlayerPerformance = (): PlayerPerformance => ({
	matchCount: 0,
	wins: 0,
	losses: 0,
	recentMatches: [],
	byMap: [],
	byFaction: [],
	byMode: []
});

const CACHE_TTL_MS = 60_000;
const performanceCache = new Map<string, { at: number; value: PlayerPerformance }>();

function performanceCacheKey(options: {
	profileId: number;
	scope: PerformanceScope;
	userId?: string | null;
}) {
	return `${options.scope}:${options.userId ?? ''}:${options.profileId}`;
}

export async function getPlayerPerformance(options: {
	profileId: number;
	scope: PerformanceScope;
	userId?: string | null;
}): Promise<PlayerPerformance> {
	const key = performanceCacheKey(options);
	const hit = performanceCache.get(key);
	if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
		return hit.value;
	}

	const query: Record<string, string> = {
		profileId: String(options.profileId),
		scope: options.scope
	};

	if (options.scope === 'user' && options.userId) {
		query.userId = options.userId;
	}

	try {
		const value = await pocketbase.send<PlayerPerformance>('/api/player-performance', {
			method: 'GET',
			query,
			fetch
		});
		performanceCache.set(key, { at: Date.now(), value });
		return value;
	} catch (error) {
		console.warn('[player-performance] fetch failed:', error);
		return emptyPlayerPerformance();
	}
}
