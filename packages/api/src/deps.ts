import type PocketBase from 'pocketbase';

export type ApiDeps = {
	pocketbase: PocketBase;
	fetch: typeof globalThis.fetch;
	baseUrl: string;
	/** Optional override when authStore alone is not enough (e.g. desktop account fallback). */
	userId?: () => string | undefined | null;
	/** Optional extra HTTP headers for authenticated API routes (hosts may add proxy secrets). */
	getAuthHeaders?: () => Record<string, string> | undefined | null;
};

export function normalizeBaseUrl(baseUrl: string) {
	return baseUrl.replace(/\/$/, '');
}

export function resolveAuthHeaders(
	deps: ApiDeps,
	extra?: Record<string, string>
): Record<string, string> {
	const headers: Record<string, string> = {};
	const token = deps.pocketbase.authStore.token;
	if (token) {
		headers.Authorization = token;
	}

	const fromDeps = deps.getAuthHeaders?.();
	if (fromDeps) {
		Object.assign(headers, fromDeps);
	}

	if (extra) {
		Object.assign(headers, extra);
	}

	return headers;
}

