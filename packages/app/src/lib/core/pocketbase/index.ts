import type { TypedPocketBase } from './types';
import type { Expand } from '@fknoobs/app';
import Pocketbase, { type FileOptions } from 'pocketbase';
import { camelCase } from 'lodash-es';
import { fetch as appFetch } from '$core/http/fetch';
import { PUBLIC_PB_URL } from '$env/static/public';
import type { UserContext } from '$lib/components/user';

export const pocketbase = new Pocketbase(
	PUBLIC_PB_URL ?? 'https://api.coh1stats.com'
) as TypedPocketBase;
pocketbase.autoCancellation(false);

pocketbase.beforeSend = async (url, options) => ({
	url,
	options: { ...options, fetch: options.fetch ?? appFetch }
});

/**
 * Replaces reference arrays with their expanded objects from PocketBase expand property
 * and converts snake_case keys to camelCase
 *
 * @param obj - The PocketBase object with expand property
 * @returns A new object with expanded data replacing reference arrays and camelCase keys
 */
export function exp<T extends Record<string, any>>(obj: T): Expand<T> {
	if (obj === null || typeof obj !== 'object') {
		return obj as Expand<T>;
	}

	const { expand, ...result } = obj;
	const resultObj: Record<string, any> = { ...result };

	if (!expand || typeof expand !== 'object') {
		return resultObj as Expand<T>;
	}

	for (const [key, expandedValue] of Object.entries(expand)) {
		if (expandedValue !== null && expandedValue !== undefined) {
			const camelKey = camelCase(key);

			if (Array.isArray(expandedValue)) {
				resultObj[camelKey] = expandedValue.map((item) => exp(item));
			} else if (typeof expandedValue === 'object') {
				resultObj[camelKey] = exp(expandedValue);
			} else {
				resultObj[camelKey] = expandedValue;
			}
		}
	}

	for (const [key, value] of Object.entries(resultObj)) {
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			resultObj[key] = exp(value);
		} else if (Array.isArray(value)) {
			resultObj[key] = value.map((item) =>
				typeof item === 'object' && item !== null ? exp(item) : item
			);
		}
	}

	return resultObj as Expand<T>;
}

let fileTokenCache: { token: string; fetchedAt: number } | null = null;
const FILE_TOKEN_TTL_MS = 90 * 60 * 1000;

export async function getFileAccessToken() {
	const now = Date.now();
	if (fileTokenCache && now - fileTokenCache.fetchedAt < FILE_TOKEN_TTL_MS) {
		return fileTokenCache.token;
	}
	const token = await pocketbase.files.getToken({ fetch: appFetch });
	fileTokenCache = { token, fetchedAt: now };
	return token;
}

export const getFile = async (
	record: Record<string, unknown>,
	filename: string,
	queryParams?: FileOptions
) => {
	const params: FileOptions = { ...queryParams };
	if (!params.token) {
		try {
			params.token = await getFileAccessToken();
		} catch {
			// public files still work without a file token
		}
	}
	const response = await appFetch(pocketbase.files.getURL(record, filename, params));
	if (!response.ok) {
		throw new Error(`Failed to download file (${response.status})`);
	}
	return new Uint8Array(await response.arrayBuffer());
};

export const getFileUrl = (
	record: Record<string, unknown> | UserContext,
	filename: string,
	queryParams?: FileOptions
) => {
	return pocketbase.files.getURL(record, filename, queryParams);
};
