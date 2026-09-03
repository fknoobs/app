import PocketBase, { ClientResponseError, type RecordModel } from 'pocketbase';
import { ok, Result, ResultAsync } from 'neverthrow';
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
