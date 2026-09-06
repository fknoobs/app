import { ClientResponseError, type RecordModel } from 'pocketbase';
import { errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { ApiDeps } from '../deps';
import { normalizeBaseUrl } from '../deps';
import { apiError, fromUnknown, type ApiError } from '../errors';
import { fetchJson } from '../fetch-json';
import { generateUniqueId } from '../id';
import { escapePocketBaseString, pbOptions } from '../pb';
import { isStaff } from '../staff';
import { readMetaVersion } from '../companion/meta';

export type UserRole = 'admin' | 'moderator';

export type AuthUser = RecordModel & {
	email: string;
	name?: string;
	avatar?: string;
	steamIds?: string[];
	role?: UserRole;
};

export type CompanionUserDebug = {
	id: string;
	email: string;
	role?: string;
	lastLogin?: string;
	created?: string;
	updated?: string;
	appVersion: string | null;
};

export type AuthExchange = {
	token: string;
	record: AuthUser;
};

const authExchangeSchema = z.object({
	token: z.string().min(1),
	record: z.record(z.string(), z.unknown())
});

export class AuthApi {
	constructor(private deps: ApiDeps) {}

	login(email: string, password: string): ResultAsync<AuthUser, ApiError> {
		return ResultAsync.fromPromise(
			this.deps.pocketbase.collection('users').authWithPassword(email.trim(), password),
			toLoginError
		).map((auth) => auth.record as AuthUser);
	}

	register(email: string, password: string): ResultAsync<AuthUser, ApiError> {
		const trimmedEmail = email.trim();
		return ResultAsync.fromPromise(
			this.deps.pocketbase.collection('users').create(
				{
					id: generateUniqueId(),
					email: trimmedEmail,
					password,
					passwordConfirm: password
				},
				pbOptions(this.deps)
			),
			toRegisterError
		)
			.andThen(() =>
				ResultAsync.fromPromise(
					this.deps.pocketbase.collection('users').authWithPassword(trimmedEmail, password),
					toRegisterError
				)
			)
			.map((auth) => auth.record as AuthUser);
	}

	logout(): Result<void, ApiError> {
		this.deps.pocketbase.authStore.clear();
		return ok(undefined);
	}

	steamLoginStartUrl(origin: string, redirect = '/'): string {
		const params = new URLSearchParams();
		params.set('origin', origin.replace(/\/$/, ''));
		if (redirect && redirect !== '/') {
			params.set('redirect', redirect);
		}

		return `${normalizeBaseUrl(this.deps.baseUrl)}/api/auth/steam/start?${params.toString()}`;
	}

	exchangeHandoffCode(code: string): ResultAsync<AuthExchange, ApiError> {
		const trimmed = code.trim();
		if (!trimmed) {
			return errAsync(apiError(400, 'Invalid or expired login code.'));
		}

		return fetchJson(this.deps.fetch, `${normalizeBaseUrl(this.deps.baseUrl)}/api/auth/handoff/exchange`, {
			fallback: 'Invalid or expired login link.',
			schema: authExchangeSchema,
			onStatus: (status) => {
				if (status === 400 || status === 401 || status === 404) {
					return apiError(400, 'Invalid or expired login link.');
				}

				return undefined;
			},
			init: {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: trimmed })
			}
		}).map((body) => ({
			token: body.token,
			record: body.record as AuthUser
		}));
	}

	findCompanionBySteamId(steamId: string): ResultAsync<CompanionUserDebug | null, ApiError> {
		if (!isStaff(this.deps)) {
			return okAsync(null);
		}

		const id = steamId.trim();
		if (!id) {
			return okAsync(null);
		}

		const escaped = escapePocketBaseString(id);
		return ResultAsync.fromPromise(
			this.deps.pocketbase.collection('users').getList(
				1,
				1,
				pbOptions(this.deps, {
					filter: `steamIds ~ "${escaped}"`
				})
			),
			(error) => fromUnknown(error, 'Could not load that account.')
		)
			.map((list) => {
				const row = list.items[0];
				if (!row) {
					return null;
				}

				return {
					id: row.id,
					email: typeof row.email === 'string' ? row.email : '',
					role: typeof row.role === 'string' ? row.role : undefined,
					lastLogin: typeof row.lastLogin === 'string' ? row.lastLogin : undefined,
					created: typeof row.created === 'string' ? row.created : undefined,
					updated: typeof row.updated === 'string' ? row.updated : undefined,
					appVersion: readMetaVersion(row.meta)
				};
			})
			.orElse(() => ok(null));
	}
}

function toLoginError(error: unknown): ApiError {
	if (error instanceof ClientResponseError) {
		if (error.status === 400 || error.status === 404 || error.status === 401) {
			return apiError(400, 'Invalid email or password.');
		}

		if (error.status === 429) {
			return apiError(429, 'Too many attempts. Please wait a moment and try again.');
		}

		const data = error.data as { message?: string } | undefined;
		if (data?.message) {
			return apiError(400, data.message);
		}
	}

	return fromUnknown(error, 'Something went wrong. Please try again.');
}

function toRegisterError(error: unknown): ApiError {
	if (error instanceof ClientResponseError) {
		if (error.status === 429) {
			return apiError(429, 'Too many attempts. Please wait a moment and try again.');
		}

		const data = error.data as { message?: string } | undefined;
		if (data?.message) {
			return apiError(400, data.message);
		}

		if (error.status === 400) {
			return apiError(400, 'Could not create that account. Check your email and password.');
		}
	}

	return fromUnknown(error, 'Something went wrong. Please try again.');
}
