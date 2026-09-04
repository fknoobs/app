import { api, unwrapApi } from '$core/api';
import {
	emptyPlayerPerformance,
	invalidatePlayerPerformanceCache,
	type PerformanceScope,
	type PlayerPerformance,
	type PerformanceRecord,
	type PerformanceMapRecord,
	type PerformanceFactionRecord,
	type PerformanceModeRecord,
	type PerformanceRecentMatch
} from '@company-of-heroes/api/player-performance';

export type {
	PerformanceScope,
	PlayerPerformance,
	PerformanceRecord,
	PerformanceMapRecord,
	PerformanceFactionRecord,
	PerformanceModeRecord,
	PerformanceRecentMatch
};

export { emptyPlayerPerformance, invalidatePlayerPerformanceCache };

export async function getPlayerPerformance(options: {
	profileId: number;
	scope: PerformanceScope;
	userId?: string | null;
	fresh?: boolean;
}): Promise<PlayerPerformance> {
	return unwrapApi(api.playerPerformance.getPlayerPerformance(options));
}
