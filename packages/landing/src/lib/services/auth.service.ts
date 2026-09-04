import PocketBase, { ClientResponseError, type RecordModel } from 'pocketbase';
import { ok, okAsync, Result, ResultAsync } from 'neverthrow';
import { appError, fromUnknown, type AppError } from '$lib/errors/app-error';
import { generateUniqueId } from '$lib/utils/id';

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

export class AuthService {
	constructor(private pocketbase: PocketBase) {}

	login(email: string, password: string): ResultAsync<AuthUser, AppError> {
		return ResultAsync.fromPromise(
			this.pocketbase.collection('users').authWithPassword(email.trim(), password),
			toLoginError
		).map((auth) => auth.record as AuthUser);
	}

	register(email: string, password: string): ResultAsync<AuthUser, AppError> {
		const trimmedEmail = email.trim();
		return ResultAsync.fromPromise(
			this.pocketbase.collection('users').create({
				id: generateUniqueId(),
				email: trimmedEmail,
				password,
				passwordConfirm: password
			}),
			toRegisterError
		)
			.andThen(() =>
				ResultAsync.fromPromise(
					this.pocketbase.collection('users').authWithPassword(trimmedEmail, password),
					toRegisterError
				)
			)
			.map((auth) => auth.record as AuthUser);
	}

	logout(): Result<void, AppError> {
		this.pocketbase.authStore.clear();
		return ok(undefined);
	}

	findCompanionBySteamId(steamId: string): ResultAsync<CompanionUserDebug | null, AppError> {
		if (!this.isStaff()) {
			return okAsync(null);
		}

		const id = steamId.trim();
		if (!id) {
			return okAsync(null);
		}

		const escaped = id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
		return ResultAsync.fromPromise(
			this.pocketbase.collection('users').getList(1, 1, {
				filter: `steamIds ~ "${escaped}"`
			}),
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

	private isStaff(): boolean {
		if (!this.pocketbase.authStore.isValid) {
			return false;
		}

		const role = this.pocketbase.authStore.record?.role;
		return role === 'admin' || role === 'moderator';
	}
}

function readMetaVersion(meta: unknown): string | null {
	if (!meta || typeof meta !== 'object' || !('version' in meta)) {
		return null;
	}

	const version = (meta as { version?: unknown }).version;
	return typeof version === 'string' && version ? version : null;
}

function toLoginError(error: unknown): AppError {
	if (error instanceof ClientResponseError) {
		if (error.status === 400 || error.status === 404 || error.status === 401) {
			return appError(400, 'Invalid email or password.');
		}

		if (error.status === 429) {
			return appError(429, 'Too many attempts. Please wait a moment and try again.');
		}

		const data = error.data as { message?: string } | undefined;
		if (data?.message) {
			return appError(400, data.message);
		}
	}

	return fromUnknown(error, 'Something went wrong. Please try again.');
}

function toRegisterError(error: unknown): AppError {
	if (error instanceof ClientResponseError) {
		if (error.status === 429) {
			return appError(429, 'Too many attempts. Please wait a moment and try again.');
		}

		const data = error.data as { message?: string } | undefined;
		if (data?.message) {
			return appError(400, data.message);
		}

		if (error.status === 400) {
			return appError(400, 'Could not create that account. Check your email and password.');
		}
	}

	return fromUnknown(error, 'Something went wrong. Please try again.');
}
