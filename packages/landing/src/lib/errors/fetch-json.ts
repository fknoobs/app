import { errAsync, ResultAsync } from 'neverthrow';
import { appError, type AppError } from './app-error';

const DEFAULT_TIMEOUT_MS = 8_000;

export function fetchJson<T>(
	fetchFn: typeof fetch,
	url: string,
	options: {
		fallback: string;
		onStatus?: (status: number) => AppError | undefined;
		init?: RequestInit;
		timeoutMs?: number;
	}
): ResultAsync<T, AppError> {
	const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	const signal = options.init?.signal ? AbortSignal.any([options.init.signal, timeout]) : timeout;
	return ResultAsync.fromPromise(fetchFn(url, { ...options.init, signal }), () =>
		appError(500, options.fallback)
	).andThen((response) => {
		const mapped = options.onStatus?.(response.status);
		if (mapped) {
			return errAsync(mapped);
		}

		if (!response.ok) {
			return errAsync(appError(500, options.fallback));
		}

		return ResultAsync.fromPromise(response.json() as Promise<T>, () =>
			appError(500, options.fallback)
		);
	});
}
