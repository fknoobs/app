import { errAsync, ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { apiError, type ApiError } from './errors';

const DEFAULT_TIMEOUT_MS = 8_000;

export function fetchJson<T>(
	fetchFn: typeof fetch,
	url: string,
	options: {
		fallback: string;
		schema: z.ZodType<T>;
		onStatus?: (status: number) => ApiError | undefined;
		init?: RequestInit;
		timeoutMs?: number;
	}
): ResultAsync<T, ApiError> {
	const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	const signal = options.init?.signal ? AbortSignal.any([options.init.signal, timeout]) : timeout;
	return ResultAsync.fromPromise(fetchFn(url, { ...options.init, signal }), () =>
		apiError(500, options.fallback)
	).andThen((response) => {
		const mapped = options.onStatus?.(response.status);
		if (mapped) {
			return errAsync(mapped);
		}

		if (!response.ok) {
			return errAsync(apiError(500, options.fallback));
		}

		return ResultAsync.fromPromise(response.json() as Promise<unknown>, () =>
			apiError(500, options.fallback)
		).andThen((json) => {
			const parsed = options.schema.safeParse(json);
			if (!parsed.success) {
				return errAsync(apiError(500, options.fallback));
			}

			return ResultAsync.fromSafePromise(Promise.resolve(parsed.data));
		});
	});
}
