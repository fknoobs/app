import { fetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';
import type {
	AntiCheatCapturesResponse,
	AntiCheatCheatersResponse,
	AntiCheatReportsResponse,
	AntiCheatReportsStatusOptions
} from '$core/pocketbase/types';

export type CaptureRecord = AntiCheatCapturesResponse;

function escapeFilter(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function listCapturesBySession(sessionId: number): Promise<CaptureRecord[]> {
	if (!Number.isInteger(sessionId) || sessionId <= 0) {
		return [];
	}

	return pocketbase.collection('anti_cheat_captures').getFullList<CaptureRecord>({
		filter: `session_id = ${sessionId}`,
		sort: 'captured_at',
		expand: 'user',
		fetch
	});
}

export async function listCapturesBySteamId(
	steamId: string,
	options?: { userId?: string }
): Promise<CaptureRecord[]> {
	const escapedSteamId = steamId ? escapeFilter(steamId) : '';
	const escapedUserId = options?.userId ? escapeFilter(options.userId) : '';
	const clauses: string[] = [];
	if (escapedSteamId) {
		clauses.push(`steam_id = "${escapedSteamId}"`);
		clauses.push(`user.steamIds ?= "${escapedSteamId}"`);
	}
	if (escapedUserId) {
		clauses.push(`user = "${escapedUserId}"`);
	}
	if (clauses.length === 0) {
		return [];
	}

	try {
		return await pocketbase.collection('anti_cheat_captures').getFullList<CaptureRecord>({
			filter: clauses.join(' || '),
			sort: '-captured_at',
			fetch
		});
	} catch (error) {
		console.warn('[ANTI-CHEAT]: capture lookup by steam relation failed:', error);
		const fallback = [
			escapedSteamId ? `steam_id = "${escapedSteamId}"` : '',
			escapedUserId ? `user = "${escapedUserId}"` : ''
		].filter(Boolean);
		if (fallback.length === 0) {
			return [];
		}
		try {
			return await pocketbase.collection('anti_cheat_captures').getFullList<CaptureRecord>({
				filter: fallback.join(' || '),
				sort: '-captured_at',
				fetch
			});
		} catch (fallbackError) {
			console.error('[ANTI-CHEAT]: capture lookup failed:', fallbackError);
			return [];
		}
	}
}

export async function listCapturesForUserSession(
	userId: string,
	sessionId: number
): Promise<CaptureRecord[]> {
	if (!userId || !Number.isInteger(sessionId) || sessionId <= 0) {
		return [];
	}

	return pocketbase.collection('anti_cheat_captures').getFullList<CaptureRecord>({
		filter: `user = "${escapeFilter(userId)}" && session_id = ${sessionId}`,
		sort: 'captured_at',
		fetch
	});
}

export async function loadCheaterSteamIds(steamIds: string[]): Promise<Set<string>> {
	const unique = [...new Set(steamIds.filter(Boolean))];
	if (unique.length === 0) {
		return new Set();
	}

	const filter = unique.map((id) => `steam_id = "${escapeFilter(id)}"`).join(' || ');
	const rows = await pocketbase
		.collection('anti_cheat_cheaters')
		.getFullList<AntiCheatCheatersResponse>({
			filter,
			fields: 'id,steam_id,user',
			fetch
		});

	return new Set(rows.map((row) => row.steam_id));
}

export async function findCheaterBySteamId(
	steamId: string
): Promise<AntiCheatCheatersResponse | null> {
	if (!steamId) {
		return null;
	}

	try {
		return await pocketbase
			.collection('anti_cheat_cheaters')
			.getFirstListItem<AntiCheatCheatersResponse>(`steam_id = "${escapeFilter(steamId)}"`, {
				fetch
			});
	} catch {
		return null;
	}
}

export async function listOwnReportForMatch(
	reporterId: string,
	sessionId: number
): Promise<AntiCheatReportsResponse[]> {
	if (!reporterId || !Number.isInteger(sessionId) || sessionId <= 0) {
		return [];
	}

	return pocketbase.collection('anti_cheat_reports').getFullList<AntiCheatReportsResponse>({
		filter: `reporter = "${escapeFilter(reporterId)}" && session_id = ${sessionId}`,
		fetch
	});
}

export async function createPlayerFlag(input: {
	reporter: string;
	accused: string;
	sessionId: number;
	lobbyId?: string;
	accusedSteamId?: string;
}): Promise<void> {
	await pocketbase.collection('anti_cheat_reports').create(
		{
			reporter: input.reporter,
			accused: input.accused,
			session_id: input.sessionId,
			lobby: input.lobbyId || undefined,
			accused_steam_id: input.accusedSteamId || undefined,
			status: 'pending' satisfies AntiCheatReportsStatusOptions
		},
		{ fetch }
	);
}
