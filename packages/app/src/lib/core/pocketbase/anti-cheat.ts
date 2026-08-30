import { fetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';
import type {
	AntiCheatCapturesResponse,
	AntiCheatCheatersResponse,
	AntiCheatReportsResponse,
	AntiCheatReportsStatusOptions
} from '$core/pocketbase/types';
import { ClientResponseError } from 'pocketbase';

export type CaptureRecord = AntiCheatCapturesResponse;

function escapeFilter(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function captureOwnerClauses(steamId: string, userId?: string): string[] {
	const escapedSteamId = steamId ? escapeFilter(steamId) : '';
	const escapedUserId = userId ? escapeFilter(userId) : '';
	const clauses: string[] = [];
	if (escapedSteamId) {
		clauses.push(`steam_id = "${escapedSteamId}"`);
		clauses.push(`user.steamIds ?= "${escapedSteamId}"`);
	}
	if (escapedUserId) {
		clauses.push(`user = "${escapedUserId}"`);
	}
	return clauses;
}

function captureOwnerFallbackClauses(steamId: string, userId?: string): string[] {
	const escapedSteamId = steamId ? escapeFilter(steamId) : '';
	const escapedUserId = userId ? escapeFilter(userId) : '';
	return [
		escapedSteamId ? `steam_id = "${escapedSteamId}"` : '',
		escapedUserId ? `user = "${escapedUserId}"` : ''
	].filter(Boolean);
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

export type CaptureSessionHint = {
	session_id?: number;
	map?: string;
	captured_at?: string;
	created: string;
};

const SESSION_SCAN_PER_PAGE = 80;

/** One page of capture rows used to discover distinct match session ids. */
export async function listCaptureSessionHints(
	steamId: string,
	page: number,
	options?: { userId?: string; perPage?: number }
): Promise<{ items: CaptureSessionHint[]; totalPages: number }> {
	const perPage = options?.perPage ?? SESSION_SCAN_PER_PAGE;
	const query = async (filter: string) =>
		pocketbase.collection('anti_cheat_captures').getList<CaptureSessionHint>(page, perPage, {
			filter,
			sort: '-captured_at',
			fields: 'id,session_id,map,captured_at,created',
			fetch
		});

	const filter = captureOwnerClauses(steamId, options?.userId).join(' || ');
	if (!filter) {
		return { items: [], totalPages: 0 };
	}

	try {
		const response = await query(filter);
		return { items: response.items, totalPages: response.totalPages };
	} catch (error) {
		console.warn('[ANTI-CHEAT]: session scan by steam relation failed:', error);
		const fallback = captureOwnerFallbackClauses(steamId, options?.userId).join(' || ');
		if (!fallback) {
			return { items: [], totalPages: 0 };
		}
		try {
			const response = await query(fallback);
			return { items: response.items, totalPages: response.totalPages };
		} catch (fallbackError) {
			console.error('[ANTI-CHEAT]: session scan failed:', fallbackError);
			return { items: [], totalPages: 0 };
		}
	}
}

export async function listCapturesBySessionIds(
	steamId: string,
	sessionIds: number[],
	options?: { userId?: string }
): Promise<CaptureRecord[]> {
	const unique = [...new Set(sessionIds.filter((id) => Number.isInteger(id) && id > 0))];
	if (unique.length === 0) {
		return [];
	}

	const owner = captureOwnerClauses(steamId, options?.userId).join(' || ');
	const sessions = unique.map((id) => `session_id = ${id}`).join(' || ');
	const query = async (ownerFilter: string) =>
		pocketbase.collection('anti_cheat_captures').getFullList<CaptureRecord>({
			filter: ownerFilter ? `(${ownerFilter}) && (${sessions})` : sessions,
			sort: 'captured_at',
			fetch
		});

	if (!owner) {
		return query('');
	}

	try {
		return await query(owner);
	} catch (error) {
		console.warn('[ANTI-CHEAT]: capture lookup by sessions failed:', error);
		const fallback = captureOwnerFallbackClauses(steamId, options?.userId).join(' || ');
		if (!fallback) {
			return [];
		}
		try {
			return await query(fallback);
		} catch (fallbackError) {
			console.error('[ANTI-CHEAT]: capture lookup by sessions failed:', fallbackError);
			return [];
		}
	}
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

	const matched = new Set(rows.map((row) => row.steam_id));
	const leftover = unique.filter((id) => !matched.has(id));
	if (leftover.length === 0) {
		return matched;
	}

	try {
		const related = await pocketbase
			.collection('anti_cheat_cheaters')
			.getFullList<AntiCheatCheatersResponse>({
				filter: leftover.map((id) => `user.steamIds ?= "${escapeFilter(id)}"`).join(' || '),
				fields: 'id,steam_id,user',
				fetch
			});
		if (related.length === 0) {
			return matched;
		}
		if (leftover.length === 1) {
			matched.add(leftover[0]);
			return matched;
		}
		await Promise.all(
			leftover.map(async (id) => {
				try {
					await pocketbase
						.collection('anti_cheat_cheaters')
						.getFirstListItem(`user.steamIds ?= "${escapeFilter(id)}"`, {
							fields: 'id',
							fetch
						});
					matched.add(id);
				} catch {
					// not labeled
				}
			})
		);
	} catch (error) {
		console.warn('[ANTI-CHEAT]: cheater lookup by steam relation failed:', error);
	}

	return matched;
}

export async function findCheaterBySteamId(
	steamId: string
): Promise<AntiCheatCheatersResponse | null> {
	if (!steamId) {
		return null;
	}

	const escaped = escapeFilter(steamId);
	try {
		return await pocketbase
			.collection('anti_cheat_cheaters')
			.getFirstListItem<AntiCheatCheatersResponse>(
				`steam_id = "${escaped}" || user.steamIds ?= "${escaped}"`,
				{ fetch }
			);
	} catch {
		try {
			return await pocketbase
				.collection('anti_cheat_cheaters')
				.getFirstListItem<AntiCheatCheatersResponse>(`steam_id = "${escaped}"`, {
					fetch
				});
		} catch {
			return null;
		}
	}
}

export async function labelCheaterAccounts(input: {
	userId: string;
	steamIds: string[];
	labeledBy?: string;
}): Promise<void> {
	const unique = [...new Set(input.steamIds.filter(Boolean))];
	for (const steamId of unique) {
		try {
			await pocketbase.collection('anti_cheat_cheaters').create(
				{
					user: input.userId,
					steam_id: steamId,
					labeled_by: input.labeledBy || undefined
				},
				{ fetch }
			);
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 400) {
				continue;
			}
			throw error;
		}
	}
}

export async function deleteCheaterLabelsForUser(userId: string): Promise<void> {
	if (!userId) return;
	const rows = await pocketbase
		.collection('anti_cheat_cheaters')
		.getFullList<AntiCheatCheatersResponse>({
			filter: `user = "${escapeFilter(userId)}"`,
			fields: 'id',
			fetch
		});
	await Promise.all(
		rows.map((row) => pocketbase.collection('anti_cheat_cheaters').delete(row.id, { fetch }))
	);
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
