import { api, unwrapApi } from '$core/api';

let bySteam = $state.raw<Record<string, number>>({});
const fetched = new Set<string>();
const queued = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

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
		const counts = await unwrapApi(api.playerSocial.listLikeCounts(ids));
		const next = { ...bySteam };
		for (const id of ids) {
			fetched.add(id);
			next[id] = counts[id] ?? 0;
		}

		bySteam = next;
	} catch (error) {
		console.error('[PLAYER]: likeCount preload failed:', error);
		for (const id of ids) {
			fetched.add(id);
		}
	}
}
