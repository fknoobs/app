import type { ResultAsync } from 'neverthrow';
import type { ApiError } from './errors';

export async function unwrapApi<T>(result: ResultAsync<T, ApiError>): Promise<T> {
	const settled = await result;
	if (settled.isOk()) {
		return settled.value;
	}

	const error = new Error(settled.error.message) as Error & { status: number; retryAfter?: number };
	error.status = settled.error.status;
	if (settled.error.retryAfter !== undefined) {
		error.retryAfter = settled.error.retryAfter;
	}

	throw error;
}
