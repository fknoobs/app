import { ClientResponseError } from 'pocketbase';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { apiError, fromUnknown, type ApiError } from './errors';
import type { ApiDeps } from './deps';

export function escapePocketBaseString(value: string) {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function recordId(value: unknown): string {
	if (!value) {
		return '';
	}

	if (typeof value === 'object' && 'id' in value) {
		return String((value as { id: string }).id);
	}

	return String(value);
}

export function fromClientError(error: unknown, fallback: string): ApiError {
	if (error instanceof ClientResponseError) {
		if (error.status === 401 || error.status === 403) {
			return apiError(401, 'Log in to do that.');
		}

		if (error.status === 404) {
			return apiError(404, fallback);
		}

		if (error.status === 400) {
			return apiError(400, fallback);
		}

		if (error.status > 0) {
			return apiError(error.status, fallback);
		}
	}

	return fromUnknown(error, fallback);
}

export function fromPbPromise<T>(
	promise: Promise<T>,
	fallback: string
): ResultAsync<T, ApiError> {
	return ResultAsync.fromPromise(promise, (error) => fromClientError(error, fallback));
}

export function currentUserId(deps: ApiDeps): string {
	if (deps.userId) {
		return deps.userId() ?? '';
	}

	if (!deps.pocketbase.authStore.isValid) {
		return '';
	}

	return deps.pocketbase.authStore.record?.id ?? '';
}

export function requireAuth(deps: ApiDeps): Result<string, ApiError> {
	const id = currentUserId(deps);
	if (!id) {
		return err(apiError(401, 'Log in to do that.'));
	}

	return ok(id);
}

export function pbOptions(deps: ApiDeps, extra?: Record<string, unknown>) {
	return { fetch: deps.fetch, ...extra };
}
