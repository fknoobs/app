import { fetch } from '$core/http/fetch';
import { pocketbase } from '$core/pocketbase';
import type { UsersResponse } from '$core/pocketbase/types';

export function readMetaVersion(meta: unknown): string | null {
	if (!meta || typeof meta !== 'object' || !('version' in meta)) {
		return null;
	}

	const version = (meta as { version?: unknown }).version;
	return typeof version === 'string' && version ? version : null;
}

export async function findCompanionUserBySteamId(steamId: string): Promise<UsersResponse | null> {
	const id = steamId.trim();
	if (!id || !pocketbase.authStore.isValid) {
		return null;
	}

	const escaped = id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

	try {
		const response = await pocketbase.collection('users').getList<UsersResponse>(1, 1, {
			filter: `steamIds ~ "${escaped}"`,
			fetch
		});
		return response.items[0] ?? null;
	} catch {
		return null;
	}
}
