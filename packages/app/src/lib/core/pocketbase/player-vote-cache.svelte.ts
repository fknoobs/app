import { fetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';
import type { PlayerVoteScoresResponse } from '$core/pocketbase/types';

let bySteam = $state.raw<Record<string, number>>({});
const fetched = new Set<string>();
const queued = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const CHUNK = 40;

export function likeCountForSteamId(steamId: string | undefined | null): number | null {
	if (!steamId) {
		return null;
	}

	if (!Object.prototype.hasOwnProperty.call(bySteam, steamId)) {
		return null;
	}

	return bySteam[steamId] ?? 0;
}

export function preloadPlayerLikeCounts(steamIds: string[]) {
	const missing = [...new Set(steamIds.filter(Boolean))].filter(
		(id) => !fetched.has(id) && !queued.has(id)
	);
	if (missing.length === 0) {
		return;
	}

	for (const id of missing) {
		queued.add(id);
	}

	if (flushTimer) {
		return;
	}

	flushTimer = setTimeout(() => {
		flushTimer = null;
		const ids = [...queued];
		queued.clear();
		void fetchIds(ids);
	}, 0);
}

async function fetchIds(ids: string[]) {
	try {
		const next = { ...bySteam };
		for (let i = 0; i < ids.length; i += CHUNK) {
			const chunk = ids.slice(i, i + CHUNK);
			const filter = chunk
				.map((id) => `steamId = "${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
				.join(' || ');
			const rows = await pocketbase.collection('player_vote_scores').getFullList<PlayerVoteScoresResponse>({
				filter,
				fields: 'steamId,likeCount',
				fetch
			});
			for (const id of chunk) {
				fetched.add(id);
				next[id] = 0;
			}

			for (const row of rows) {
				const steamId = String(row.steamId || '').trim();
				if (steamId) {
					next[steamId] = Number(row.likeCount) || 0;
				}
			}
		}

		bySteam = next;
	} catch (error) {
		console.error('[PLAYER]: likeCount preload failed:', error);
		for (const id of ids) {
			fetched.add(id);
		}
	}
}
